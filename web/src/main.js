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
  if (ev) toast(`📰 ${ev.t}`);
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
        toast(n.prank === 'confetti' ? `🎉 ${who}: Konfetti im Büro!` : `📡 ${who}: Bildstörung 20–22 Uhr!`, 'bad');
        sfx.bad();
      }
      state.pendingNotices = [];
      renderPanel();
    }
    if (!warned && state.minute >= S.DAY_END - 45) { warned = true; toast('⏰ 17:15'); sfx.ding(); }
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
  if (r.owner && r.owner !== 'k7') { toast(`🚫 ${STATIONS[r.owner].name}`); return; }
  if (player.room === roomId && player.state === 'inRoom') { openRoomPanel(roomId); return; }
  closePanel();
  world.goTo(player, roomId);
  world.highlight(roomId);
  setStatus(`→ ${r.name}`);
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
  setStatus(locked ? `🎉 ${ROOMS[roomId].name}` : `🚪 ${ROOMS[roomId].name} · ${STATIONS[occ.sid].short}`);
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
  $('#ticker').textContent = ev ? `📰 ${ev.t}` : '';
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
  office_k7: { icon: '📺', bg: 'var(--k7)', who: 'Senderbüro' },
  market: { icon: '🎞️', bg: '#c7b3ff', who: 'Mira Lizenzia' },
  ads: { icon: '💼', bg: '#ffd27f', who: 'Tina Tausendkontakt' },
  newsroom: { icon: '📰', bg: '#9fc2ff', who: 'Bernd Breaking' },
  boss: { icon: '👩‍💼', bg: '#b8e0a6', who: BOSS_NAME },
  jury: { icon: '🏆', bg: '#f5b8a8', who: JURY_NAME },
  kiosk: { icon: '🍬', bg: '#f2a65a', who: 'Kiosk-Kemal' },
  hausmeister: { icon: '🔧', bg: '#7d8fa6', who: 'Hausmeister Kalle' },
};

function openRoomPanel(roomId) {
  openRoom = roomId;
  if (roomId === 'newsroom') state.trendSeen = state.day;
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

const tabState = { office_k7: 'plan', market: 'buy', ads: 'offers' };

function renderPanel() {
  if (!openRoom || !state) return;
  const meta = ROOM_META[openRoom] || { icon: '🚪', bg: 'var(--line)', who: '' };
  const r = ROOMS[openRoom];
  const body = ({
    office_k7: officeBody, market: marketBody, ads: adsBody, newsroom: newsBody, boss: bossBody,
    jury: juryBody, kiosk: kioskBody, hausmeister: kalleBody,
  }[openRoom] || (() => ''))();
  const scroll = $('#panel .p-body')?.scrollTop || 0;
  $('#panel').innerHTML = `
    <div class="p-head">
      <div class="p-avatar" style="background:${meta.bg}">${meta.icon}</div>
      <div class="p-title"><h2>${esc(r.name)}</h2><p>${esc(meta.who)}</p></div>
      <button class="p-close" data-act="help" aria-label="Hilfe">?</button>
      <button class="p-close" id="pClose" aria-label="Schließen">✕</button>
    </div>
    <div class="p-body">${body}</div>`;
  $('#panel .p-body').scrollTop = scroll;
  $('#pClose').addEventListener('click', leaveRoom);
  $('#panel').querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => act(b.dataset.act, b.dataset)));
}

