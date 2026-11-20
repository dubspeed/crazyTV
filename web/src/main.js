// CrazyTV – Spielschleife & Oberfläche.
import * as S from './sim.js';
import { World, ROOMS } from './world.js';
import {
  STATIONS, HOURS, GENRES, GROUPS, GIFTS, PRANKS, hourLabel, BOSS_NAME, JURY_NAME,
} from './data/content.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const MIN_PER_SEC = 600 / 165; // Tower-Phase ≈ 2:45 min bei 1×
const SAVE_KEY = 'crazytv-save-v1';

let state = null;
let world = null;
let speed = 1; // 0 = Pause
let player = null;
const ai = {}; // sid -> { actor, plan, stayUntil }
let openRoom = null;
let officeTab = 'plan';
let warned = false;
let lastFrame = performance.now();
let evening = null;
let modalOpen = false;

// ------------------------------------------------------------------ Sound (winzig, prozedural)
let actx = null;
let soundOn = true;
function beep(freqs, dur = 0.09, type = 'triangle', vol = 0.06) {
  if (!soundOn) return;
  try {
    actx ||= new (window.AudioContext || window.webkitAudioContext)();
    const t0 = actx.currentTime;
    freqs.forEach((f, i) => {
      const o = actx.createOscillator();
      const g = actx.createGain();
      o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(vol, t0 + i * dur);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + i * dur + dur * 1.8);
      o.connect(g).connect(actx.destination);
      o.start(t0 + i * dur); o.stop(t0 + i * dur + dur * 2);
    });
  } catch { /* kein Audio */ }
}
const sfx = {
  click: () => beep([660], 0.05),
  ding: () => beep([880, 1320], 0.12, 'sine', 0.05),
  cash: () => beep([988, 1319], 0.07, 'square', 0.03),
  bad: () => beep([300, 220], 0.12, 'sawtooth', 0.03),
  fanfare: () => beep([523, 659, 784, 1047], 0.12, 'triangle', 0.06),
};

// ------------------------------------------------------------------ Toasts
function toast(msg, kind = '') {
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.textContent = msg;
  $('#toasts').appendChild(el);
  while ($('#toasts').children.length > 3) $('#toasts').firstChild.remove();
  setTimeout(() => el.remove(), 3200);
}
function result(r) {
  if (!r) return;
  toast(r.msg || (r.ok ? 'Erledigt.' : 'Geht nicht.'), r.ok ? '' : 'bad');
  r.ok ? sfx.cash() : sfx.bad();
  renderHud();
  renderPanel();
}

// ------------------------------------------------------------------ Start
async function boot() {
  world = new World($('#scene'), $('#labels'));
  await world.load();
  addEventListener('resize', () => world.resize());
  world.on('roomTap', onRoomTap);
  world.on('enter', onEnter);
  world.on('leave', onLeave);
  world.on('roomBusy', onRoomBusy);
  world.on('giveUp', (a) => { if (ai[a.sid]) nextAiRoom(a.sid); });
  world.on('ding', () => { if (state?.phase === 'morning') sfx.ding(); });
  // NPCs
  world.addNpc('boss', { shirt: '#5cc98a', hair: '#c9c9c9', acc: ['glasses', 'bun'] }, 0, -0.9);
  world.addNpc('jury', { shirt: '#8f6cf0', hair: '#c0392b', acc: ['glasses'], skin: '#c98d64' }, -1.6, -0.4);
  world.addNpc('hausmeister', { shirt: '#4f8fe2', hair: '#6b6b6b', acc: ['cap'] }, 2.4, -0.2);
  world.addNpc('kiosk', { shirt: '#f28c38', hair: '#2c2018', acc: [], skin: '#8d5a3b' }, 0.5, -1.0);
  world.addNpc('market', { shirt: '#8f6cf0', hair: '#e2b04a', acc: ['glasses'] }, 2.6, -0.9);
  world.addNpc('ads', { shirt: '#ff6fa8', hair: '#2c2018', acc: ['bun'] }, 1.6, 0.2);
  world.addNpc('newsroom', { shirt: '#3b4256', hair: '#4a3428', acc: ['tie'] }, -0.8, -0.6);
  world.addNpc('lobby', { shirt: '#19c3b1', hair: '#e2b04a', acc: [] }, -1.0, -0.8);
  // Spieler & Rivalen
  player = world.addActor('k7', { shirt: STATIONS.k7.color, hair: '#4a3428', acc: ['cap'] }, { level: 1, x: -5, isPlayer: true });
  Object.assign(player, { sid: 'k7', color: STATIONS.k7.color, short: 'Du' });
  const t = world.addActor('trash', { shirt: STATIONS.trash.color, hair: '#ff9ccf', acc: ['bun', 'glasses'] }, { level: 1, x: 5 });
  Object.assign(t, { sid: 'trash', color: STATIONS.trash.color, short: 'T24' });
  const p = world.addActor('prestige', { shirt: STATIONS.prestige.color, hair: '#2c2018', acc: ['tie', 'glasses'], skin: '#c98d64' }, { level: 2, x: -5 });
  Object.assign(p, { sid: 'prestige', color: STATIONS.prestige.color, short: 'P1' });
  ai.trash = { actor: t, plan: [], stayUntil: 0 };
  ai.prestige = { actor: p, plan: [], stayUntil: 0 };

  $('#speedBtn').addEventListener('click', toggleSpeed);
  $('#menuBtn').addEventListener('click', openMenu);
  $('#ticker').addEventListener('click', () => state?.event && toast(state.event.d));
  addEventListener('keydown', (e) => {
    if (e.key === ' ' && !modalOpen && state?.phase === 'morning') { e.preventDefault(); toggleSpeed(); }
    if (e.key === 'Escape' && openRoom) leaveRoom();
  });
  renderChips();
  $('#loading').hidden = true;
  requestAnimationFrame(loop);
  showTitle();
}

function loadSave() {
  try { const s = localStorage.getItem(SAVE_KEY); return s ? S.deserialize(s) : null; } catch { return null; }
}
function writeSave() {
  try { localStorage.setItem(SAVE_KEY, S.serialize(state)); } catch { /* Speicher nicht verfügbar */ }
}
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch { /* egal */ } }

function startGame(s) {
  state = s;
  closeModal();
  beginMorning();
}

function beginMorning() {
  warned = false;
  world.mode = 'tower';
  $('#evening').hidden = true;
  $('#hud').hidden = false;
  $('#nav').hidden = false;
  $('#labels').hidden = false;
  world.mods.walk = state.event?.world?.walk || 1;
  world.mods.elevator = state.event?.world?.elevator || 1;
  world.cab.queue = []; world.cab.job = null;
  world.placeInRoom(player, 'office_k7');
  for (const sid of Object.keys(ai)) {
    world.placeInRoom(ai[sid].actor, STATIONS[sid].office);
    ai[sid].plan = S.aiDayPlan(state, sid);
    ai[sid].stayUntil = state.minute + 10 + Math.random() * 25;
  }
  speed = 1;
  updateSpeedBtn();
  openRoomPanel('office_k7');
  renderHud();
  renderChips();
  const ev = state.event;
  if (state.day === 1) toast('Du sitzt in deinem Büro. Plane den Abend – oder geh erst einkaufen!');
  else if (ev) toast(`📰 ${ev.t}`);
}

