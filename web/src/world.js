// CrazyTV – 3D-Welt: Tower, Figuren, Aufzug, Wohnzimmer.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import layout from './data/layout.json';
import glbData from '../assets/crazytv.glb';
import { drawScreen } from './tvscreen.js';

const OFFICE_SID = { office_k7: 'k7', office_trash: 'trash', office_prestige: 'prestige' };
const STATION_COL = { k7: '#19c3b1', trash: '#ff4f9a', prestige: '#f0b429', other: '#e50914' };

const L = layout;
const FH = L.floorH;
export const ROOMS = Object.fromEntries(L.rooms.map((r) => [r.id, r]));
export const roomX = (r) => (r.side === 'L' ? -1 : 1) * (L.shaftW / 2 + L.roomW / 2);
const WALK_SPEED = 3.4; // Einheiten pro Echtsekunde bei 1×
const CAB_SPEED = 5.0;

const SKY = [
  [8 * 60, new THREE.Color('#bfe6ff')],
  [12 * 60, new THREE.Color('#9fd6ff')],
  [16 * 60, new THREE.Color('#ffd3a8')],
  [18 * 60, new THREE.Color('#f59e8b')],
  [19.5 * 60, new THREE.Color('#6b4f8f')],
  [21 * 60, new THREE.Color('#2a2552')],
  [25 * 60, new THREE.Color('#141230')],
];