const k = (v) => (Math.abs(v) >= 1e6 ? (v / 1e6).toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' Mio' : Math.round(v / 1000) + 'k');
const m1 = (v) => v.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
function stars(n) { return `<span class="stars">${'★'.repeat(n)}<span style="opacity:.3">${'★'.repeat(5 - n)}</span></span>`; }
function qbar(q, color = 'var(--k7)') { return `<span class="qbar"><i style="width:${q}%;background:${color}"></i></span>`; }
function fbar(f) { return qbar(f * 100, f < 0.5 ? 'var(--warn)' : 'var(--good)'); }
function gi(g) { return `<span title="${GENRES[g].name}">${GENRES[g].icon}</span>`; }
function tabs(room, list) {
  return `<div class="tabs">${list.map(([id, n]) => `<button class="tab${tabState[room] === id ? ' on' : ''}" data-act="tab" data-room="${room}" data-tab="${id}">${n}</button>`).join('')}</div>`;
}
function bestHour(pid) {
  let best = 0, bh = 0;
  HOURS.forEach((h, hi) => { const e = S.estimate(state, 'k7', pid, hi).total; if (e > best) { best = e; bh = hi; } });
  return { hi: bh, e: best };
}
function progMeta(p) {
  return `${p.hype > 0.3 ? '🔥' : ''}${GENRES[p.g].jury >= 0.7 && p.q >= 70 ? '🏆' : ''}${trendKnown() && state.trend.g === p.g ? '📈' : ''}`;
}
const trendKnown = () => state.trendSeen === state.day;

// --- Büro
function officeBody() {
  const st = state.stations.k7;
  const nc = st.contracts.length;
  let html = tabs('office_k7', [['plan', '📅 Plan'], ['archive', '🎞️ Archiv'], ['contracts', `💼 ${nc}`], ['stats', '📊']]);
  const tab = tabState.office_k7;
  if (tab === 'plan') {
    const n = st.newsBought.length;
    html += `<div class="meta"><span class="pill ${n ? 'good' : 'warn'}">📰 ${n}/${S.MAX_NEWS}</span>${trendKnown() ? `<span class="pill good">📈 ${GENRES[state.trend.g].icon} ${state.trend.tag}</span>` : ''}${st.debuff.confetti && state.minute < st.debuff.confetti ? '<span class="pill bad">🎉</span>' : ''}${st.debuff.antenna ? '<span class="pill bad">📡 20–22</span>' : ''}</div>`;
    HOURS.forEach((h, hi) => {
      const slot = st.schedule[hi];
      const p = slot.prog ? state.programs[slot.prog] : null;
      const est = p ? S.estimate(state, 'k7', p.id, hi) : null;
      const dup = p && st.schedule.findIndex((s) => s.prog === p.id) !== hi;
      let ad = `<button class="slot-ad" data-act="pickAd" data-hi="${hi}">+💼</button>`;
      const c = slot.ad && st.contracts.find((x) => x.id === slot.ad);
      if (c) {
        const v = est ? (c.group ? est.byGroup[c.group] : est.total) : 0;
        ad = `<button class="slot-ad set ${v >= c.minM ? 'ok' : 'risk'}" data-act="pickAd" data-hi="${hi}">💼 ${esc(c.brand)}</button>`;
      }
      html += `<div class="slot"><div class="hr num${h >= 20 && h <= 22 ? ' prime' : ''}">${hourLabel(h)}</div><div class="slot-body">
        <button class="slot-prog${p ? '' : ' empty-slot'}" data-act="pickProg" data-hi="${hi}">
          ${p ? `<span style="font-size:20px">${GENRES[p.g].icon}</span><span class="grow"><span class="t">${esc(p.t)}</span><span class="meta">${stars(S.fitStars(state, 'k7', p.id, hi))}${dup ? '<span class="pill bad">2×</span>' : ''}${p.fresh < 0.5 ? '<span class="pill warn">🥱</span>' : ''}</span></span><span class="est num">${m1(est.total)}</span>` : '<span class="grow">—</span>'}
        </button>${ad}</div></div>`;
    });
  } else if (tab === 'archive') {
    html += S.archive(state, 'k7').sort((a, b) => b.q - a.q).map((p) => {
      const bh = bestHour(p.id);
      return `<div class="card"><span style="font-size:20px">${GENRES[p.g].icon}</span><div class="grow"><h3>${esc(p.t)}</h3><div class="meta">${qbar(p.q)} ${fbar(p.fresh)}<span class="num">⏰ ${hourLabel(HOURS[bh.hi])}</span></div></div></div>`;
    }).join('');
  } else if (tab === 'contracts') {
    html += contractList(st.contracts, false);
  } else html += statsBody();
  return html;
}