// ------------------------------------------------------------------ Hauptschleife
function loop(now) {
  const dt = Math.min(0.1, (now - lastFrame) / 1000);
  lastFrame = now;
  if (state && state.phase === 'morning' && !modalOpen) {
    const simDt = dt * speed;
    state.minute = Math.min(S.DAY_END, state.minute + simDt * MIN_PER_SEC);
    world.update(dt, simDt, ctx());
    updateAi();
    if (state.pendingNotices?.length) {
      for (const n of state.pendingNotices) {
        const who = STATIONS[n.sid].name;
        toast(n.prank === 'confetti' ? `🎉 ${who} hat dein Büro mit Konfetti geflutet! (1 Std. gesperrt)` : `📡 ${who} hat an deiner Antenne gekitzelt – Bildstörung zur Primetime!`, 'bad');
        sfx.bad();
      }
      state.pendingNotices = [];
      renderPanel();
    }
    if (!warned && state.minute >= S.DAY_END - 45) { warned = true; toast('⏰ In 45 Minuten beginnt der Sendeabend!'); }
    if (state.minute >= S.DAY_END) startEvening();
    world.setTimeOfDay(state.minute);
    renderClock();
  } else if (state && world.mode === 'tower') {
    world.update(dt, 0, ctx());
  } else if (world.mode === 'living') {
    world.update(dt, 0, ctx());
  }
  world.render();
  requestAnimationFrame(loop);
}

function ctx() {
  return {
    minute: state?.minute || 0,
    isLocked: (roomId, actor) => {
      const until = state?.roomLocks?.[roomId];
      if (!until || state.minute >= until) return false;
      return true;
    },
  };
}

// ------------------------------------------------------------------ KI-Steuerung
function updateAi() {
  for (const sid of Object.keys(ai)) {
    const A = ai[sid];
    const a = A.actor;
    const st = state.stations[sid];
    if (st.debuff.confetti && state.minute < st.debuff.confetti && a.room === STATIONS[sid].office) continue;
    if (a.state === 'inRoom' && state.minute >= A.stayUntil) nextAiRoom(sid);
    else if (a.state === 'idle' && !a.steps.length) nextAiRoom(sid);
  }
}
function nextAiRoom(sid) {
  const A = ai[sid];
  const next = A.plan.shift();
  if (!next) {
    if (A.actor.room !== STATIONS[sid].office) world.goTo(A.actor, STATIONS[sid].office);
    A.stayUntil = Infinity;
    return;
  }
  if (A.actor.room === next) { onEnter(A.actor, next); return; }
  world.goTo(A.actor, next);
}

// ------------------------------------------------------------------ Raum-Events
function onRoomTap(roomId) {
  if (!state || state.phase !== 'morning' || modalOpen) return;
  const r = ROOMS[roomId];
  sfx.click();
  if (r.closed) { toast(r.closed); return; }
  if (r.owner && r.owner !== 'k7') { toast(`Das Büro von ${STATIONS[r.owner].name}. Hier hast du nichts verloren!`); return; }
  if (player.room === roomId && player.state === 'inRoom') { openRoomPanel(roomId); return; }
  closePanel();
  world.goTo(player, roomId);
  world.highlight(roomId);
  setStatus(`Unterwegs: ${r.name} …`);
  renderChips();
}

function onEnter(actor, roomId) {
  if (actor.isPlayer) {
    world.highlight(null);
    setStatus('');
    openRoomPanel(roomId);
    renderChips();
    return;
  }
  const A = ai[actor.sid];
  if (!A) return;
  const stay = S.aiEnterRoom(state, actor.sid, roomId);
  A.stayUntil = state.minute + stay;
  renderHud();
  if (openRoom && ['market', 'ads', 'newsroom'].includes(openRoom)) renderPanel();
}

function onLeave(actor, roomId) {
  if (actor.isPlayer && openRoom === roomId) closePanel();
}

function onRoomBusy(actor, roomId, occ, locked) {
  if (!actor.isPlayer) return;
  if (locked) toast(`🎉 ${ROOMS[roomId].name}: alles voller Konfetti! Du wartest, bis aufgeräumt ist.`, 'bad');
  else toast(`${ROOMS[roomId].name} ist besetzt von ${STATIONS[occ.sid].name}. Du wartest vor der Tür …`);
  setStatus(`Wartet vor: ${ROOMS[roomId].name}`);
}

function leaveRoom() {
  closePanel();
}

function setStatus(t) { $('#status').textContent = t; }

// ------------------------------------------------------------------ HUD
function renderClock() {
  const m = Math.floor(state.minute);
  $('#clock').textContent = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  $('#clockFill').style.width = ((state.minute - S.DAY_START) / (S.DAY_END - S.DAY_START)) * 100 + '%';
}

function renderHud() {
  if (!state) return;
  const k = state.stations.k7;
  $('#dayLbl').textContent = `Tag ${state.day} / ${S.SEASON_DAYS}`;
  $('#money').textContent = S.fmtMoney(k.money);
  $('#money').style.color = k.money < 0 ? 'var(--bad)' : '';
  const order = ['k7', 'trash', 'prestige'];
  $('#imageBar').innerHTML = order.map((s) => `<i style="flex-grow:${Math.max(0.5, state.stations[s].image)};background:${STATIONS[s].color}"></i>`).join('');
  $('#imageNums').innerHTML = order.map((s) => `<span style="color:${STATIONS[s].color}"><span class="sn">${STATIONS[s].short} </span>${state.stations[s].image}</span>`).join('');
  $('#juryLbl').textContent = `· Jury ${Math.round(k.jury)}`;
  const ev = state.event;
  $('#ticker').textContent = ev ? `📰 ${ev.t} – ${ev.d}` : '';
  renderClock();
}

function toggleSpeed() {
  if (!state || state.phase !== 'morning') return;
  speed = speed === 1 ? 2 : speed === 2 ? 0 : 1;
  updateSpeedBtn();
  if (speed === 0) toast('Pause');
}
function updateSpeedBtn() {
  const b = $('#speedBtn');
  b.textContent = speed === 0 ? '⏸' : speed === 2 ? '⏩' : '▶';
  b.classList.toggle('on', speed === 0);
  b.setAttribute('aria-label', speed === 0 ? 'Pausiert – tippen zum Fortsetzen' : `Tempo ${speed}×`);
}

const NAV = [
  ['office_k7', '📺', 'Büro'], ['market', '🎞️', 'Markt'], ['ads', '💼', 'Werbung'], ['newsroom', '📰', 'News'],
  ['boss', '👩‍💼', 'Chefin'], ['jury', '🏆', 'Jury'], ['kiosk', '🍬', 'Kiosk'], ['hausmeister', '🔧', 'Kalle'],
];
function renderChips() {
  $('#chips').innerHTML = NAV.map(([id, ic, n]) => `<button class="chip${player?.target === id ? ' target' : ''}" data-room="${id}">${ic} ${n}</button>`).join('');
  $('#chips').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => onRoomTap(b.dataset.room)));
}