export class World {
  constructor(canvas, labelLayer) {
    this.canvas = canvas;
    this.labelLayer = labelLayer;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#bfe6ff');
    this.scene.fog = new THREE.Fog('#bfe6ff', 90, 180);
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.5, 400);
    this.actors = [];
    this.npcs = [];
    this.occupant = {}; // roomId -> actor
    this.mode = 'tower';
    this.view = { x: 0, y: 10, dist: 70, minDist: 18, maxDist: 110 };
    this.mods = { walk: 1, elevator: 1 };
    this.cab = { y: 0, level: 0, queue: [], job: null, phase: 'idle', t: 0 };
    this.listeners = {};
    this._initLights();
    this._initInput();
  }

  on(ev, fn) { (this.listeners[ev] ||= []).push(fn); }
  emit(ev, ...a) { (this.listeners[ev] || []).forEach((f) => f(...a)); }

  async load() {
    const buf = glbData.buffer.slice(glbData.byteOffset, glbData.byteOffset + glbData.byteLength);
    const gltf = await new Promise((res, rej) => new GLTFLoader().parse(buf, '', res, rej));
    const root = gltf.scene;
    root.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        const m = o.material;
        m.flatShading = true;
        if (m.name === 'glass') { m.transparent = true; m.opacity = 0.55; }
        m.needsUpdate = true;
      }
    });
    const get = (n) => root.getObjectByName(n);
    this.tower = get('Tower');
    this.scene.add(this.tower);
    const city = get('City');
    this.scene.add(city);
    this.cabObj = get('Cab');
    this.scene.add(this.cabObj);
    this.charTpl = get('Character');
    this.acc = { glasses: get('acc_glasses'), cap: get('acc_cap'), bun: get('acc_bun'), tie: get('acc_tie') };
    this.trophyTpl = get('Trophy');
    this.living = get('LivingRoom');
    // Stadt bekommt keine Schatten (Performance)
    city.traverse((o) => { if (o.isMesh) { o.castShadow = false; } });
    // Wände pro Raum mit eigenem Material (für Hervorhebung)
    this.walls = {};
    for (const r of L.rooms) {
      const w = this.tower.getObjectByName(`wall_${r.id}`);
      if (w) { w.material = w.material.clone(); this.walls[r.id] = w; }
    }
    this._makeSign();
    this._makeScreens(root);
    this._makeCityWindows(city);
    this._makeOnAirLamps();
    this._makeLabels();
    this._buildLivingScene();
    this.resize();
  }

  _initLights() {
    this.hemi = new THREE.HemisphereLight('#ffffff', '#b59b8a', 1.4);
    this.scene.add(this.hemi);
    const sun = new THREE.DirectionalLight('#fff4e0', 2.0);
    sun.position.set(-25, 45, 40);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const c = sun.shadow.camera;
    c.left = -26; c.right = 26; c.top = 32; c.bottom = -10; c.near = 5; c.far = 130;
    sun.target.position.set(0, 10, 0);
    sun.shadow.bias = -0.0008;
    this.scene.add(sun, sun.target);
    this.sun = sun;
  }

  _makeSign() {
    const cv = document.createElement('canvas');
    cv.width = 512; cv.height = 96;
    const g = cv.getContext('2d');
    g.fillStyle = '#20233a'; g.fillRect(0, 0, 512, 96);
    g.font = '700 64px Fredoka, "Trebuchet MS", sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#ffe36e';
    g.shadowColor = '#ffb020'; g.shadowBlur = 18;
    g.fillText('MEDIENTURM', 256, 52);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const top = (L.maxLevel + 1) * FH;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 1.1), new THREE.MeshBasicMaterial({ map: tex }));
    m.position.set(-4, top + 2.4, 0.72);
    this.scene.add(m);
  }

  // ------------------------------------------------------------ Live-Fernseher im Turm
  _makeScreens(root) {
    this.screens = {};
    root.updateMatrixWorld(true);
    this.tower.traverse((o) => {
      if (!o.isMesh || !o.name.startsWith('screen_')) return;
      const roomId = o.name.replace('screen_', '').replace(/\.\d+$/, '');
      o.geometry.computeBoundingBox();
      const bb = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld);
      const size = bb.getSize(new THREE.Vector3());
      const c = bb.getCenter(new THREE.Vector3());
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = 144;
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(size.x, size.y), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
      plane.position.set(c.x, c.y, bb.max.z + 0.004);
      this.scene.add(plane);
      o.visible = false;
      this.screens[roomId] = { canvas, g: canvas.getContext('2d'), tex, sid: OFFICE_SID[roomId] || null };
    });
    this._screenT = 0;
  }

  /** info(sid|null, roomId) -> Bildinfo; wird gedrosselt (~8 fps) aufgerufen. */
  updateScreens(info, t) {
    if (t - this._screenT < 0.12) return;
    this._screenT = t;
    for (const [roomId, sc] of Object.entries(this.screens)) {
      drawScreen(sc.g, 256, 144, info(sc.sid, roomId), t);
      sc.tex.needsUpdate = true;
    }
  }

  // ------------------------------------------------------------ Stadtfenster = Einschaltquote
  _makeCityWindows(city) {
    const mesh = city.getObjectByName('city_windows');
    this.cityWin = null;
    if (!mesh) return;
    const geo = mesh.geometry;
    const n = geo.attributes.position.count;
    const per = 24;
    const count = Math.floor(n / per);
    const colors = new Float32Array(n * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    mesh.material = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
    mesh.castShadow = false;
    // feste Zufallsreihenfolge je Fenster
    const rank = Array.from({ length: count }, (_, i) => ((Math.sin(i * 127.1 + 311.7) * 43758.5453) % 1 + 1) % 1);
    this.cityWin = { geo, colors, count, per, rank, key: '' };
  }

  /** shares: {k7, trash, prestige, other} Anteile 0..1 der Fenster (Rest dunkel) oder null (Tag). */
  setCityViewers(shares, minute) {
    const W = this.cityWin;
    if (!W) return;
    const key = shares ? Object.values(shares).map((v) => v.toFixed(2)).join() : 'day' + Math.floor(minute / 30);
    if (W.key === key) return;
    W.key = key;
    const night = Math.min(1, Math.max(0, (minute - 17 * 60) / 120));
    const day = new THREE.Color('#bfe3f2').lerp(new THREE.Color('#2b2d48'), night);
    const warm = new THREE.Color('#ffe9a8');
    const tmp = new THREE.Color();
    const order = shares ? [['k7', shares.k7], ['trash', shares.trash], ['prestige', shares.prestige], ['other', shares.other]] : [];
    for (let i = 0; i < W.count; i++) {
      const r = W.rank[i];
      tmp.copy(day);
      if (shares) {
        let acc = 0;
        for (const [sid, v] of order) {
          acc += v;
          if (r < acc) { tmp.set(STATION_COL[sid]); break; }
        }
      } else if (r < night * 0.35) tmp.copy(warm);
      for (let v = 0; v < W.per; v++) {
        const j = (i * W.per + v) * 3;
        W.colors[j] = tmp.r; W.colors[j + 1] = tmp.g; W.colors[j + 2] = tmp.b;
      }
    }
    W.geo.attributes.color.needsUpdate = true;
  }

  // ------------------------------------------------------------ ON-AIR-Lampen über den Bürofernsehern
  _makeOnAirLamps() {
    const cv = document.createElement('canvas');
    cv.width = 128; cv.height = 48;
    const g = cv.getContext('2d');
    g.fillStyle = '#b3122a'; g.fillRect(0, 0, 128, 48);
    g.fillStyle = '#fff'; g.font = '700 30px Fredoka, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('ON AIR', 64, 26);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    this.lamps = {};
    for (const [roomId, sid] of Object.entries(OFFICE_SID)) {
      const r = ROOMS[roomId];
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.34), new THREE.MeshBasicMaterial({ map: tex, color: '#444', toneMapped: false }));
      m.position.set(roomX(r) - 1.2, r.level * FH + 3.05, -L.depth / 2 + 0.25);
      this.scene.add(m);
      this.lamps[sid] = m;
    }
  }
  setOnAir(on, t = 0) {
    for (const m of Object.values(this.lamps || {})) m.material.color.set(on ? (Math.sin(t * 3) > -0.6 ? '#ffffff' : '#bbbbbb') : '#444444');
  }

  cheer(a) { a.cheerUntil = performance.now() / 1000 + 1.8; }

  _makeLabels() {
    this.labels = {};
    for (const r of L.rooms) {
      const el = document.createElement('button');
      el.className = 'room-label' + (r.closed ? ' closed' : '');
      el.type = 'button';
      el.innerHTML = `<span class="rl-name">${r.name}</span><span class="rl-occ"></span>`;
      el.addEventListener('click', (e) => { e.stopPropagation(); this.emit('roomTap', r.id); });
      this.labelLayer.appendChild(el);
      this.labels[r.id] = { el, occ: el.querySelector('.rl-occ'), pos: new THREE.Vector3(roomX(r), r.level * FH + FH - 0.75, L.depth / 2) };
    }
    this.playerMarker = document.createElement('div');
    this.playerMarker.className = 'player-marker';
    this.playerMarker.textContent = 'Du';
    this.labelLayer.appendChild(this.playerMarker);
  }

  // ------------------------------------------------------------ Figuren
  makeCharacter({ shirt = '#ffffff', hair = '#4a3428', skin = '#f1c7a3', pants = '#3b4256', acc = [] } = {}) {
    const o = this.charTpl.clone(true);
    const mats = {};
    o.traverse((m) => {
      if (!m.isMesh) return;
      const n = m.material.name;
      const color = n === 'shirt' ? shirt : n === 'hair' ? hair : n === 'skin' ? skin : n === 'pants' ? pants : null;
      if (color) {
        mats[n] ||= Object.assign(m.material.clone(), {});
        mats[n].color.set(color);
        m.material = mats[n];
      }
    });
    const head = o.getObjectByName('Head');
    for (const a of acc) {
      const t = this.acc[a].clone(true);
      if (a === 'glasses') t.position.set(0, 0.38, 0.38);
      if (a === 'cap') t.position.set(0, 0.68, 0);
      if (a === 'bun') t.position.set(0, 0.62, -0.32);
      if (a === 'tie') { t.position.set(0, 1.12, 0.21); o.add(t); continue; }
      if (a === 'bun' && mats.hair) t.traverse((m) => { if (m.isMesh) m.material = mats.hair; });
      head.add(t);
    }
    o.traverse((m) => { if (m.isMesh) { m.castShadow = true; } });
    return o;
  }

  addActor(id, look, { level, x, z = L.walkZ, isPlayer = false } = {}) {
    const obj = this.makeCharacter(look);
    this.scene.add(obj);
    const a = {
      id, obj, isPlayer, level, x, z, state: 'idle', steps: [], room: null, target: null, waitSince: 0, phase: Math.random() * 6,
      parts: { LegL: obj.getObjectByName('LegL'), LegR: obj.getObjectByName('LegR'), ArmL: obj.getObjectByName('ArmL'), ArmR: obj.getObjectByName('ArmR'), Head: obj.getObjectByName('Head') },
      facing: 0, moving: false,
    };
    this.actors.push(a);
    this._place(a);
    return a;
  }

  addNpc(roomId, look, dx = 0, dz = -0.4) {
    const r = ROOMS[roomId];
    const obj = this.makeCharacter(look);
    const back = -L.depth / 2 + 0.45;
    obj.position.set(roomX(r) + dx, r.level * FH, back + 1.0 + dz + 0.9);
    this.scene.add(obj);
    this.npcs.push({ obj, phase: Math.random() * 6, head: obj.getObjectByName('Head'), ArmR: obj.getObjectByName('ArmR') });
  }

  /** Figur in ihr Büro setzen (Tagesbeginn). */
  placeInRoom(a, roomId) {
    this._clearRoom(a);
    this._cancelElevator(a);
    const r = ROOMS[roomId];
    a.level = r.level;
    a.x = roomX(r) + (a.isPlayer ? -0.6 : 0.6);
    a.z = L.insideZ;
    a.steps = [];
    a.state = 'inRoom';
    a.room = roomId;
    a.target = null;
    this.occupant[roomId] = a;
    this._place(a);
  }

  /** Figur zu einem Raum schicken. */
  goTo(a, roomId) {
    if (a.state === 'riding' || a.state === 'boarding') { a.pendingTarget = roomId; return; }
    if (a.room === roomId && a.state === 'inRoom') return;
    this._cancelElevator(a);
    const steps = [];
    if (a.room) {
      this._leaveRoom(a);
      steps.push({ t: 'walk', z: L.walkZ });
    } else if (Math.abs(a.z - L.walkZ) > 0.05) steps.push({ t: 'walk', z: L.walkZ });
    const r = ROOMS[roomId];
    if (r.level !== a.level) {
      steps.push({ t: 'walk', x: 0 });
      steps.push({ t: 'elevator', to: r.level });
      steps.push({ t: 'walk', z: L.walkZ });
    }
    const door = roomX(r) + (r.side === 'L' ? 1.6 : -1.6);
    steps.push({ t: 'walk', x: door });
    steps.push({ t: 'enter', room: roomId });
    a.steps = steps;
    a.target = roomId;
    a.state = 'moving';
  }

  _leaveRoom(a) {
    const r = a.room;
    this._clearRoom(a);
    if (r) this.emit('leave', a, r);
  }
  _clearRoom(a) {
    if (a.room && this.occupant[a.room] === a) delete this.occupant[a.room];
    a.room = null;
  }
  _cancelElevator(a) {
    this.cab.queue = this.cab.queue.filter((j) => j.actor !== a);
  }

  _place(a) {
    const y = a.state === 'riding' || a.state === 'boarding' ? this.cab.y : a.level * FH;
    a.obj.position.set(a.x, y, a.z);
  }

  // ------------------------------------------------------------ Update
  update(realDt, simDt, ctx) {
    this.ctx = ctx;
    const t = performance.now() / 1000;
    this._updateCab(simDt);
    for (const a of this.actors) this._updateActor(a, simDt, ctx);
    for (const a of this.actors) this._animate(a, t);
    for (const n of this.npcs) {
      n.head.rotation.y = Math.sin(t * 0.7 + n.phase) * 0.35;
      n.ArmR.rotation.x = Math.sin(t * 1.3 + n.phase) * 0.25 - 0.2;
    }
    if (this.familyActors) this._animateFamily(t);
  }

  _updateActor(a, dt, ctx) {
    a.moving = false;
    if (dt <= 0) return;
    const step = a.steps[0];
    if (!step) return;
    const speed = WALK_SPEED * this.mods.walk * dt;
    if (step.t === 'walk') {
      const tx = step.x ?? a.x;
      const tz = step.z ?? a.z;
      const dx = tx - a.x;
      const dz = tz - a.z;
      const d = Math.hypot(dx, dz);
      if (d <= speed) {
        a.x = tx; a.z = tz; a.steps.shift();
      } else {
        a.x += (dx / d) * speed; a.z += (dz / d) * speed;
        a.moving = true;
        a.facing = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? Math.PI / 2 : -Math.PI / 2) : (dz > 0 ? 0 : Math.PI);
      }
      a.state = 'moving';
      this._place(a);
    } else if (step.t === 'elevator') {
      if (a.state !== 'waitElevator' && a.state !== 'boarding' && a.state !== 'riding') {
        a.state = 'waitElevator';
        this.cab.queue.push({ actor: a, from: a.level, to: step.to });
        a.facing = Math.PI; // schaut zur Tür
      }
    } else if (step.t === 'enter') {
      const occ = this.occupant[step.room];
      const locked = ctx.isLocked(step.room, a);
      if ((occ && occ !== a) || locked) {
        if (a.state !== 'waitRoom') {
          a.state = 'waitRoom';
          a.waitSince = ctx.minute;
          this.emit('roomBusy', a, step.room, occ, locked);
        }
        a.facing = 0;
        if (!a.isPlayer && ctx.minute - a.waitSince > 30) {
          a.steps = [];
          a.state = 'idle';
          this.emit('giveUp', a, step.room);
        }
        return;
      }
      // eintreten
      const r = ROOMS[step.room];
      this.occupant[step.room] = a;
      a.room = step.room;
      a.steps = [{ t: 'walk', x: roomX(r) + (a.isPlayer ? -0.6 : 0.6), z: L.insideZ }, { t: 'arrive', room: step.room }];
    } else if (step.t === 'arrive') {
      a.steps.shift();
      a.state = 'inRoom';
      a.facing = 0;
      a.target = null;
      this.emit('enter', a, step.room);
    }
  }

  _updateCab(dt) {
    const cab = this.cab;
    if (dt <= 0) { this.cabObj.position.y = cab.y; return; }
    if (!cab.job && cab.queue.length) {
      cab.job = cab.queue.shift();
      cab.phase = 'toPickup';
    }
    const job = cab.job;
    const moveTo = (lv) => {
      const ty = lv * FH;
      const d = ty - cab.y;
      const s = CAB_SPEED * this.mods.elevator * dt;
      if (Math.abs(d) <= s) { cab.y = ty; return true; }
      cab.y += Math.sign(d) * s;
      return false;
    };
    if (job) {
      const a = job.actor;
      if (cab.phase === 'toPickup') {
        if (moveTo(job.from)) { cab.phase = 'boarding'; cab.t = 0; a.state = 'boarding'; this.emit('ding'); }
      } else if (cab.phase === 'boarding') {
        cab.t += dt;
        a.x += (0 - a.x) * Math.min(1, dt * 8);
        a.z += (0.2 - a.z) * Math.min(1, dt * 8);
        a.facing = 0;
        if (cab.t > 0.35) { cab.phase = 'toDrop'; a.state = 'riding'; }
      } else if (cab.phase === 'toDrop') {
        if (moveTo(job.to)) {
          a.level = job.to;
          a.steps.shift(); // elevator-step erledigt
          a.state = 'moving';
          cab.job = null;
          cab.phase = 'idle';
          this.emit('ding');
          if (a.pendingTarget) { const t = a.pendingTarget; a.pendingTarget = null; this.goTo(a, t); }
        }
      }
      if (a.state === 'riding' || a.state === 'boarding') this._place(a);
    }
    this.cabObj.position.set(0, cab.y, 0.6);
  }

  _animate(a, t) {
    const p = a.parts;
    if (a.cheerUntil && t < a.cheerUntil && !a.moving) {
      const j = Math.abs(Math.sin(t * 9));
      a.obj.position.y = (a.state === 'riding' || a.state === 'boarding' ? this.cab.y : a.level * FH) + j * 0.35;
      a.cheered = true;
      p.ArmL.rotation.x = -2.8 + Math.sin(t * 14) * 0.3;
      p.ArmR.rotation.x = -2.8 - Math.sin(t * 14) * 0.3;
      a.obj.rotation.y += (0 - a.obj.rotation.y) * 0.3;
      return;
    }
    const target = a.facing;
    let d = target - a.obj.rotation.y;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    a.obj.rotation.y += d * 0.25;
    if (a.moving) {
      const s = Math.sin(t * 11 + a.phase);
      p.LegL.rotation.x = s * 0.6;
      p.LegR.rotation.x = -s * 0.6;
      p.ArmL.rotation.x = -s * 0.5;
      p.ArmR.rotation.x = s * 0.5;
      a.obj.position.y += Math.abs(s) * 0.08;
    } else {
      if (a.cheered) { a.cheered = false; this._place(a); }
      p.LegL.rotation.x *= 0.8; p.LegR.rotation.x *= 0.8;
      const idle = a.state === 'waitRoom' || a.state === 'waitElevator' ? Math.sin(t * 6 + a.phase) * 0.15 : 0;
      p.ArmL.rotation.x = p.ArmL.rotation.x * 0.8 + idle;
      p.ArmR.rotation.x = p.ArmR.rotation.x * 0.8 - idle;
      p.Head.rotation.y = a.state === 'inRoom' ? Math.sin(t * 0.8 + a.phase) * 0.3 : 0;
    }
  }

  // ------------------------------------------------------------ Tageszeit
  setTimeOfDay(minute) {
    let c = SKY[0][1].clone();
    for (let i = 0; i < SKY.length - 1; i++) {
      const [m0, c0] = SKY[i];
      const [m1, c1] = SKY[i + 1];
      if (minute >= m0 && minute <= m1) c = c0.clone().lerp(c1, (minute - m0) / (m1 - m0));
      else if (minute > m1) c = c1.clone();
    }
    this.scene.background.copy(c);
    this.scene.fog.color.copy(c);
    this.sun.color.set('#fff4e0').lerp(new THREE.Color('#ffb27a'), Math.min(1, Math.max(0, (minute - 14 * 60) / 240)));
    const night = Math.min(1, Math.max(0, (minute - 18 * 60) / 180));
    this.sun.intensity = 2.0 - night * 1.7;
    this.hemi.intensity = 1.4 - night * 0.75;
    this.hemi.color.set('#ffffff').lerp(new THREE.Color('#8f8cff'), night);
  }

  highlight(roomId) {
    for (const [id, w] of Object.entries(this.walls)) {
      w.material.emissive.set(id === roomId ? '#ffffff' : '#000000');
      w.material.emissiveIntensity = id === roomId ? 0.18 : 0;
    }
  }

  // ------------------------------------------------------------ Kamera & Eingabe
  resize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this._applyOffset();
    // Tower (≈23 breit, ≈34 hoch) passend einrahmen
    const vf = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const fitH = 19 / vf;
    const fitW = 12.5 / (vf * this.camera.aspect);
    this.view.fit = Math.max(fitH, fitW);
    this.view.maxDist = this.view.fit * 1.15;
    if (!this.view.touched) { this.view.dist = this.view.fit; this.view.x = 0; this.view.y = 11; }
    this._clampView();
  }

  _clampView() {
    const v = this.view;
    v.dist = THREE.MathUtils.clamp(v.dist, v.minDist, v.maxDist);
    const slack = 1 - v.dist / v.maxDist;
    v.x = THREE.MathUtils.clamp(v.x, -14 * slack - 0.01, 14 * slack + 0.01);
    v.y = THREE.MathUtils.clamp(v.y, -3, 26);
  }

  _initInput() {
    const c = this.canvas;
    const pts = new Map();
    let start = null;
    let pinch = null;
    c.addEventListener('pointerdown', (e) => {
      c.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 1) start = { x: e.clientX, y: e.clientY, vx: this.view.x, vy: this.view.y, moved: false };
      if (pts.size === 2) {
        const [p1, p2] = [...pts.values()];
        pinch = { d: Math.hypot(p1.x - p2.x, p1.y - p2.y), dist: this.view.dist };
      }
    });
    c.addEventListener('pointermove', (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.mode !== 'tower') return;
      if (pts.size === 2 && pinch) {
        const [p1, p2] = [...pts.values()];
        const d = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        this.view.dist = pinch.dist * (pinch.d / d);
        this.view.touched = true;
        if (start) start.moved = true;
        this._clampView();
      } else if (start) {
        const dx = e.clientX - start.x;
        const dy = e.clientY - start.y;
        if (Math.hypot(dx, dy) > 8) start.moved = true;
        if (start.moved) {
          const k = (2 * this.view.dist * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2))) / c.clientHeight;
          this.view.x = start.vx - dx * k;
          this.view.y = start.vy + dy * k;
          this.view.touched = true;
          this._clampView();
        }
      }
    });
    const end = (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = null;
      if (pts.size === 0 && start && !start.moved && this.mode === 'tower') this._tap(e.clientX, e.clientY);
      if (pts.size === 0) start = null;
    };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    c.addEventListener('wheel', (e) => {
      if (this.mode !== 'tower') return;
      e.preventDefault();
      this.view.dist *= 1 + Math.sign(e.deltaY) * 0.1;
      this.view.touched = true;
      this._clampView();
    }, { passive: false });
  }

  _tap(cx, cy) {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((cx - rect.left) / rect.width) * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const p = new THREE.Vector3();
    if (!ray.ray.intersectPlane(plane, p)) return;
    const level = Math.floor(p.y / FH);
    if (Math.abs(p.x) < L.shaftW / 2 || Math.abs(p.x) > L.shaftW / 2 + L.roomW) return;
    const side = p.x < 0 ? 'L' : 'R';
    const r = L.rooms.find((x) => x.level === level && x.side === side);
    if (r) this.emit('roomTap', r.id);
  }

  setPanelOffset(px) { this.panelOffset = px; this._applyOffset(); }
  _applyOffset() {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (this.panelOffset) this.camera.setViewOffset(w, h, this.panelOffset / 2, 0, w, h);
    else this.camera.clearViewOffset();
  }

  resetView() { this.view.touched = false; this.resize(); }

  // ------------------------------------------------------------ Wohnzimmer (Sendeabend)
  _buildLivingScene() {
    const s = new THREE.Scene();
    s.background = new THREE.Color('#2a2350');
    s.add(new THREE.HemisphereLight('#c9c2ff', '#3a2a40', 1.1));
    const lamp = new THREE.PointLight('#ffcf8a', 30, 14);
    lamp.position.set(3.6, 2.2, -2.2);
    s.add(lamp);
    this.tvLight = new THREE.PointLight('#7ff0ff', 25, 10);
    this.tvLight.position.set(0, 1.6, -1.8);
    s.add(this.tvLight);
    this.living.traverse((o) => { if (o.isMesh) { o.castShadow = false; } });
    s.add(this.living);
    this.tvScreen = this.living.getObjectByName('tv_screen');
    this.tvScreen.material = new THREE.MeshBasicMaterial({ color: '#3a4a5c' });
    // Familie Mittelmaß
    const fam = [
      { shirt: '#f28c38', hair: '#6b3d22', acc: ['glasses'], x: -1.0 },
      { shirt: '#8f6cf0', hair: '#2c2018', acc: ['bun'], x: 0.0, skin: '#c98d64' },
      { shirt: '#5cc98a', hair: '#e2b04a', acc: ['cap'], x: 1.0, small: true },
    ];
    this.familyActors = fam.map((f) => {
      const o = this.makeCharacter(f);
      o.position.set(f.x * 1.05, f.small ? -0.1 : -0.25, 2.3);
      if (f.small) o.scale.setScalar(0.8);
      o.getObjectByName('LegL').rotation.x = -Math.PI / 2;
      o.getObjectByName('LegR').rotation.x = -Math.PI / 2;
      o.rotation.y = Math.PI;
      s.add(o);
      return { o, base: o.position.y, phase: Math.random() * 6, head: o.getObjectByName('Head'), arms: [o.getObjectByName('ArmL'), o.getObjectByName('ArmR')] };
    });
    // Familie schaut zum TV (−z): Figuren stehen mit Gesicht zu +z, daher 180° drehen
    this.livingScene = s;
    this.livingCam = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    this.mood = 'meh';
  }

  setTv(color, mood) {
    this.tvScreen.material.color.set(color);
    this.tvLight.color.set(color);
    this.mood = mood;
  }

  _animateFamily(t) {
    for (const f of this.familyActors) {
      let bob = 0, arm = 0, head = 0;
      if (this.mood === 'good') { bob = Math.abs(Math.sin(t * 7 + f.phase)) * 0.12; arm = -1.2 + Math.sin(t * 9 + f.phase) * 0.6; }
      else if (this.mood === 'bad') { head = 0.5; arm = 0; }
      else { head = Math.sin(t * 0.6 + f.phase) * 0.2; }
      f.o.position.y = f.base + bob;
      f.arms.forEach((a, i) => (a.rotation.x = arm * (i ? 1 : 0.6)));
      f.head.rotation.x = head * 0.6;
      f.head.rotation.y = this.mood === 'bad' ? Math.sin(t * 2 + f.phase) * 0.6 : head * 0.3;
    }
  }

  // ------------------------------------------------------------ Render
  render() {
    if (this.mode === 'living') {
      const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
      this.livingCam.aspect = w / h;
      const portrait = w / h < 1;
      this.livingCam.fov = portrait ? 70 : 45;
      this.livingCam.position.set(portrait ? 0 : 2.2, 3.2, portrait ? 8.5 : 7.2);
      this.livingCam.lookAt(0, portrait ? 0.9 : 1.0, -0.8);
      this.livingCam.updateProjectionMatrix();
      this.renderer.render(this.livingScene, this.livingCam);
      return;
    }
    const v = this.view;
    this.camera.position.set(v.x, v.y + 2, v.dist);
    this.camera.lookAt(v.x, v.y, 0);
    this.renderer.render(this.scene, this.camera);
    this._updateLabels();
  }

  _updateLabels() {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    const v = new THREE.Vector3();
    const small = this.view.dist > 60 && w < 520;
    this.labelLayer.classList.toggle('compact', small);
    for (const [id, lb] of Object.entries(this.labels)) {
      v.copy(lb.pos).project(this.camera);
      const x = (v.x * 0.5 + 0.5) * w;
      const y = (-v.y * 0.5 + 0.5) * h;
      lb.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
      const occ = this.occupant[id];
      const locked = this.ctx?.isLocked(id, null);
      const key = (occ ? occ.id : '') + (locked ? 'L' : '');
      if (lb.key !== key) {
        lb.key = key;
        lb.el.style.setProperty('--occ', occ ? occ.color : 'transparent');
        lb.el.classList.toggle('occupied', !!occ || !!locked);
        lb.occ.textContent = locked && !occ ? '🎉' : occ ? (occ.isPlayer ? 'Du' : occ.short) : '';
      }
    }
    const p = this.actors.find((a) => a.isPlayer);
    if (p) {
      this.playerMarker.hidden = p.state === 'inRoom';
      v.set(p.obj.position.x, p.obj.position.y + 2.7, p.obj.position.z).project(this.camera);
      this.playerMarker.style.transform = `translate(${((v.x * 0.5 + 0.5) * w).toFixed(1)}px, ${((-v.y * 0.5 + 0.5) * h).toFixed(1)}px) translate(-50%, -100%)`;
    }
  }
}