function contractList(list, offer) {
  if (!list.length) return '<p class="empty">—</p>';
  const full = state.stations.k7.contracts.length >= S.MAX_CONTRACTS;
  return list.map((c) => {
    const left = offer ? c.days : c.deadlineDay - state.day + 1;
    const need = c.group ? `${GROUPS[c.group].icon} ≥${m1(c.minM)}` : `≥${m1(c.minM)}`;
    return `<div class="card"><div class="grow"><h3>${esc(c.brand)}</h3>
      <div class="meta num"><span class="pill">${offer ? c.spots : `${c.done}/${c.spots}`}×</span><span class="pill">${need}</span><span class="pill ${left <= 1 ? 'bad' : ''}">⏳${left}</span><span style="color:var(--good)">+${k(c.reward)}</span><span style="color:var(--bad)">−${k(c.penalty)}</span></div></div>
      ${offer ? `<button class="btn" data-act="acceptAd" data-id="${c.id}" ${full ? 'disabled' : ''}>✓</button>` : ''}</div>`;
  }).join('');
}

function statsBody() {
  const hist = state.history;
  if (!hist.length) return '<p class="empty">—</p>';
  const max = Math.max(...hist.flatMap((h) => Object.values(h.viewers)), 1);
  const rows = hist.slice(-7);
  const cols = `grid-template-columns:repeat(${rows.length},1fr)`;
  return `<div class="hourchart" style="${cols}">${rows.map((h) => `<div class="col">${['k7', 'trash', 'prestige'].map((s) => `<i style="height:${(h.viewers[s] / max) * 100}%;background:${STATIONS[s].color}"></i>`).join('')}</div>`).join('')}</div>
    <div class="hourlabels" style="${cols}">${rows.map((h) => `<span>${h.day}</span>`).join('')}</div>
    <div class="tbl-wrap"><table class="res-table num"><tr><th></th><th>⭐</th><th>🏆</th><th>Ø Mio</th></tr>
    ${['k7', 'trash', 'prestige'].map((s) => `<tr><td style="color:${STATIONS[s].color};font-weight:800">${STATIONS[s].short}</td><td>${state.stations[s].image}</td><td>${s === 'k7' ? Math.round(state.stations[s].jury) : '?'}</td><td>${m1(hist.reduce((a, h) => a + h.viewers[s], 0) / hist.length)}</td></tr>`).join('')}</table></div>`;
}

// --- Markt
function marketBody() {
  const st = state.stations.k7;
  let html = tabs('market', [['buy', `Kaufen ${state.market.length}`], ['sell', 'Verkaufen']]);
  if (tabState.market === 'buy') {
    html += state.market.length ? state.market.map((id) => {
      const p = state.programs[id];
      const price = S.programPrice(p);
      const bh = bestHour(id);
      return `<div class="card" title="${esc(p.d)}"><span style="font-size:22px">${GENRES[p.g].icon}</span><div class="grow"><h3>${esc(p.t)}</h3>
        <div class="meta num">${qbar(p.q)}<span>⏰ ${hourLabel(HOURS[bh.hi])} · ${m1(bh.e)}</span><span>${progMeta(p)}</span></div></div>
        <button class="btn" data-act="buy" data-id="${id}" ${st.money < price ? 'disabled' : ''}>${k(price)}</button></div>`;
    }).join('') : '<p class="empty">—</p>';
  } else {
    html += S.archive(state, 'k7').sort((a, b) => a.q * a.fresh - b.q * b.fresh).map((p) => `<div class="card"><span style="font-size:20px">${GENRES[p.g].icon}</span><div class="grow"><h3>${esc(p.t)}</h3><div class="meta">${qbar(p.q)} ${fbar(p.fresh)}</div></div><button class="btn alt" data-act="sell" data-id="${p.id}">+${k(S.sellPrice(state, p.id))}</button></div>`).join('');
  }
  return html;
}