// ------------------------------------------------------------------ Panels
const ROOM_META = {
  office_k7: { icon: '📺', bg: 'var(--k7)', who: 'Dein Senderbüro' },
  market: { icon: '🎞️', bg: '#c7b3ff', who: 'Händlerin Mira Lizenzia' },
  ads: { icon: '💼', bg: '#ffd27f', who: 'Agenturchefin Tina Tausendkontakt' },
  newsroom: { icon: '📰', bg: '#9fc2ff', who: 'Redakteur Bernd Breaking' },
  boss: { icon: '👩‍💼', bg: '#b8e0a6', who: BOSS_NAME },
  jury: { icon: '🏆', bg: '#f5b8a8', who: JURY_NAME },
  kiosk: { icon: '🍬', bg: '#f2a65a', who: 'Kiosk-Kemal' },
  hausmeister: { icon: '🔧', bg: '#7d8fa6', who: 'Hausmeister Kalle' },
};

function openRoomPanel(roomId) {
  openRoom = roomId;
  if (roomId === 'office_k7') officeTab = officeTab || 'plan';
  $('#panel').classList.add('open');
  document.body.classList.add('panel-open');
  world.setPanelOffset(innerWidth >= 900 ? 440 : 0);
  renderPanel();
}
function closePanel() {
  openRoom = null;
  $('#panel').classList.remove('open');
  document.body.classList.remove('panel-open');
  world.setPanelOffset(0);
}

function renderPanel() {
  if (!openRoom || !state) return;
  const meta = ROOM_META[openRoom] || { icon: '🚪', bg: 'var(--line)', who: '' };
  const r = ROOMS[openRoom];
  const body = ({
    office_k7: officeBody, market: marketBody, ads: adsBody, newsroom: newsBody, boss: bossBody,
    jury: juryBody, kiosk: kioskBody, hausmeister: kalleBody,
  }[openRoom] || (() => '<p class="empty">Hier gibt es nichts zu tun.</p>'))();
  const scroll = $('#panel .p-body')?.scrollTop || 0;
  $('#panel').innerHTML = `
    <div class="p-head">
      <div class="p-avatar" style="background:${meta.bg}">${meta.icon}</div>
      <div class="p-title"><h2>${esc(r.name)}</h2><p>${esc(meta.who)}</p></div>
      <button class="p-close" id="pClose">Schließen ✕</button>
    </div>
    <div class="p-body">${body}</div>`;
  $('#panel .p-body').scrollTop = scroll;
  $('#pClose').addEventListener('click', leaveRoom);
  $('#panel').querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => act(b.dataset.act, b.dataset)));
}

function stars(n) { return '★'.repeat(n) + `<span style="opacity:.3">${'★'.repeat(5 - n)}</span>`; }
function qbar(q, color = 'var(--k7)') { return `<span class="qbar"><i style="width:${q}%;background:${color}"></i></span>`; }
function genreTag(g) { return `<span class="pill">${GENRES[g].icon} ${GENRES[g].name}</span>`; }
function kindLabel(k) { return { film: 'Film', serie: 'Serie', show: 'Show' }[k]; }
function bestHour(pid) {
  let best = 0, bh = 0;
  HOURS.forEach((h, hi) => { const e = S.estimate(state, 'k7', pid, hi).total; if (e > best) { best = e; bh = hi; } });
  return { hi: bh, e: best };
}

// --- Büro
function officeBody() {
  const tabs = [['plan', 'Programmplan'], ['archive', 'Archiv'], ['contracts', 'Verträge'], ['stats', 'Statistik']];
  let html = `<div class="tabs">${tabs.map(([id, n]) => `<button class="tab${officeTab === id ? ' on' : ''}" data-act="tab" data-tab="${id}">${n}</button>`).join('')}</div>`;
  const st = state.stations.k7;
  const confetti = st.debuff.confetti && state.minute < st.debuff.confetti;
  if (confetti) html += `<div class="bubble">🎉 Überall Konfetti! Du kannst trotzdem planen, aber niemand kommt hier rein, bis aufgeräumt ist.</div>`;
  if (officeTab === 'plan') {
    const n = st.newsBought.length;
    html += `<div class="bubble">Plane die Sendungen für heute Abend (18–01 Uhr). Die ★ zeigen, wie gut ein Programm auf die Uhrzeit passt. Nach jeder Sendung läuft ein Werbeblock.${state.trend ? '' : ''}</div>`;
    html += `<div class="card"><div class="grow"><h3>📰 20-Uhr-Nachrichten</h3><p>${n ? `${n} Meldung${n > 1 ? 'en' : ''} gekauft – stärken die Primetime.` : 'Noch keine Meldungen gekauft. Ohne Nachrichten verliert die 20-Uhr-Sendung etwas.'}</p></div><span class="pill ${n ? 'good' : 'warn'}">${n}/${S.MAX_NEWS}</span></div>`;
    HOURS.forEach((h, hi) => {
      const slot = st.schedule[hi];
      const p = slot.prog ? state.programs[slot.prog] : null;
      const prime = h >= 20 && h <= 22;
      const est = p ? S.estimate(state, 'k7', p.id, hi) : null;
      const dup = p && st.schedule.findIndex((s) => s.prog === p.id) !== hi;
      let ad = '<button class="slot-ad" data-act="pickAd" data-hi="' + hi + '">+ Werbung</button>';
      if (slot.ad) {
        const c = st.contracts.find((x) => x.id === slot.ad);
        if (c) {
          const v = est ? (c.group ? est.byGroup[c.group] : est.total) : 0;
          const ok = v >= c.minM;
          ad = `<button class="slot-ad set ${ok ? 'ok' : 'risk'}" data-act="pickAd" data-hi="${hi}">💼 ${esc(c.brand)} · ${ok ? '✓' : '⚠ zu wenig?'}</button>`;
        }
      }
      html += `<div class="slot"><div class="hr num${prime ? ' prime' : ''}">${hourLabel(h)}</div><div class="slot-body">
        <button class="slot-prog${p ? '' : ' empty-slot'}" data-act="pickProg" data-hi="${hi}">
          ${p ? `<span style="font-size:20px">${GENRES[p.g].icon}</span><span class="grow"><span class="t">${esc(p.t)}</span><span class="meta"><span class="stars">${stars(S.fitStars(state, 'k7', p.id, hi))}</span>${dup ? '<span class="pill bad">doppelt</span>' : ''}${p.fresh < 0.5 ? '<span class="pill warn">ausgelutscht</span>' : ''}</span></span><span class="est num">≈ ${S.fmtM(est.total)}</span>` : '<span class="grow">+ Sendung wählen (sonst Testbild)</span>'}
        </button>${ad}</div></div>`;
    });
  } else if (officeTab === 'archive') {
    const arc = S.archive(state, 'k7').sort((a, b) => b.q - a.q);
    html += `<p class="sec-title">${arc.length} Programme im Archiv</p>`;
    html += arc.map((p) => {
      const bh = bestHour(p.id);
      return `<div class="card"><div class="grow"><h3>${esc(p.t)}</h3><div class="meta">${genreTag(p.g)}<span>${kindLabel(p.k)}</span><span>Qualität ${qbar(p.q)}</span><span>Frische ${qbar(p.fresh * 100, p.fresh < 0.5 ? 'var(--warn)' : 'var(--good)')}</span><span>Am besten: ${hourLabel(HOURS[bh.hi])}</span></div></div></div>`;
    }).join('');
  } else if (officeTab === 'contracts') {
    html += contractList(st.contracts, false);
  } else if (officeTab === 'stats') {
    html += statsBody();
  }
  return html;
}