// --- Werbung
function adsBody() {
  const st = state.stations.k7;
  return tabs('ads', [['offers', `Angebote ${state.adOffers.length}`], ['mine', `Laufend ${st.contracts.length}/${S.MAX_CONTRACTS}`]])
    + contractList(tabState.ads === 'offers' ? state.adOffers : st.contracts, tabState.ads === 'offers');
}

// --- Newsroom
const TOPIC = { politik: '🏛️', wetter: '🌦️', promi: '⭐', sport: '⚽', tech: '💻', tiere: '🐾', kultur: '🎨' };
function newsBody() {
  const st = state.stations.k7;
  const t = state.trend;
  const full = st.newsBought.length >= S.MAX_NEWS;
  let html = `<div class="card trend"><span style="font-size:28px">${GENRES[t.g].icon}</span><div class="grow"><h3>📈 ${t.tag}</h3><p>${GENRES[t.g].name} +25 %</p></div><span class="pill ${full ? 'good' : ''}">📰 ${st.newsBought.length}/${S.MAX_NEWS}</span></div>`;
  html += state.news.map((n) => `<div class="card"><span style="font-size:20px">${TOPIC[n.topic]}</span><div class="grow"><h3>${esc(n.t)}</h3><div class="meta">${qbar(n.q, 'var(--warn)')}</div></div><button class="btn" data-act="news" data-id="${n.id}" ${full || st.money < n.price ? 'disabled' : ''}>${k(n.price)}</button></div>`).join('');
  html += st.newsBought.map((n) => `<div class="card done"><span style="font-size:20px">✅</span><div class="grow"><h3>${esc(n.t)}</h3></div></div>`).join('');
  return html;
}

// --- Chefin
function bossBody() {
  const st = state.stations.k7;
  const b = state.boss;
  const mood = b.mood >= 2 ? '😄' : b.mood >= 0 ? '🙂' : b.mood === -1 ? '😐' : '😠';
  const goal = b.goal && b.goal.day === state.day ? b.goal : null;
  return `<div class="card"><span style="font-size:28px">${mood}</span><div class="grow">${goal ? `<h3>🎯 ${esc(goal.text)}</h3><div class="meta"><span style="color:var(--good)">+${k(goal.reward)}</span></div>` : '<h3>🎯 —</h3>'}</div>${goal ? '' : '<button class="btn" data-act="goal">Ziel</button>'}</div>
    <div class="card"><span style="font-size:24px">🏦</span><div class="grow"><h3 class="num">${k(st.loan)} / ${k(S.LOAN_MAX)}</h3><div class="meta">${Math.round(S.LOAN_RATE * 100)} %/Tag</div></div>
    <button class="btn" data-act="loan" ${st.loan >= S.LOAN_MAX ? 'disabled' : ''}>+${k(S.LOAN_STEP)}</button><button class="btn alt" data-act="repay" ${!st.loan ? 'disabled' : ''}>−${k(S.LOAN_STEP)}</button></div>`;
}

// --- Jury
function juryBody() {
  const st = state.stations.k7;
  const rank = ['k7', 'trash', 'prestige'].sort((a, b) => state.stations[b].jury - state.stations[a].jury);
  const pos = rank.indexOf('k7');
  const counts = {};
  st.gifts.forEach((g) => (counts[g] = (counts[g] || 0) + 1));
  return `<div class="card"><span style="font-size:28px">${['🥇', '🥈', '🥉'][pos]}</span><div class="grow"><h3 class="num">🏆 ${Math.round(st.jury)}</h3><div class="meta">👑 <span style="color:${STATIONS[rank[0]].color};font-weight:800">${STATIONS[rank[0]].name}</span></div></div></div>`
    + (Object.keys(counts).length ? Object.entries(counts).map(([gid, n]) => {
      const g = GIFTS.find((x) => x.id === gid);
      return `<div class="card"><span style="font-size:24px">${g.icon}</span><div class="grow"><h3>${g.name} ×${n}</h3></div><button class="btn gold" data-act="give" data-id="${gid}">+${g.jury} 🏆</button></div>`;
    }).join('') : '<p class="empty">🎁 —</p>');
}

// --- Kiosk
function kioskBody() {
  const st = state.stations.k7;
  return GIFTS.map((g) => `<div class="card"><span style="font-size:24px">${g.icon}</span><div class="grow"><h3>${g.name}</h3><div class="meta">+${g.jury} 🏆</div></div><button class="btn" data-act="gift" data-id="${g.id}" ${st.money < g.price ? 'disabled' : ''}>${k(g.price)}</button></div>`).join('')
    + (st.gifts.length ? `<p class="empty">🎒 ${st.gifts.map((g) => GIFTS.find((x) => x.id === g).icon).join(' ')}</p>` : '');
}

// --- Hausmeister Kalle
function kalleBody() {
  const st = state.stations.k7;
  let html = PRANKS.map((p) => `<div class="card"><span style="font-size:24px">${p.icon}</span><div class="grow"><h3>${p.name}</h3><div class="meta num">${k(p.price)}</div></div>
    <button class="btn pink" data-act="prank" data-id="${p.id}" data-target="trash" ${st.money < p.price ? 'disabled' : ''}>T24</button><button class="btn gold" data-act="prank" data-id="${p.id}" data-target="prestige" ${st.money < p.price ? 'disabled' : ''}>P1</button></div>`).join('');
  html += `<div class="spy">${['trash', 'prestige'].map((sid) => `<div><h4 style="color:${STATIONS[sid].color}">${STATIONS[sid].short}</h4>${HOURS.map((h, hi) => {
    const p = state.stations[sid].schedule[hi].prog ? state.programs[state.stations[sid].schedule[hi].prog] : null;
    return `<p><span class="num">${String(h % 24).padStart(2, '0')}</span> ${p ? `${GENRES[p.g].icon} ${esc(p.t)}` : '—'}</p>`;
  }).join('')}</div>`).join('')}</div>`;
  return html;
}

// ------------------------------------------------------------------ Aktionen
function act(a, d) {
  sfx.click();
  const me = 'k7';
  switch (a) {
    case 'tab': tabState[d.room] = d.tab; renderPanel(); break;
    case 'help': showHelp(openRoom); break;
    case 'pickProg': pickProgram(+d.hi); break;
    case 'pickAd': pickAd(+d.hi); break;
    case 'buy': result(S.buyProgram(state, me, d.id)); break;
    case 'sell': result(S.sellProgram(state, me, d.id)); break;
    case 'acceptAd': result(S.acceptContract(state, me, d.id)); break;
    case 'news': result(S.buyNews(state, me, d.id)); break;
    case 'gift': result(S.buyGift(state, me, d.id)); break;
    case 'give': { const r = S.giveGift(state, me, d.id); result({ ok: r.ok, msg: `+${m1(r.gain)} 🏆` }); break; }
    case 'prank': {
      const r = S.prank(state, me, d.id, d.target);
      result({ ok: r.ok, msg: r.ok ? (r.caught ? '😳 Erwischt! −2 ⭐' : '🤫 Erledigt.') : r.msg });
      if (r.ok && d.id === 'confetti' && ai[d.target]) ai[d.target].stayUntil = Math.max(ai[d.target].stayUntil, state.minute + 60);
      break;
    }
    case 'loan': result(S.takeLoan(state, me)); break;
    case 'repay': result(S.repayLoan(state, me)); break;
    case 'goal': S.bossGoal(state); renderPanel(); break;
  }
}