function contractList(list, offer) {
  if (!list.length) return `<p class="empty">${offer ? 'Keine Angebote mehr heute.' : 'Keine laufenden Werbeverträge. Die Werbeagentur ist im 3. Stock.'}</p>`;
  return list.map((c) => {
    const dl = offer ? `${c.days} Tag${c.days > 1 ? 'e' : ''} Zeit` : (c.deadlineDay === state.day ? 'Frist: heute!' : `Frist: Tag ${c.deadlineDay}`);
    const grp = c.group ? `${GROUPS[c.group].icon} ${S.fmtM(c.minM)} ${GROUPS[c.group].name}` : `${S.fmtM(c.minM)} Zuschauer`;
    return `<div class="card"><div class="grow"><h3>${esc(c.brand)}</h3><p>${esc(c.product)}</p>
      <div class="meta"><span class="pill">${offer ? c.spots : `${c.done}/${c.spots}`} Spots</span><span class="pill">min. ${grp}</span><span class="pill ${!offer && c.deadlineDay === state.day ? 'bad' : ''}">${dl}</span></div>
      <div class="meta"><span style="color:var(--good)">+${S.fmtMoney(c.reward)}</span><span style="color:var(--bad)">Strafe −${S.fmtMoney(c.penalty)}</span></div></div>
      ${offer ? `<button class="btn" data-act="acceptAd" data-id="${c.id}" ${state.stations.k7.contracts.length >= S.MAX_CONTRACTS ? 'disabled' : ''}>Annehmen</button>` : ''}</div>`;
  }).join('');
}

function statsBody() {
  const hist = state.history;
  if (!hist.length) return '<p class="empty">Nach dem ersten Sendeabend gibt es hier Statistiken.</p>';
  const max = Math.max(...hist.flatMap((h) => Object.values(h.viewers)), 1);
  const rows = hist.slice(-7);
  return `<p class="sec-title">Zuschauer pro Abend (Mio.)</p>
    <div class="hourchart" style="grid-template-columns:repeat(${rows.length},1fr)">${rows.map((h) => `<div class="col">${['k7', 'trash', 'prestige'].map((s) => `<i style="height:${(h.viewers[s] / max) * 100}%;background:${STATIONS[s].color}" title="${STATIONS[s].name}: ${S.fmtM(h.viewers[s])}"></i>`).join('')}</div>`).join('')}</div>
    <div class="hourlabels" style="grid-template-columns:repeat(${rows.length},1fr)">${rows.map((h) => `<span>Tag ${h.day}</span>`).join('')}</div>
    <div class="tbl-wrap"><table class="res-table num"><tr><th>Sender</th><th>Image</th><th>Jury</th><th>Ø Zuschauer</th></tr>
    ${['k7', 'trash', 'prestige'].map((s) => `<tr><td style="color:${STATIONS[s].color};font-weight:800">${STATIONS[s].name}</td><td>${state.stations[s].image}</td><td>${s === 'k7' ? Math.round(state.stations[s].jury) : '?'}</td><td>${S.fmtM(hist.reduce((a, h) => a + h.viewers[s], 0) / hist.length)}</td></tr>`).join('')}</table></div>`;
}

// --- Markt
function marketBody() {
  const st = state.stations.k7;
  let html = `<div class="bubble">„Frische Ware! Wer zuerst kommt, sendet zuerst. Die Konkurrenz war ${state.market.length < 8 ? '<b>schon hier</b>' : 'heute noch nicht da'}.“</div>`;
  html += `<p class="sec-title">Angebote heute</p>`;
  html += state.market.length ? state.market.map((id) => {
    const p = state.programs[id];
    const price = S.programPrice(p);
    const bh = bestHour(id);
    const trend = state.trend?.g === p.g;
    return `<div class="card"><div class="grow"><h3>${esc(p.t)}</h3><p>${esc(p.d)}</p>
      <div class="meta">${genreTag(p.g)}<span>${kindLabel(p.k)}</span><span>Qualität ${qbar(p.q)}</span>${p.hype > 0.3 ? '<span class="pill warn">🔥 Hype</span>' : ''}${GENRES[p.g].jury >= 0.7 && p.q >= 70 ? '<span class="pill good">🏆 Jury mag das</span>' : ''}${trend ? '<span class="pill good">📈 Trend</span>' : ''}</div>
      <div class="meta"><span>Ideal um ${hourLabel(HOURS[bh.hi])}: ≈ ${S.fmtM(bh.e)}</span></div></div>
      <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end"><span class="price num">${S.fmtMoney(price)}</span><button class="btn" data-act="buy" data-id="${id}" ${st.money < price ? 'disabled' : ''}>Kaufen</button></div></div>`;
  }).join('') : '<p class="empty">Ausverkauft! Morgen gibt es neue Ware.</p>';
  const arc = S.archive(state, 'k7').sort((a, b) => a.q * a.fresh - b.q * b.fresh);
  html += `<p class="sec-title">Aus deinem Archiv verkaufen</p>`;
  html += arc.map((p) => `<div class="card"><div class="grow"><h3>${esc(p.t)}</h3><div class="meta">${genreTag(p.g)}<span>Frische ${qbar(p.fresh * 100, p.fresh < 0.5 ? 'var(--warn)' : 'var(--good)')}</span></div></div><button class="btn alt" data-act="sell" data-id="${p.id}">+${S.fmtMoney(S.sellPrice(state, p.id))}</button></div>`).join('');
  return html;
}

// --- Werbung
function adsBody() {
  const st = state.stations.k7;
  let html = `<div class="bubble">„Unsere Kunden zahlen nur, wenn <b>alle Spots</b> laufen und jeweils die Mindestquote erreichen. Klappt das nicht bis zur Frist, wird’s teuer!“</div>`;
  html += `<p class="sec-title">Angebote (${st.contracts.length}/${S.MAX_CONTRACTS} Verträge belegt)</p>`;
  html += contractList(state.adOffers, true);
  html += `<p class="sec-title">Deine laufenden Verträge</p>`;
  html += contractList(st.contracts, false);
  return html;
}