function pickProgram(hi) {
  const st = state.stations.k7;
  const arc = S.archive(state, 'k7').map((p) => ({ p, e: S.estimate(state, 'k7', p.id, hi).total })).sort((a, b) => b.e - a.e);
  const planned = (pid) => st.schedule.map((s, i) => (s.prog === pid && i !== hi ? String(HOURS[i] % 24).padStart(2, '0') : null)).filter(Boolean);
  openModal(`<div class="m-head"><h2 class="num">${hourLabel(HOURS[hi])}</h2></div>
    <div class="m-body">${arc.map(({ p, e }) => {
      const pl = planned(p.id);
      return `<button class="slot-prog" data-pick="${p.id}"><span style="font-size:20px">${GENRES[p.g].icon}</span><span class="grow"><span class="t">${esc(p.t)}</span><span class="meta">${stars(S.fitStars(state, 'k7', p.id, hi))}${fbar(p.fresh)}${pl.length ? `<span class="pill warn">${pl.join(' ')}</span>` : ''}${progMeta(p)}</span></span><span class="est num">${m1(e)}</span></button>`;
    }).join('')}</div>
    <div class="m-foot"><button class="btn alt" data-pick="">Leeren</button><button class="btn alt" data-close>✕</button></div>`);
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
    return { c, v, ok: v >= c.minM, remaining: c.spots - c.done - used(c.id) };
  });
  openModal(`<div class="m-head"><h2 class="num">💼 ${hourLabel(HOURS[hi])} · ${m1(est.total)}</h2></div>
    <div class="m-body">${list.length ? list.map(({ c, v, ok, remaining }) => `<button class="slot-prog" data-ad="${c.id}" ${remaining <= 0 ? 'disabled style="opacity:.45"' : ''}><span class="grow"><span class="t">${esc(c.brand)}</span><span class="meta num"><span class="pill ${ok ? 'good' : 'bad'}">${c.group ? GROUPS[c.group].icon + ' ' : ''}${m1(v)} / ${m1(c.minM)}</span><span>${remaining}× offen</span></span></span></button>`).join('') : '<p class="empty">—</p>'}</div>
    <div class="m-foot"><button class="btn alt" data-ad="">Leeren</button><button class="btn alt" data-close>✕</button></div>`);
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
  openModal(`<div class="title-screen"><div class="logo">Crazy<span>TV</span><em>7½</em></div></div>
    <div class="m-foot" style="justify-content:center;border:0">${save && !save.over ? `<button class="btn alt" id="contBtn">▶ Tag ${save.day}</button>` : ''}<button class="btn" id="newBtn">Neues Spiel</button><button class="btn alt" id="manBtn">📖 Handbuch</button></div>`, { dismiss: false });
  $('#newBtn').addEventListener('click', () => { sfx.fanfare(); clearSave(); startGame(S.newGame()); });
  $('#contBtn')?.addEventListener('click', () => { sfx.click(); startGame(save); });
  $('#manBtn').addEventListener('click', () => showHelp(null, showTitle));
}

function openMenu() {
  if (!state) return;
  const wasSpeed = speed;
  openModal(`<div class="m-head"><h2>Pause · Tag ${state.day}/${S.SEASON_DAYS}</h2></div>
    <div class="m-body">
      <button class="btn alt" id="mResume">▶ Weiter</button>
      <button class="btn alt" id="mHelp">📖 Handbuch</button>
      <button class="btn alt" id="mView">🎥 Ansicht zurücksetzen</button>
      <button class="btn alt" id="mSound">${soundOn ? '🔊' : '🔇'} Sound</button>
      <button class="btn pink" id="mNew">Neues Spiel</button>
    </div>`);
  $('#mResume').addEventListener('click', () => { closeModal(); speed = wasSpeed; });
  $('#mView').addEventListener('click', () => { world.resetView(); closeModal(); });
  $('#mSound').addEventListener('click', () => { soundOn = !soundOn; $('#mSound').textContent = `${soundOn ? '🔊' : '🔇'} Sound`; });
  $('#mHelp').addEventListener('click', () => showHelp());
  $('#mNew').addEventListener('click', () => { clearSave(); closeModal(); showTitle(); });
}