// --- Newsroom
function newsBody() {
  const st = state.stations.k7;
  const t = state.trend;
  let html = `<div class="card" style="background:linear-gradient(135deg,#ff4f9a33,#19c3b133)"><div class="grow"><p>Heute im Trend</p><h3 style="font-size:20px">${t.tag}</h3><p>${t.text} <b>${GENRES[t.g].icon} ${GENRES[t.g].name}</b> bringt heute +25 % Zuschauer.</p></div></div>`;
  html += `<div class="bubble">„Gute Meldungen machen die 20-Uhr-Sendung stärker – und Kultur- und Politiknachrichten freuen die Jury.${state.event?.mod?.news ? ' <b>Heute ist Wahlabend: Nachrichten zählen doppelt!</b>' : ''}“</div>`;
  html += `<p class="sec-title">Meldungen (${st.newsBought.length}/${S.MAX_NEWS} gekauft)</p>`;
  html += state.news.length ? state.news.map((n) => `<div class="card"><div class="grow"><h3>${esc(n.t)}</h3><div class="meta"><span class="pill">${n.topic}</span><span>Relevanz ${qbar(n.q, 'var(--warn)')}</span></div></div>
    <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end"><span class="price num">${S.fmtMoney(n.price)}</span><button class="btn" data-act="news" data-id="${n.id}" ${st.newsBought.length >= S.MAX_NEWS || st.money < n.price ? 'disabled' : ''}>Kaufen</button></div></div>`).join('') : '<p class="empty">Keine Meldungen mehr übrig.</p>';
  if (st.newsBought.length) html += `<p class="sec-title">Gekauft für heute Abend</p>` + st.newsBought.map((n) => `<div class="card"><div class="grow"><h3>✅ ${esc(n.t)}</h3></div></div>`).join('');
  return html;
}

// --- Chefin
function bossBody() {
  const st = state.stations.k7;
  const b = state.boss;
  const moodTxt = b.mood >= 2 ? 'bestens gelaunt 😄' : b.mood >= 0 ? 'neutral 🙂' : b.mood === -1 ? 'angespannt 😐' : 'kurz vorm Explodieren 😠';
  const goal = b.goal && b.goal.day === state.day ? b.goal : null;
  let html = `<div class="bubble">${goal ? `„Ihr Ziel für heute: <b>${esc(goal.text)}</b> Schaffen Sie das, gibt es <b>${S.fmtMoney(goal.reward)}</b> Bonus.“` : '„Ah, Sie! Wollen Sie ein Tagesziel? Wer liefert, wird belohnt. Wer nicht liefert … nun ja.“'}</div>`;
  if (!goal) html += `<button class="btn" data-act="goal">Tagesziel annehmen</button>`;
  html += `<div class="card"><div class="grow"><h3>Laune der Chefin</h3><p>${moodTxt}. Drei verpasste Ziele mehr als erreichte – und du fliegst.</p></div><span class="pill ${b.mood < 0 ? 'bad' : 'good'}">${b.mood > 0 ? '+' : ''}${b.mood}</span></div>`;
  html += `<p class="sec-title">Kredit</p><div class="card"><div class="grow"><h3>Offen: ${S.fmtMoney(st.loan)}</h3><p>${Math.round(S.LOAN_RATE * 100)} % Zinsen pro Tag. Rahmen: ${S.fmtMoney(S.LOAN_MAX)}.</p></div>
    <div style="display:flex;flex-direction:column;gap:6px"><button class="btn" data-act="loan" ${st.loan >= S.LOAN_MAX ? 'disabled' : ''}>+${S.fmtMoney(S.LOAN_STEP)}</button><button class="btn alt" data-act="repay" ${!st.loan ? 'disabled' : ''}>Tilgen</button></div></div>`;
  html += `<div class="bubble" style="font-size:13px">Warnung: Wer drei Tage am Stück im Minus ist oder unter 5 Image-Punkte fällt, wird gefeuert.</div>`;
  return html;
}

// --- Jury
function juryBody() {
  const st = state.stations.k7;
  const rank = ['k7', 'trash', 'prestige'].sort((a, b) => state.stations[b].jury - state.stations[a].jury);
  const pos = rank.indexOf('k7');
  const leader = rank[0];
  const remark = pos === 0 ? 'Ihr Programm hat … Substanz. Weiter so!' : `Im Moment ist ${STATIONS[leader].name} mein Favorit für die Goldene Fernbedienung. Überzeugen Sie mich!`;
  let html = `<div class="bubble">„${remark}“ <br><br>Am Ende von Tag ${S.SEASON_DAYS} vergibt die Jury die <b>Goldene Fernbedienung</b>. Sie mag anspruchsvolle Sendungen (Drama, Doku, Late Night) zur Primetime 20–23 Uhr, gute Kultur- und Politiknachrichten – und kleine Aufmerksamkeiten.</div>`;
  html += `<div class="card"><div class="grow"><h3>Deine Jury-Punkte: ${Math.round(st.jury)}</h3><p>Platz ${pos + 1} von 3 ${pos === 0 ? '🥇' : pos === 1 ? '🥈' : '🥉'}</p></div></div>`;
  html += `<p class="sec-title">Geschenke überreichen</p>`;
  const counts = {};
  st.gifts.forEach((g) => (counts[g] = (counts[g] || 0) + 1));
  html += Object.keys(counts).length ? Object.entries(counts).map(([gid, n]) => {
    const g = GIFTS.find((x) => x.id === gid);
    return `<div class="card"><span style="font-size:26px">${g.icon}</span><div class="grow"><h3>${g.name} ×${n}</h3><p>+${g.jury} Jury-Punkte (weitere Geschenke am selben Tag zählen weniger)</p></div><button class="btn gold" data-act="give" data-id="${gid}">Überreichen</button></div>`;
  }).join('') : '<p class="empty">Keine Geschenke dabei. Der Kiosk ist im Erdgeschoss.</p>';
  return html;
}

// --- Kiosk
function kioskBody() {
  const st = state.stations.k7;
  let html = `<div class="bubble">„Für die Jury? Da hab ich was! Blumen gehen immer.“</div>`;
  html += GIFTS.map((g) => `<div class="card"><span style="font-size:26px">${g.icon}</span><div class="grow"><h3>${g.name}</h3><p>Bringt der Jury +${g.jury} Punkte</p></div><div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end"><span class="price num">${S.fmtMoney(g.price)}</span><button class="btn" data-act="gift" data-id="${g.id}" ${st.money < g.price ? 'disabled' : ''}>Kaufen</button></div></div>`).join('');
  if (st.gifts.length) html += `<p class="empty">In deiner Tasche: ${st.gifts.map((g) => GIFTS.find((x) => x.id === g).icon).join(' ')}</p>`;
  return html;
}