// ------------------------------------------------------------------ Handbuch
const MANUAL = [
  ['start', '📺 Worum geht’s', `Du leitest <b>Kanal 7½</b>, den kleinsten der drei Sender im Medienturm. Gegner: <b style="color:var(--trash)">TRASH24</b> und <b style="color:var(--prestige)">Prestige One</b>.
    <br>Nach ${S.SEASON_DAYS} Tagen zählt: <b>Marktführer</b> (meiste ⭐ Image) und die <b>Goldene Fernbedienung</b> (meiste 🏆 Jury-Punkte).
    <br>Gefeuert wirst du bei weniger als 5 ⭐, nach 3 Tagen im Minus oder wenn die Chefin die Geduld verliert.`],
  ['day', '⏱️ Der Tag', `08–18 Uhr läufst du durch den Turm, die Uhr läuft dabei weiter, auch in Räumen. ▶ / ⏩ / ⏸ oben rechts, Leertaste = Tempo.
    <br>Ziel antippen → deine Figur läuft hin. Der <b>Aufzug</b> nimmt nur eine Person mit. In einem <b>besetzten Raum</b> wartest du vor der Tür. Wer in einem Raum steht, blockiert ihn für die anderen.
    <br>Um 18 Uhr geht dein Programm auf Sendung, danach kommt die Bilanz.`],
  ['office_k7', '📺 Büro', `📅 <b>Plan</b>: 7 Stunden, 18–01 Uhr. Pro Stunde eine Sendung und danach ein Werbespot (💼). Leere Stunde = Testbild.
    <br>★ = wie gut die Sendung zur Uhrzeit passt. Die Zahl rechts ist die Schätzung in Mio. Zuschauern.
    <br><span class="pill bad">2×</span> doppelt im Plan · <span class="pill warn">🥱</span> abgenutzt · 📰 gekaufte Nachrichten für 20 Uhr.
    <br>Der Plan bleibt von Tag zu Tag stehen. Planen kannst du nur hier im Büro.`],
  ['market', '🎞️ Content-Markt', `Jeden Tag neue Lizenzen. Wer zuerst kommt, kauft zuerst.
    <br>Balken = Qualität · ⏰ beste Uhrzeit mit geschätzten Zuschauern · 🔥 Hype · 🏆 mag die Jury · 📈 Trend des Tages.
    <br>Verkaufen bringt weniger, je abgenutzter die Sendung ist.`],
  ['ads', '💼 Werbeagentur', `Vertrag = Spots × Mindestquote (≥ Mio., evtl. nur eine Zielgruppe) innerhalb der Frist ⏳ in Tagen.
    <br>Ausgezahlt wird erst, wenn <b>alle</b> Spots die Quote geschafft haben. Verpasste Frist = Strafe. Max. ${S.MAX_CONTRACTS} Verträge.
    <br>Im Planer: grüner Rand = Quote reicht voraussichtlich, gelber Rand = knapp.`],
  ['newsroom', '📰 Newsroom', `📈 Hier erfährst du den <b>Trend des Tages</b>: Das Genre bringt +25 %.
    <br>Bis zu ${S.MAX_NEWS} Meldungen stärken die 20-Uhr-Sendung. Ohne Nachrichten gibt es dort einen Malus. 🏛️ Politik und 🎨 Kultur bringen extra 🏆.`],
  ['boss', '👩‍💼 Chefin', `🎯 Freiwilliges Tagesziel: geschafft = Bonus und gute Laune, verpasst = schlechte Laune. Ist sie dauerhaft 😠, bist du raus.
    <br>🏦 Kredit in 50k-Schritten mit Zinsen pro Tag.`],
  ['jury', '🏆 Jury', `Jury-Punkte gibt es für gute 🎭 Drama-, 🌍 Doku- und 🎙️ Late-Night-Sendungen zwischen 20 und 23 Uhr, für gute Nachrichten und für Geschenke.
    <br>Ab dem zweiten Geschenk am selben Tag zählt jedes weniger.`],
  ['kiosk', '🍬 Kiosk', 'Geschenke für die Jury kaufen. Überreichen musst du sie selbst in der Jury-Lounge.'],
  ['hausmeister', '🔧 Kalle', `🎉 <b>Konfetti</b>: Das Büro des Gegners ist 1 Std. gesperrt.
    <br>📡 <b>Antenne</b>: Beim Gegner gibt es heute zwischen 20 und 22 Uhr eine Bildstörung (−30 %).
    <br>25 % Risiko, erwischt zu werden (−2 ⭐). Unten siehst du, was die Gegner heute geplant haben.`],
  ['audience', '👥 Zuschauer', `📱 Gen Z und 🎮 Nerds schauen spät, 🏠 Familien früh, 📰 Boomer zur Primetime, ☕ Millennials abends.
    <br>Wer eine Stunde deutlich gewinnt, nimmt dem Letzten 1 ⭐ ab. Ein starkes Programm vorher hält die Zuschauer für die nächste Stunde.
    <br>Wiederholungen nutzen sich ab und erholen sich langsam. Streamingdienste und Tagesereignisse (📰 oben) verschieben alles.`],
];