// --- Hausmeister Kalle
function kalleBody() {
  const st = state.stations.k7;
  let html = `<div class="bubble">„Na, Chef? Ich hab da so meine Methoden. Harmlos, versteht sich! Aber wenn dich jemand erwischt, ist das peinlich.“ <b>(25 % Risiko: −2 Image)</b></div>`;
  html += PRANKS.map((p) => `<div class="card"><span style="font-size:26px">${p.icon}</span><div class="grow"><h3>${p.name} · ${S.fmtMoney(p.price)}</h3><p>${p.d}</p>
    <div class="meta" style="margin-top:8px"><button class="btn pink" data-act="prank" data-id="${p.id}" data-target="trash" ${st.money < p.price ? 'disabled' : ''}>→ TRASH24</button><button class="btn gold" data-act="prank" data-id="${p.id}" data-target="prestige" ${st.money < p.price ? 'disabled' : ''}>→ Prestige One</button></div></div></div>`).join('');
  html += `<p class="sec-title">Kalles Flurfunk: Was läuft heute bei der Konkurrenz?</p>`;
  for (const sid of ['trash', 'prestige']) {
    const s = state.stations[sid];
    html += `<div class="card"><div class="grow"><h3 style="color:${STATIONS[sid].color}">${STATIONS[sid].name}</h3>${HOURS.map((h, hi) => {
      const p = s.schedule[hi].prog ? state.programs[s.schedule[hi].prog] : null;
      return `<p class="num">${hourLabel(h)} · ${p ? `${GENRES[p.g].icon} ${esc(p.t)}` : 'Testbild'}</p>`;
    }).join('')}<p style="margin-top:4px;font-style:italic">Stand: jetzt. Die planen vielleicht noch um.</p></div></div>`;
  }
  return html;
}

// ------------------------------------------------------------------ Aktionen
function act(a, d) {
  sfx.click();
  const k = 'k7';
  switch (a) {
    case 'tab': officeTab = d.tab; renderPanel(); break;
    case 'pickProg': pickProgram(+d.hi); break;
    case 'pickAd': pickAd(+d.hi); break;
    case 'buy': result(S.buyProgram(state, k, d.id)); break;
    case 'sell': result(S.sellProgram(state, k, d.id)); break;
    case 'acceptAd': result(S.acceptContract(state, k, d.id)); break;
    case 'news': result(S.buyNews(state, k, d.id)); break;
    case 'gift': result(S.buyGift(state, k, d.id)); break;
    case 'give': { const r = S.giveGift(state, k, d.id); result({ ...r, msg: `${r.msg} +${Math.round(r.gain * 10) / 10} Jury` }); break; }
    case 'prank': {
      const r = S.prank(state, k, d.id, d.target);
      result(r);
      if (r.caught) toast('Erwischt! 😳', 'bad');
      if (d.id === 'confetti' && ai[d.target]) { ai[d.target].stayUntil = Math.max(ai[d.target].stayUntil, state.minute + 60); }
      break;
    }
    case 'loan': result(S.takeLoan(state, k)); break;
    case 'repay': result(S.repayLoan(state, k)); break;
    case 'goal': S.bossGoal(state); renderPanel(); break;
  }
}

function pickProgram(hi) {
  const st = state.stations.k7;
  const arc = S.archive(state, 'k7').map((p) => ({ p, e: S.estimate(state, 'k7', p.id, hi).total })).sort((a, b) => b.e - a.e);
  const planned = (pid) => st.schedule.map((s, i) => (s.prog === pid && i !== hi ? hourLabel(HOURS[i]) : null)).filter(Boolean);
  openModal(`<div class="m-head"><h2>${hourLabel(HOURS[hi])} – was läuft?</h2><p>Sortiert nach erwarteten Zuschauern. ${state.trend ? `Trend heute: ${GENRES[state.trend.g].icon} ${GENRES[state.trend.g].name}.` : ''}</p></div>
    <div class="m-body">${arc.map(({ p, e }) => {
      const pl = planned(p.id);
      return `<button class="slot-prog" data-pick="${p.id}"><span style="font-size:20px">${GENRES[p.g].icon}</span><span class="grow"><span class="t">${esc(p.t)}</span><span class="meta"><span class="stars">${stars(S.fitStars(state, 'k7', p.id, hi))}</span><span>Frische ${qbar(p.fresh * 100, p.fresh < 0.5 ? 'var(--warn)' : 'var(--good)')}</span>${pl.length ? `<span class="pill warn">auch um ${pl.join(', ')}</span>` : ''}</span></span><span class="est num">≈ ${S.fmtM(e)}</span></button>`;
    }).join('')}</div>
    <div class="m-foot"><button class="btn alt" data-pick="">Slot leeren</button><button class="btn alt" data-close>Abbrechen</button></div>`);
  $('#modal').querySelectorAll('[data-pick]').forEach((b) => b.addEventListener('click', () => {
    st.schedule[hi].prog = b.dataset.pick || null;
    sfx.click();
    closeModal();
    renderPanel();
  }));
}

function pickAd(hi) {
  const st = state.stations.k7;
  const slot = st.schedule[hi];
  const est = slot.prog ? S.estimate(state, 'k7', slot.prog, hi) : { total: 0, byGroup: {} };
  const used = (cid) => st.schedule.filter((s, i) => s.ad === cid && i !== hi).length;
  const list = st.contracts.map((c) => {
    const v = c.group ? est.byGroup[c.group] : est.total;
    const remaining = c.spots - c.done - used(c.id);
    return { c, v, ok: v >= c.minM, remaining };
  });
  openModal(`<div class="m-head"><h2>Werbung um ${hourLabel(HOURS[hi])}</h2><p>${slot.prog ? `Erwartet: ≈ ${S.fmtM(est.total)}` : 'Kein Programm geplant – Werbung im Testbild bringt nichts.'}</p></div>
    <div class="m-body">${list.length ? list.map(({ c, v, ok, remaining }) => `<button class="slot-prog" data-ad="${c.id}" ${remaining <= 0 ? 'disabled style="opacity:.45"' : ''}><span style="font-size:20px">💼</span><span class="grow"><span class="t">${esc(c.brand)}</span><span class="meta"><span>braucht ${S.fmtM(c.minM)}${c.group ? ' ' + GROUPS[c.group].name : ''}</span><span class="pill ${ok ? 'good' : 'bad'}">${ok ? '✓ passt' : '✗ zu wenig'} (≈ ${S.fmtM(v)})</span><span>${remaining > 0 ? `${remaining} Spot${remaining > 1 ? 's' : ''} offen` : 'alle Spots verplant'}</span></span></span></button>`).join('') : '<p class="empty">Keine Verträge. Hol dir welche in der Werbeagentur (3. Stock).</p>'}</div>
    <div class="m-foot"><button class="btn alt" data-ad="">Kein Spot</button><button class="btn alt" data-close>Abbrechen</button></div>`);
  $('#modal').querySelectorAll('[data-ad]').forEach((b) => b.addEventListener('click', () => {
    if (b.disabled) return;
    slot.ad = b.dataset.ad || null;
    sfx.click();
    closeModal();
    renderPanel();
  }));
}

// ------------------------------------------------------------------ Modal
function openModal(html, { dismiss = true } = {}) {
  modalOpen = true;
  const m = $('#modal');
  m.innerHTML = `<div class="m-box">${html}</div>`;
  m.hidden = false;
  m.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', closeModal));
  m.onclick = dismiss ? (e) => { if (e.target === m) closeModal(); } : null;
}
function closeModal() {
  modalOpen = false;
  $('#modal').hidden = true;
  $('#modal').innerHTML = '';
}