function showHelp(section = null, back = null) {
  const list = section ? MANUAL.filter(([id]) => id === section) : MANUAL;
  openModal(`<div class="m-head"><h2>📖 ${section ? list[0][1] : 'Handbuch'}</h2></div>
    <div class="m-body manual">${list.map(([id, t, txt]) => `${section ? '' : `<h3>${t}</h3>`}<p>${txt}</p>`).join('')}</div>
    <div class="m-foot">${section ? '<button class="btn alt" id="hAll">📖 Alles</button>' : ''}<button class="btn" id="hOk">OK</button></div>`);
  $('#hOk').addEventListener('click', () => { closeModal(); if (back) back(); });
  $('#hAll')?.addEventListener('click', () => showHelp(null, back));
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
  el.innerHTML = `<div class="ev-top"><span class="onair">ON AIR</span><span class="ev-clock num" id="evClock">18:00</span><span class="ev-watch" id="evWatch">🛋️</span></div>
    <div class="ev-bottom"><div class="feed" id="evFeed"></div><div id="evChans"></div><div class="ev-actions"><button class="btn alt" id="evSkip">⏩</button></div></div>`;
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
  $('#evWatch').textContent = streaming ? '🛋️ NETFLUX' : `🛋️ ${STATIONS[famBest].short} · ${H.per[famBest].title}`;
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
      <div class="money-lines num">
        <span>Werbeerlöse</span><span style="color:var(--good)">+${S.fmtMoney(k.baseIncome)}</span>
        <span>Verträge (${k.adOk}✓${k.adFail ? ` ${k.adFail}✗` : ''})</span><span style="color:var(--good)">+${S.fmtMoney(k.adIncome)}</span>
        ${k.penalties ? `<span>Strafen</span><span style="color:var(--bad)">−${S.fmtMoney(k.penalties)}</span>` : ''}
        <span>Kosten${k.interest ? ' + Zinsen' : ''}</span><span style="color:var(--bad)">−${S.fmtMoney(k.costs)}</span>
        ${res.bossResult?.ok ? `<span>Bonus 🎯</span><span style="color:var(--good)">+${S.fmtMoney(res.bossResult.goal.reward)}</span>` : ''}
        <span class="sum">Kontostand</span><span class="sum">${S.fmtMoney(k.moneyAfter)}</span>
      </div>
      <div class="meta"><span class="pill ${imgDelta >= 0 ? 'good' : 'bad'}">Image ${imgDelta >= 0 ? '+' : ''}${imgDelta}</span><span class="pill good">Jury +${juryD}</span>${k.repeats ? `<span class="pill warn">${k.repeats}× doppelt gesendet</span>` : ''}</div>
      ${boss}
      ${k.moneyAfter < 0 ? `<div class="meta"><span class="pill bad">⚠️ Minus ${state.stations.k7.negDays}/3</span></div>` : ''}
    </div>
    <div class="m-foot"><button class="btn" id="nextBtn">${state.over ? 'Weiter' : `▶ Tag ${res.day + 1}`}</button></div>`, { dismiss: false });
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