function showTitle() {
  const save = loadSave();
  openModal(`<div class="title-screen"><div class="logo">Crazy<span>TV</span><em>7½</em></div>
    <p class="tagline">Du bist neue Programmchefin oder neuer Programmchef von <b>Kanal 7½</b> – dem kleinsten Sender im Medienturm. Die Streamingdienste klauen die Zuschauer, TRASH24 und Prestige One sitzen ein paar Türen weiter. Zeig’s ihnen!</p>
    <div class="howto">
      <div><b>🏢</b><span>Tippe auf einen Raum oder unten auf die Leiste – deine Figur läuft hin. Der Aufzug fährt nur eine Person zur Zeit, und besetzte Räume musst du abwarten.</span></div>
      <div><b>🎞️</b><span>Kauf Sendungen im <b>Content-Markt</b>, hol Werbeverträge in der <b>Werbeagentur</b>, Nachrichten im <b>Newsroom</b>.</span></div>
      <div><b>📺</b><span>Plane im <b>Büro</b> den Abend von 18 bis 01 Uhr. Um 18 Uhr geht’s auf Sendung!</span></div>
      <div><b>🏆</b><span>Ziel nach ${S.SEASON_DAYS} Tagen: Marktführer werden und die <b>Goldene Fernbedienung</b> der Jury gewinnen.</span></div>
    </div></div>
    <div class="m-foot" style="justify-content:center">${save && !save.over ? `<button class="btn alt" id="contBtn">Weiterspielen (Tag ${save.day})</button>` : ''}<button class="btn" id="newBtn">Neues Spiel</button></div>`, { dismiss: false });
  $('#newBtn').addEventListener('click', () => { sfx.fanfare(); clearSave(); startGame(S.newGame()); });
  $('#contBtn')?.addEventListener('click', () => { sfx.click(); startGame(save); });
}

function openMenu() {
  if (!state) return;
  const wasSpeed = speed;
  openModal(`<div class="m-head"><h2>Pause</h2><p>Tag ${state.day} von ${S.SEASON_DAYS}. Der Spielstand wird jeden Morgen automatisch gespeichert.</p></div>
    <div class="m-body">
      <button class="btn alt" id="mResume">▶ Weiterspielen</button>
      <button class="btn alt" id="mView">🎥 Ansicht zurücksetzen</button>
      <button class="btn alt" id="mSound">${soundOn ? '🔊 Sound an' : '🔇 Sound aus'}</button>
      <button class="btn alt" id="mHelp">❓ Kurzanleitung</button>
      <button class="btn pink" id="mNew">Neues Spiel starten</button>
    </div>`);
  $('#mResume').addEventListener('click', () => { closeModal(); speed = wasSpeed; });
  $('#mView').addEventListener('click', () => { world.resetView(); closeModal(); });
  $('#mSound').addEventListener('click', () => { soundOn = !soundOn; $('#mSound').textContent = soundOn ? '🔊 Sound an' : '🔇 Sound aus'; });
  $('#mHelp').addEventListener('click', () => { closeModal(); showHelp(); });
  $('#mNew').addEventListener('click', () => { clearSave(); closeModal(); showTitle(); });
}

function showHelp() {
  openModal(`<div class="m-head"><h2>So läuft’s</h2></div><div class="m-body howto" style="margin:0">
    <div><b>⏱️</b><span>Ein Tag geht von 08 bis 18 Uhr. Die Zeit läuft weiter, auch wenn du in einem Raum bist. Oben rechts: Pause und doppelte Geschwindigkeit.</span></div>
    <div><b>👥</b><span>Fünf Zielgruppen schauen zu unterschiedlichen Zeiten: Familien früh, Boomer zur Primetime, Gen Z und Nerds spät. Die Sterne im Planer zeigen, wie gut eine Sendung passt.</span></div>
    <div><b>🔁</b><span>Wiederholungen nutzen sich ab. Achte auf die Frische deiner Sendungen.</span></div>
    <div><b>📈</b><span>Der Newsroom verrät den Trend des Tages: Das passende Genre bringt +25 % Zuschauer.</span></div>
    <div><b>⭐</b><span>Wer eine Stunde klar gewinnt, nimmt dem Schlechtesten einen Image-Punkt ab. Unter 5 Punkten wirst du gefeuert.</span></div>
    <div><b>💼</b><span>Werbeverträge zahlen erst, wenn alle Spots die Mindestquote geschafft haben. Verpasste Fristen kosten Strafe.</span></div>
  </div><div class="m-foot"><button class="btn" data-close>Alles klar</button></div>`);
}

// ------------------------------------------------------------------ Sendeabend
function startEvening() {
  closePanel();
  closeModal();
  setStatus('');
  const res = S.simulateEvening(state);
  sfx.fanfare();
  evening = { res, hi: -1, timer: null, feed: [] };
  world.mode = 'living';
  $('#hud').hidden = true;
  $('#nav').hidden = true;
  $('#labels').hidden = true;
  const el = $('#evening');
  el.hidden = false;
  el.innerHTML = `<div class="ev-top"><span class="onair">ON AIR</span><span class="ev-clock num" id="evClock">18:00</span><span class="ev-watch" id="evWatch">Familie Mittelmaß macht es sich gemütlich …</span></div>
    <div class="ev-bottom"><div class="feed" id="evFeed"></div><div id="evChans"></div><div class="ev-actions"><button class="btn alt" id="evSkip">Vorspulen ⏩</button></div></div>`;
  $('#evSkip').addEventListener('click', () => { clearTimeout(evening.timer); showSummary(); });
  nextHour();
}

function nextHour() {
  const ev = evening;
  ev.hi++;
  if (ev.hi >= ev.res.hours.length) { ev.timer = setTimeout(showSummary, 1200); return; }
  const H = ev.res.hours[ev.hi];
  $('#evClock').textContent = hourLabel(H.h);
  const sids = ['k7', 'trash', 'prestige'];
  const max = Math.max(...sids.map((s) => H.per[s].viewers), H.others * 0.5, 1);
  $('#evChans').innerHTML = sids.map((s) => {
    const p = H.per[s];
    const ad = p.ad ? `<span class="ad" style="color:${p.ad.ok ? 'var(--good)' : 'var(--bad)'}">💼 ${esc(p.ad.brand)} ${p.ad.ok ? '✓' : '✗'}</span>` : '';
    return `<div class="chan${s === 'k7' ? ' me' : ''}"><span class="cn" style="color:${STATIONS[s].color}">${STATIONS[s].short}${H.winner === s ? ' 👑' : ''}</span><div style="min-width:0"><div class="ct">${p.genre ? GENRES[p.genre].icon : '📺'} ${esc(p.title)} ${ad}</div><div class="cb"><i style="width:${(p.viewers / max) * 100}%;background:${STATIONS[s].color}"></i></div></div><span class="cv num">${S.fmtM(p.viewers)}</span></div>`;
  }).join('');
  // Familie schaut den Sender mit den meisten Familien-Zuschauern – oder streamt
  const famBest = sids.slice().sort((a, b) => H.per[b].byGroup.fam - H.per[a].byGroup.fam)[0];
  const famTotal = sids.reduce((a, s) => a + H.per[s].byGroup.fam, 0);
  const streaming = famTotal < 0.7;
  const myShare = H.per.k7.viewers / Math.max(0.01, sids.reduce((a, s) => a + H.per[s].viewers, 0));
  const mood = streaming ? 'bad' : famBest === 'k7' ? 'good' : myShare > 0.3 ? 'meh' : 'bad';
  world.setTv(streaming ? '#e50914' : STATIONS[famBest].color, mood);
  $('#evWatch').textContent = streaming ? 'Familie Mittelmaß ist zu NETFLUX abgewandert …' : `Familie Mittelmaß schaut: ${STATIONS[famBest].name} – „${H.per[famBest].title}“`;
  // Kommentare
  const feed = $('#evFeed');
  for (const s of [sids[ev.hi % 3], 'k7']) {
    const d = document.createElement('div');
    d.innerHTML = `<small>@zuschauer${Math.floor(Math.random() * 900 + 100)}</small>${esc(S.comment(state, H, s))}`;
    feed.prepend(d);
  }
  while (feed.children.length > 2) feed.lastChild.remove();
  if (H.winner === 'k7') sfx.cash();
  ev.timer = setTimeout(nextHour, 2800);
}

function showSummary() {
  const res = evening.res;
  evening = null;
  const k = res.summary.k7;
  const sids = ['k7', 'trash', 'prestige'];
  const maxV = Math.max(...res.hours.flatMap((h) => sids.map((s) => h.per[s].viewers)), 1);
  const imgDelta = k.imageAfter - k.imageBefore;
  const juryD = Math.round(k.juryGain * 10) / 10;
  const other = k.moneyAfter - k.moneyBefore - (k.adIncome + k.baseIncome - k.penalties - k.costs) + (res.bossResult?.ok ? res.bossResult.goal.reward : 0);
  let boss = '';
  if (res.bossResult) boss = `<div class="card"><span style="font-size:24px">👩‍💼</span><div class="grow"><h3>${res.bossResult.ok ? 'Ziel erreicht!' : 'Ziel verpasst.'}</h3><p>${esc(res.bossResult.goal.text)}${res.bossResult.ok ? ` +${S.fmtMoney(res.bossResult.goal.reward)}` : ' Die Chefin ist enttäuscht.'}</p></div></div>`;
  openModal(`<div class="m-head"><h2>Bilanz – Tag ${res.day}</h2></div>
    <div class="m-body">
      <div class="headline"><small>MEDIEN-MORGENPOST</small>${esc(res.headline)}</div>
      <div class="hourchart">${res.hours.map((h) => `<div class="col">${sids.map((s) => `<i style="height:${(h.per[s].viewers / maxV) * 100}%;background:${STATIONS[s].color}"></i>`).join('')}</div>`).join('')}</div>
      <div class="hourlabels num">${res.hours.map((h) => `<span>${hourLabel(h.h).slice(0, 2)}</span>`).join('')}</div>
      <div class="tbl-wrap"><table class="res-table num"><tr><th>Sender</th><th>Zuschauer</th><th>Stunden 👑</th><th>Image</th></tr>
      ${sids.map((s) => { const x = res.summary[s]; const d = x.imageAfter - x.imageBefore; return `<tr><td style="color:${STATIONS[s].color};font-weight:800">${STATIONS[s].name}</td><td>${S.fmtM(x.viewers)}</td><td>${x.hoursWon}</td><td>${x.imageAfter} <span style="color:${d >= 0 ? 'var(--good)' : 'var(--bad)'}">(${d >= 0 ? '+' : ''}${d})</span></td></tr>`; }).join('')}</table></div>
      <p class="sec-title">Deine Kasse</p>
      <div class="money-lines num">
        <span>Allgemeine Werbeerlöse</span><span style="color:var(--good)">+${S.fmtMoney(k.baseIncome)}</span>
        <span>Werbeverträge erfüllt (${k.adOk} Spots ok${k.adFail ? `, ${k.adFail} zu schwach` : ''})</span><span style="color:var(--good)">+${S.fmtMoney(k.adIncome)}</span>
        ${k.penalties ? `<span>Vertragsstrafen</span><span style="color:var(--bad)">−${S.fmtMoney(k.penalties)}</span>` : ''}
        <span>Betriebskosten${k.interest ? ' & Zinsen' : ''}</span><span style="color:var(--bad)">−${S.fmtMoney(k.costs)}</span>
        ${res.bossResult?.ok ? `<span>Bonus der Chefin</span><span style="color:var(--good)">+${S.fmtMoney(res.bossResult.goal.reward)}</span>` : ''}
        <span class="sum">Kontostand</span><span class="sum">${S.fmtMoney(k.moneyAfter)}</span>
      </div>
      <div class="meta"><span class="pill ${imgDelta >= 0 ? 'good' : 'bad'}">Image ${imgDelta >= 0 ? '+' : ''}${imgDelta}</span><span class="pill good">Jury +${juryD}</span>${k.repeats ? `<span class="pill warn">${k.repeats}× doppelt gesendet</span>` : ''}</div>
      ${boss}
      ${k.moneyAfter < 0 ? `<div class="bubble">⚠️ Du bist im Minus! (${state.stations.k7.negDays}/3 Tage). Nimm einen Kredit bei der Chefin oder verkaufe Sendungen.</div>` : ''}
    </div>
    <div class="m-foot"><button class="btn" id="nextBtn">${state.over ? 'Weiter' : `Tag ${res.day + 1} starten`}</button></div>`, { dismiss: false });
  void other;
  $('#nextBtn').addEventListener('click', () => {
    sfx.click();
    if (state.over) { showEnd(); return; }
    S.nextDay(state);
    writeSave();
    closeModal();
    beginMorning();
  });
}

function showEnd() {
  const o = state.over;
  clearSave();
  const won = ['perfect', 'award', 'leader'].includes(o.type);
  if (won) sfx.fanfare(); else sfx.bad();
  const icon = o.type === 'perfect' ? '🏆✨' : o.type === 'award' ? '🏆' : o.type === 'leader' ? '👑' : o.type === 'fired' ? '📦' : '📺';
  const title = o.type === 'fired' ? 'Gefeuert!' : o.title;
  openModal(`<div class="title-screen"><div style="font-size:64px">${icon}</div><div class="logo" style="font-size:40px">${esc(title)}</div><p class="tagline">${esc(o.reason)}</p>
    <div class="tbl-wrap"><table class="res-table num" style="margin-top:12px"><tr><th>Sender</th><th>Image</th><th>Kontostand</th></tr>
    ${['k7', 'trash', 'prestige'].map((s) => `<tr><td style="color:${STATIONS[s].color};font-weight:800">${STATIONS[s].name}</td><td>${state.stations[s].image}</td><td>${S.fmtMoney(state.stations[s].money)}</td></tr>`).join('')}</table></div></div>
    <div class="m-foot" style="justify-content:center"><button class="btn" id="againBtn">Noch eine Saison!</button></div>`, { dismiss: false });
  $('#againBtn').addEventListener('click', () => { sfx.fanfare(); startGame(S.newGame()); });
}

boot().catch((e) => {
  console.error(e);
  $('#loading').textContent = 'Fehler beim Laden: ' + e.message;
});

// Test-Hook (für automatisierte Checks)
window.crazytvDebug = { state: () => state, world: () => world, skip: (m) => { if (state) state.minute = m; } };
