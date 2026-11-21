// CrazyTV – Spielsimulation (ohne Grafik, deterministisch per Seed).
import {
  STATIONS, HOURS, GROUPS, GROUP_KEYS, GENRES, PROGRAMS, STARTERS, BRANDS, NEWS, TRENDS,
  EVENTS, GIFTS, PRANKS, BOSS_GOALS, COMMENTS, hourLabel,
} from './data/content.js';

export const SEASON_DAYS = 14;
export const DAY_START = 8 * 60;
export const AIR_START = 18 * 60;
export const DAY_END = 25 * 60; // 01:00
export const START_MONEY = 160000;
export const DAILY_COST = 14000;
export const VIEWER_REVENUE = 3000; // € pro Mio. Zuschauer (allgemeine Werbeerlöse)
export const MAX_CONTRACTS = 4;
export const MAX_NEWS = 3;
export const LOAN_STEP = 50000;
export const LOAN_MAX = 200000;
export const LOAN_RATE = 0.03;
const OTHERS_K = 0.8;

// ------------------------------------------------------------------ Zufall
function rngNext(state) {
  // mulberry32
  let t = (state.rng = (state.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const rnd = (s, a = 0, b = 1) => a + rngNext(s) * (b - a);
const rint = (s, a, b) => Math.floor(rnd(s, a, b + 1));
const pick = (s, arr) => arr[Math.floor(rngNext(s) * arr.length)];
function shuffle(s, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rngNext(s) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const round = (v, step = 1000) => Math.round(v / step) * step;
export const fmtMoney = (v) => (v < 0 ? '−' : '') + Math.abs(Math.round(v)).toLocaleString('de-DE') + ' €';
export const fmtM = (v) => v.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' Mio.';

// ------------------------------------------------------------------ Programme
export function programPrice(p) {
  return round(p.q * p.q * 9 + p.h * 70000 + (p.k === 'film' ? 12000 : 0) + 6000);
}
export function sellPrice(state, pid) {
  const p = state.programs[pid];
  return round(programPrice(p) * 0.45 * (0.4 + 0.6 * p.fresh));
}

// ------------------------------------------------------------------ Neues Spiel
export function newGame(seed = (Date.now() % 1e9) | 0) {
  const state = {
    version: 1,
    rng: seed,
    seed,
    day: 1,
    phase: 'morning',
    minute: DAY_START,
    programs: {},
    stations: {},
    market: [],
    adOffers: [],
    news: [],
    trend: null,
    event: null,
    roomLocks: {},
    boss: { goal: null, mood: 0, visitedDay: 0 },
    jury: { lastGiftDay: {}, giftsToday: {} },
    lastResults: null,
    history: [],
    log: [],
    nextId: 1,
    over: null,
  };
  for (const p of PROGRAMS) state.programs[p.id] = { ...p, owner: null, fresh: 1, hype: p.h, airings: 0 };
  for (const sid of Object.keys(STATIONS)) {
    for (const p of STARTERS[sid]) state.programs[p.id] = { ...p, owner: sid, fresh: 0.75, hype: p.h, airings: 3 };
    state.stations[sid] = {
      id: sid,
      money: START_MONEY,
      image: sid === 'k7' ? 34 : 33,
      jury: sid === 'prestige' ? 8 : 0,
      contracts: [],
      gifts: [],
      loan: 0,
      negDays: 0,
      newsBought: [],
      debuff: {},
      schedule: HOURS.map(() => ({ prog: null, ad: null })),
    };
    // Startplan: Starter der Reihe nach
    const own = STARTERS[sid].map((p) => p.id);
    state.stations[sid].schedule.forEach((slot, i) => (slot.prog = own[i % own.length]));
  }
  startDay(state);
  return state;
}

export function archive(state, sid) {
  return Object.values(state.programs).filter((p) => p.owner === sid);
}

// ------------------------------------------------------------------ Tagesstart
export function startDay(state) {
  state.phase = 'morning';
  state.minute = DAY_START;
  state.roomLocks = {};
  state.jury.giftsToday = {};
  for (const st of Object.values(state.stations)) {
    st.newsBought = [];
    st.debuff = {};
  }
  // Ereignis (60 %)
  state.event = rngNext(state) < 0.6 ? pick(state, EVENTS) : null;
  state.trend = pick(state, TRENDS);
  // Markt: 8 Angebote aus freien Programmen
  const free = Object.values(state.programs).filter((p) => !p.owner && PROGRAMS.some((x) => x.id === p.id));
  state.market = shuffle(state, free).slice(0, 8).map((p) => p.id);
  // Werbeangebote
  state.adOffers = [];
  const brands = shuffle(state, BRANDS).slice(0, 6);
  for (const br of brands) state.adOffers.push(makeContract(state, br));
  // Nachrichten
  state.news = shuffle(state, NEWS).slice(0, 6).map((n) => ({ ...n, id: 'n' + state.nextId++, price: round(n.q * 140 + 1500, 500) }));
}

function makeContract(state, br) {
  const tier = Math.min(1, (state.day - 1) / 10);
  const spots = rint(state, 2, 5);
  const group = br.g && rngNext(state) < 0.7 ? br.g : null;
  const minM = group
    ? +(rnd(state, 0.4, 1.0) * GROUPS[group].size / 7 * (1 + tier * 0.6)).toFixed(1)
    : +(rnd(state, 1.0, 3.0) * (1 + tier * 0.5)).toFixed(1);
  const effective = group ? minM * (7 / GROUPS[group].size) * 3.2 : minM;
  const days = rint(state, 2, 5);
  const reward = round(spots * effective * rnd(state, 9000, 12000) * (1 + (5 - days) * 0.08) + 6000);
  return {
    id: 'c' + state.nextId++,
    brand: br.b, product: br.p, group, spots, done: 0, minM: Math.max(0.3, minM),
    days, deadlineDay: null, reward, penalty: round(reward * 0.5), owner: null,
  };
}

// ------------------------------------------------------------------ Zuschauermodell
function hourFit(genre, h) {
  const peaks = GENRES[genre].peak;
  const d = Math.min(...peaks.map((p) => Math.abs(p - h)));
  return d === 0 ? 1 : d === 1 ? 0.8 : 0.6;
}

function potential(state, g, hi) {
  const G = GROUPS[g];
  let u = G.usage[hi];
  const mod = state.event?.mod || {};
  if (mod.famLate && g === 'fam' && hi >= 4) u *= 2.6;
  return G.size * u * (mod.all || 1);
}

function othersAttr(state, g, hi) {
  const G = GROUPS[g];
  const mod = state.event?.mod || {};
  let stream = G.stream * (mod.stream || 1);
  let oer = G.oer;
  const h = HOURS[hi];
  if (mod.oerPrime && h >= 20 && h <= 21 && (g === 'boom' || g === 'mill')) oer *= mod.oerPrime;
  return OTHERS_K * (stream + oer);
}

function newsMul(state, sid) {
  const st = state.stations[sid];
  if (!st.newsBought.length) return 0.93;
  const sum = st.newsBought.reduce((a, n) => a + n.q, 0) * (state.event?.mod?.news || 1);
  return 1 + Math.min(0.2, sum / 900);
}

export function attraction(state, sid, pid, hi, g, leadShare = 0, opts = {}) {
  if (!pid) return 0.02; // Testbild
  const p = state.programs[pid];
  const gi = GROUP_KEYS.indexOf(g);
  const h = HOURS[hi];
  let a = Math.pow(p.q / 100, 1.3) * GENRES[p.g].pref[gi] * hourFit(p.g, h);
  a *= 0.35 + 0.65 * (opts.fresh ?? p.fresh);
  a *= 1 + (opts.hype ?? p.hype);
  if (state.trend && state.trend.g === p.g) a *= 1.25;
  a *= 1 + 0.4 * leadShare;
  if (h === 20) a *= newsMul(state, sid);
  const st = state.stations[sid];
  if (st.debuff.antenna && h >= 20 && h <= 21) a *= 0.7;
  if (p.g === 'anim' && g === 'fam' && h >= 22 && !state.event?.mod?.famLate) a *= 0.4;
  return a;
}

/** Schätzung für den Programmplaner: Zuschauer (Mio.) gegen durchschnittliche Konkurrenz. */
export function estimate(state, sid, pid, hi) {
  let total = 0;
  const byGroup = {};
  for (const g of GROUP_KEYS) {
    const a = attraction(state, sid, pid, hi, g, 0.15);
    const rival = 0.33;
    const o = othersAttr(state, g, hi);
    const share = (a * a) / (a * a + 2 * rival * rival + o * o);
    byGroup[g] = potential(state, g, hi) * share;
    total += byGroup[g];
  }
  return { total, byGroup };
}

/** 1–5 Sterne: wie gut passt das Programm auf diese Stunde? */
export function fitStars(state, sid, pid, hi) {
  const e = estimate(state, sid, pid, hi).total;
  return Math.max(1, Math.min(5, Math.round(e / 1.3)));
}

// ------------------------------------------------------------------ Sendeabend
function ensureBroadcast(state) {
  if (state.eve && state.eve.day === state.day) return state.eve;
  const sids = Object.keys(state.stations);
  state.eve = {
    day: state.day,
    hi: -1,
    hours: [],
    prevShare: Object.fromEntries(sids.map((s) => [s, Object.fromEntries(GROUP_KEYS.map((g) => [g, 0]))])),
    summary: Object.fromEntries(sids.map((s) => [s, {
      viewers: 0, hoursWon: 0, adOk: 0, adFail: 0, adIncome: 0, penalties: 0, juryGain: 0,
      imageBefore: state.stations[s].image, moneyBefore: state.stations[s].money, prime: 0, repeats: 0,
    }])),
  };
  return state.eve;
}

/** Ist dieser Slot schon gesendet (oder läuft gerade)? */
export function slotLocked(state, hi) {
  return !!state.eve && state.eve.day === state.day && hi <= state.eve.hi;
}

/** Eine Sendestunde ausstrahlen (live während des Tages). */
export function simulateHour(state, hi) {
  const eve = ensureBroadcast(state);
  if (hi <= eve.hi) return eve.hours[hi];
  while (eve.hi < hi - 1) simulateHour(state, eve.hi + 1);
  const sids = Object.keys(state.stations);
  const { hours, prevShare, summary } = eve;
  const h = HOURS[hi];
  const per = {};
  const attrs = {};
  for (const s of sids) {
    const slot = state.stations[s].schedule[hi];
    attrs[s] = {};
    for (const g of GROUP_KEYS) attrs[s][g] = attraction(state, s, slot.prog, hi, g, prevShare[s][g]);
  }
  let othersTotal = 0;
  for (const s of sids) per[s] = { viewers: 0, byGroup: {} };
  for (const g of GROUP_KEYS) {
    const o = othersAttr(state, g, hi);
    const den = sids.reduce((acc, s) => acc + attrs[s][g] ** 2, 0) + o * o;
    const pot = potential(state, g, hi);
    for (const s of sids) {
      const share = attrs[s][g] ** 2 / den;
      prevShare[s][g] = share;
      const v = pot * share;
      per[s].byGroup[g] = v;
      per[s].viewers += v;
    }
    othersTotal += pot * (o * o) / den;
  }
  // Werbung, Frische, Jury
  for (const s of sids) {
    const st = state.stations[s];
    const slot = st.schedule[hi];
    const P = slot.prog ? state.programs[slot.prog] : null;
    per[s].prog = P ? P.id : null;
    per[s].title = P ? P.t : 'Testbild';
    per[s].genre = P ? P.g : null;
    summary[s].viewers += per[s].viewers;
    if (h === 20) summary[s].prime = per[s].viewers;
    if (P) {
      if (P.lastAiredDay === state.day) summary[s].repeats++;
      P.lastAiredDay = state.day;
      P.airings++;
      P.fresh = Math.max(0.1, P.fresh - (P.k === 'film' ? 0.35 : P.k === 'serie' ? 0.12 : 0.18));
      P.hype = Math.max(0, P.hype - 0.08);
      if (h >= 20 && h <= 22) {
        const jg = Math.pow(P.q / 100, 2) * GENRES[P.g].jury * 4 * (0.4 + 0.6 * P.fresh);
        st.jury += jg;
        summary[s].juryGain += jg;
      }
    }
    if (slot.ad) {
      const c = st.contracts.find((x) => x.id === slot.ad);
      if (c && c.done < c.spots) {
        const v = c.group ? per[s].byGroup[c.group] : per[s].viewers;
        const ok = v >= c.minM;
        per[s].ad = { brand: c.brand, ok, need: c.minM, got: v, group: c.group };
        if (ok) {
          c.done++;
          summary[s].adOk++;
          if (c.done >= c.spots) {
            st.money += c.reward;
            summary[s].adIncome += c.reward;
            c.completed = true;
          }
        } else summary[s].adFail++;
      }
    }
  }
  // Image: Stundensieger nimmt dem Letzten einen Punkt ab
  const ranked = sids.slice().sort((a, b) => per[b].viewers - per[a].viewers);
  const winner = ranked[0];
  const loser = ranked[ranked.length - 1];
  summary[winner].hoursWon++;
  if (state.stations[loser].image > 0 && per[winner].viewers > per[loser].viewers * 1.15) {
    state.stations[loser].image -= 1;
    state.stations[winner].image += 1;
  }
  const hr = { h, per, others: othersTotal, winner, loser };
  hours.push(hr);
  eve.hi = hi;
  return hr;
}

/** Tagesabschluss nach 01:00 Uhr. */
export function finishDay(state) {
  const eve = ensureBroadcast(state);
  for (let hi = eve.hi + 1; hi < HOURS.length; hi++) simulateHour(state, hi);
  const sids = Object.keys(state.stations);
  const { hours, summary } = eve;
  // News -> Jury
  for (const s of sids) {
    const st = state.stations[s];
    const nj = st.newsBought.reduce((a, n) => a + n.q * (n.topic === 'kultur' || n.topic === 'politik' ? 1.5 : 1), 0) / 45;
    st.jury += nj;
    summary[s].juryGain += nj;
  }

  // Verträge: erledigte entfernen, Deadlines prüfen
  for (const s of sids) {
    const st = state.stations[s];
    for (const c of st.contracts) {
      if (!c.completed && state.day >= c.deadlineDay) {
        st.money -= c.penalty;
        summary[s].penalties += c.penalty;
        c.expired = true;
      }
    }
    st.contracts = st.contracts.filter((c) => !c.completed && !c.expired);
    // Ads in Slots, deren Vertrag weg ist, löschen
    for (const slot of st.schedule) if (slot.ad && !st.contracts.some((c) => c.id === slot.ad)) slot.ad = null;
  }

  // Kosten
  for (const s of sids) {
    const st = state.stations[s];
    const interest = Math.round(st.loan * LOAN_RATE);
    const cost = DAILY_COST + interest;
    const base = Math.round(summary[s].viewers * VIEWER_REVENUE);
    st.money += base - cost;
    summary[s].baseIncome = base;
    summary[s].costs = cost;
    summary[s].interest = interest;
  }

  // Chefin-Ziel
  let bossResult = null;
  const goal = state.boss.goal;
  if (goal && goal.day === state.day) {
    const k = summary.k7;
    const val = goal.id === 'prime' ? k.prime : goal.id === 'wins' ? k.hoursWon : goal.id === 'ads' ? k.adOk : k.viewers;
    const ok = val >= goal.n;
    if (ok) {
      state.stations.k7.money += goal.reward;
      state.boss.mood = Math.min(3, state.boss.mood + 1);
    } else state.boss.mood -= 1;
    bossResult = { ok, goal, val };
  }

  for (const s of sids) {
    const st = state.stations[s];
    summary[s].imageAfter = st.image;
    summary[s].moneyAfter = st.money;
    summary[s].jury = st.jury;
  }

  // Frische erholt sich über Nacht
  for (const p of Object.values(state.programs)) p.fresh = Math.min(1, p.fresh + 0.08);

  const result = { day: state.day, hours, summary, bossResult, headline: headline(state, hours, summary), event: state.event, trend: state.trend };
  state.lastResults = result;
  state.eve = null;
  state.history.push({ day: state.day, viewers: Object.fromEntries(sids.map((s) => [s, summary[s].viewers])), image: Object.fromEntries(sids.map((s) => [s, state.stations[s].image])) });
  state.phase = 'summary';
  checkEnd(state, summary);
  return result;
}


export function simulateEvening(state) {
  for (let hi = 0; hi < HOURS.length; hi++) simulateHour(state, hi);
  return finishDay(state);
}

function headline(state, hours, summary) {
  const sids = Object.keys(summary);
  const best = sids.slice().sort((a, b) => summary[b].viewers - summary[a].viewers)[0];
  let top = null;
  for (const h of hours) for (const s of sids) if (!top || h.per[s].viewers > top.v) top = { v: h.per[s].viewers, s, t: h.per[s].title, h: h.h };
  const name = STATIONS[best].name;
  const opts = [
    `${name} gewinnt den Abend! „${top.t}“ holt ${fmtM(top.v)} Zuschauer.`,
    `Quotenkönig des Tages: ${name}. Größter Hit: „${top.t}“ um ${hourLabel(top.h)}.`,
    `${name} räumt ab – die Konkurrenz schaut in die Röhre.`,
  ];
  return opts[state.day % opts.length];
}

function checkEnd(state, summary) {
  const k = state.stations.k7;
  k.negDays = k.money < 0 ? k.negDays + 1 : 0;
  for (const s of ['trash', 'prestige']) {
    const st = state.stations[s];
    st.negDays = st.money < 0 ? st.negDays + 1 : 0;
  }
  if (k.image < 5) state.over = { type: 'fired', reason: 'Dein Image ist im Keller. Die Chefin setzt dich vor die Tür.' };
  else if (k.negDays >= 3) state.over = { type: 'fired', reason: 'Drei Tage in den roten Zahlen. Die Chefin hat dir den Schlüssel abgenommen.' };
  else if (state.boss.mood <= -3) state.over = { type: 'fired', reason: 'Zu viele verpasste Ziele. Die Chefin hat die Geduld verloren.' };
  else if (state.day >= SEASON_DAYS) state.over = seasonResult(state);
}

export function seasonResult(state) {
  const sids = Object.keys(state.stations);
  const byImage = sids.slice().sort((a, b) => state.stations[b].image - state.stations[a].image);
  const byJury = sids.slice().sort((a, b) => state.stations[b].jury - state.stations[a].jury);
  const leader = byImage[0] === 'k7';
  const award = byJury[0] === 'k7';
  let type = 'end';
  let title = 'Saison vorbei';
  let reason;
  if (leader && award) { type = 'perfect'; title = 'Traumsaison!'; reason = 'Marktführer UND die Goldene Fernbedienung. Kanal 7½ ist zurück!'; }
  else if (award) { type = 'award'; title = 'Goldene Fernbedienung!'; reason = `Die Jury liebt dein Programm. Marktführer ist aber ${STATIONS[byImage[0]].name}.`; }
  else if (leader) { type = 'leader'; title = 'Marktführer!'; reason = `Die meisten Zuschauer gehören dir. Den Jurypreis holt allerdings ${STATIONS[byJury[0]].name}.`; }
  else reason = `${STATIONS[byImage[0]].name} ist Marktführer, die Goldene Fernbedienung geht an ${STATIONS[byJury[0]].name}. Nächste Saison wird alles besser!`;
  return { type, title, reason, byImage, byJury };
}

export function nextDay(state) {
  if (state.over) return;
  state.day++;
  startDay(state);
}

// ------------------------------------------------------------------ Aktionen (Spieler & KI)
export function buyProgram(state, sid, pid) {
  const p = state.programs[pid];
  const st = state.stations[sid];
  const price = programPrice(p);
  if (p.owner) return { ok: false, msg: 'Schon verkauft.' };
  if (st.money < price) return { ok: false, msg: 'Nicht genug Geld.' };
  st.money -= price;
  p.owner = sid;
  state.market = state.market.filter((x) => x !== pid);
  return { ok: true, msg: `„${p.t}“ gekauft.` };
}

export function sellProgram(state, sid, pid) {
  const p = state.programs[pid];
  const st = state.stations[sid];
  if (p.owner !== sid) return { ok: false };
  const v = sellPrice(state, pid);
  st.money += v;
  p.owner = PROGRAMS.some((x) => x.id === pid) ? null : 'gone';
  for (const slot of st.schedule) if (slot.prog === pid) slot.prog = null;
  return { ok: true, msg: `„${p.t}“ für ${fmtMoney(v)} verkauft.` };
}

export function acceptContract(state, sid, cid) {
  const st = state.stations[sid];
  const c = state.adOffers.find((x) => x.id === cid);
  if (!c) return { ok: false, msg: 'Angebot weg.' };
  if (st.contracts.length >= MAX_CONTRACTS) return { ok: false, msg: `Maximal ${MAX_CONTRACTS} Verträge gleichzeitig.` };
  c.owner = sid;
  c.deadlineDay = state.day + c.days - 1;
  st.contracts.push(c);
  state.adOffers = state.adOffers.filter((x) => x.id !== cid);
  return { ok: true, msg: `Vertrag mit ${c.brand} unterschrieben.` };
}

export function buyNews(state, sid, nid) {
  const st = state.stations[sid];
  const n = state.news.find((x) => x.id === nid);
  if (!n) return { ok: false, msg: 'Meldung weg.' };
  if (st.newsBought.length >= MAX_NEWS) return { ok: false, msg: `Maximal ${MAX_NEWS} Meldungen pro Abend.` };
  if (state.minute >= 20 * 60) return { ok: false, msg: '📰 ⏰ 20:00 vorbei' };
  if (st.money < n.price) return { ok: false, msg: 'Nicht genug Geld.' };
  st.money -= n.price;
  st.newsBought.push(n);
  state.news = state.news.filter((x) => x.id !== nid);
  return { ok: true, msg: 'Meldung gekauft.' };
}

export function buyGift(state, sid, gid) {
  const g = GIFTS.find((x) => x.id === gid);
  const st = state.stations[sid];
  if (st.money < g.price) return { ok: false, msg: 'Nicht genug Geld.' };
  st.money -= g.price;
  st.gifts.push(gid);
  return { ok: true, msg: `${g.name} gekauft.` };
}

export function giveGift(state, sid, gid) {
  const st = state.stations[sid];
  const i = st.gifts.indexOf(gid);
  if (i < 0) return { ok: false };
  st.gifts.splice(i, 1);
  const g = GIFTS.find((x) => x.id === gid);
  const n = state.jury.giftsToday[sid] || 0;
  const gain = g.jury / (1 + n);
  state.jury.giftsToday[sid] = n + 1;
  st.jury += gain;
  return { ok: true, gain, msg: n ? 'Sie lächelt höflich. (Zweites Geschenk heute zählt weniger.)' : 'Sie strahlt!' };
}

export function prank(state, sid, prankId, target) {
  const pr = PRANKS.find((x) => x.id === prankId);
  const st = state.stations[sid];
  if (st.money < pr.price) return { ok: false, msg: 'Nicht genug Geld.' };
  st.money -= pr.price;
  const caught = rngNext(state) < 0.25;
  let msg = '';
  if (prankId === 'confetti') {
    state.roomLocks[STATIONS[target].office] = state.minute + 60;
    state.stations[target].debuff.confetti = state.minute + 60;
    msg = `Konfetti-Alarm bei ${STATIONS[target].name}!`;
  } else {
    state.stations[target].debuff.antenna = true;
    msg = `Bildstörung bei ${STATIONS[target].name} heute zur Primetime.`;
  }
  if (caught) {
    const loss = Math.min(2, st.image);
    st.image -= loss;
    state.stations[target].image += loss;
    msg += ` Aber du wurdest erwischt! −${loss} Image.`;
  }
  return { ok: true, caught, msg };
}

export function takeLoan(state, sid) {
  const st = state.stations[sid];
  if (st.loan + LOAN_STEP > LOAN_MAX) return { ok: false, msg: 'Kreditrahmen ausgeschöpft.' };
  st.loan += LOAN_STEP;
  st.money += LOAN_STEP;
  return { ok: true, msg: `${fmtMoney(LOAN_STEP)} Kredit erhalten.` };
}
export function repayLoan(state, sid) {
  const st = state.stations[sid];
  const v = Math.min(st.loan, LOAN_STEP);
  if (!v) return { ok: false, msg: 'Kein Kredit offen.' };
  if (st.money < v) return { ok: false, msg: 'Nicht genug Geld.' };
  st.loan -= v;
  st.money -= v;
  return { ok: true, msg: `${fmtMoney(v)} zurückgezahlt.` };
}

export function bossGoal(state) {
  if (state.boss.goal && state.boss.goal.day === state.day) return state.boss.goal;
  const tier = Math.min(2, Math.floor((state.day - 1) / 5));
  const tpl = pick(state, BOSS_GOALS);
  const n = tpl.n[tier];
  state.boss.goal = { id: tpl.id, n, day: state.day, text: tpl.t.replace('{n}', n.toLocaleString('de-DE')), reward: 20000 + tier * 12000 };
  return state.boss.goal;
}

// ------------------------------------------------------------------ KI-Rivalen
const AI = {
  k7: { genres: {}, hypeW: 1.0, juryW: 0.8, prank: 0.2, gifts: 0.3, news: 2 },
  trash: { genres: { reality: 1.6, show: 1.3, comedy: 1.2, anim: 1.1, sport: 1.1 }, hypeW: 1.6, juryW: 0.1, prank: 0.45, gifts: 0.05, news: 1 },
  prestige: { genres: { drama: 1.5, docu: 1.5, crime: 1.2, talk: 1.2, scifi: 1.0 }, hypeW: 0.6, juryW: 1.4, prank: 0.0, gifts: 0.5, news: 2 },
};

/** Welche Räume besucht die KI heute (in Reihenfolge)? */
export function aiDayPlan(state, sid) {
  const cfg = AI[sid];
  const plan = [];
  if (rngNext(state) < 0.7) plan.push('newsroom');
  plan.push('market');
  plan.push('ads');
  if (state.day > 1 && rngNext(state) < cfg.prank) plan.push('hausmeister');
  if (rngNext(state) < cfg.gifts) plan.push('kiosk', 'jury');
  plan.push(STATIONS[sid].office);
  const office = STATIONS[sid].office;
  // gelegentlich andere Reihenfolge
  const mid = shuffle(state, plan.filter((r) => r !== office));
  return [...mid, office];
}

function aiValue(state, sid, p) {
  const cfg = AI[sid];
  const g = cfg.genres[p.g] || 0.8;
  let best = 0;
  for (let hi = 0; hi < HOURS.length; hi++) best = Math.max(best, estimate(state, sid, p.id, hi).total);
  return best * g * (1 + p.hype * cfg.hypeW) + GENRES[p.g].jury * cfg.juryW * p.q / 25;
}

/** KI betritt einen Raum: entscheidet und gibt die Verweildauer (Spielminuten) zurück. */
export function aiEnterRoom(state, sid, room) {
  const st = state.stations[sid];
  const log = (m) => state.log.push({ day: state.day, minute: state.minute, sid, m });
  if (room === 'market') {
    const reserve = 60000;
    if (archive(state, sid).length >= 14) return rint(state, 15, 25);
    const offers = state.market.map((id) => state.programs[id]).filter((p) => programPrice(p) <= st.money - reserve);
    if (offers.length) {
      offers.sort((a, b) => aiValue(state, sid, b) - aiValue(state, sid, a));
      const best = offers[0];
      buyProgram(state, sid, best.id);
      log(`kauft „${best.t}“`);
    }
    // altes Zeug loswerden
    const arc = archive(state, sid);
    if (arc.length > 12) {
      const worst = arc.sort((a, b) => a.q * a.fresh - b.q * b.fresh)[0];
      sellProgram(state, sid, worst.id);
    }
    return rint(state, 25, 45);
  }
  if (room === 'ads') {
    // Kapazität: wie viele Slots des aktuellen Plans schaffen welche Mindestquote?
    const est = st.schedule.map((slot, hi) => (slot.prog ? estimate(state, sid, slot.prog, hi) : null)).filter(Boolean);
    const free = est.slice();
    const fits = (c) => {
      const need = c.spots - c.done;
      const days = c.deadlineDay ? c.deadlineDay - state.day + 1 : c.days;
      const ok = free.filter((e) => (c.group ? e.byGroup[c.group] : e.total) >= c.minM * 1.25);
      return ok.length * days >= need * 1.5 ? ok.slice(0, Math.ceil(need / days)) : null;
    };
    for (const c of st.contracts) { const u = fits(c); if (u) u.forEach((e) => free.splice(free.indexOf(e), 1)); }
    const offers = state.adOffers.slice().sort((a, b) => b.reward / b.spots - a.reward / a.spots);
    let n = 0;
    for (const c of offers) {
      if (st.contracts.length >= 3 || n >= 2) break;
      const u = fits(c);
      if (!u) continue;
      u.forEach((e) => free.splice(free.indexOf(e), 1));
      acceptContract(state, sid, c.id);
      n++;
    }
    return rint(state, 20, 35);
  }
  if (room === 'newsroom') {
    const cfg = AI[sid];
    const ns = state.news.slice().sort((a, b) => b.q - a.q);
    for (let i = 0; i < cfg.news && ns[i] && st.money > 40000; i++) buyNews(state, sid, ns[i].id);
    return rint(state, 15, 25);
  }
  if (room === 'hausmeister') {
    if (st.money > 120000) {
      const others = Object.keys(state.stations).filter((x) => x !== sid);
      const target = others.includes('k7') && rngNext(state) < 0.7 ? 'k7' : pick(state, others);
      const pr = rngNext(state) < 0.5 ? 'confetti' : 'antenna';
      const r = prank(state, sid, pr, target);
      log(r.msg);
      if (target === 'k7') state.pendingNotices = [...(state.pendingNotices || []), { sid, prank: pr, caught: r.caught }];
    }
    return rint(state, 15, 25);
  }
  if (room === 'kiosk') {
    if (st.money > 100000) buyGift(state, sid, rngNext(state) < 0.5 ? 'pralines' : 'flowers');
    return rint(state, 10, 20);
  }
  if (room === 'jury') {
    while (st.gifts.length) giveGift(state, sid, st.gifts[0]);
    return rint(state, 20, 30);
  }
  if (room === STATIONS[sid].office) {
    aiPlanSchedule(state, sid);
    return rint(state, 40, 70);
  }
  return 15;
}

export function aiPlanSchedule(state, sid) {
  const st = state.stations[sid];
  const cfg = AI[sid];
  const arc = archive(state, sid);
  const used = new Set();
  const cand = [];
  const locked = (hi) => slotLocked(state, hi);
  st.schedule.forEach((slot, hi) => { if (locked(hi) && slot.prog) used.add(slot.prog); });
  for (const p of arc) for (let hi = 0; hi < HOURS.length; hi++) {
    if (locked(hi)) continue;
    const e = estimate(state, sid, p.id, hi).total;
    const jury = HOURS[hi] >= 20 && HOURS[hi] <= 22 ? GENRES[p.g].jury * cfg.juryW * p.q / 60 : 0;
    cand.push({ pid: p.id, hi, score: e * (cfg.genres[p.g] || 0.9) + jury, e });
  }
  cand.sort((a, b) => b.score - a.score);
  const filled = HOURS.map((_, hi) => (locked(hi) ? { pid: st.schedule[hi].prog, hi, e: 0, keep: true } : null));
  for (const c of cand) {
    if (filled[c.hi] || used.has(c.pid)) continue;
    filled[c.hi] = c;
    used.add(c.pid);
  }
  // Falls Archiv zu klein: Lücken mit bestem verfügbaren füllen (Wiederholung)
  for (let hi = 0; hi < HOURS.length; hi++) {
    if (!filled[hi]) {
      const c = cand.find((x) => x.hi === hi);
      filled[hi] = c || null;
    }
  }
  st.schedule.forEach((slot, hi) => { if (locked(hi)) return; slot.prog = filled[hi]?.pid || null; slot.ad = null; });
  // Werbung verteilen
  const contracts = st.contracts.slice().sort((a, b) => a.deadlineDay - b.deadlineDay);
  for (const c of contracts) {
    let need = c.spots - c.done;
    const slots = HOURS.map((_, hi) => hi).sort((a, b) => (filled[b]?.e || 0) - (filled[a]?.e || 0));
    for (const hi of slots) {
      if (need <= 0) break;
      if (locked(hi) || st.schedule[hi].ad || !filled[hi] || !filled[hi].pid) continue;
      const est = estimate(state, sid, filled[hi].pid, hi);
      const v = c.group ? est.byGroup[c.group] : est.total;
      if (v >= c.minM * 1.1) { st.schedule[hi].ad = c.id; need--; }
    }
  }
}

// ------------------------------------------------------------------ Social Feed
export function comment(state, hourResult, sid) {
  const per = hourResult.per[sid];
  const avg = Object.values(hourResult.per).reduce((a, p) => a + p.viewers, 0) / 3;
  const pool = per.viewers > avg * 1.15 ? COMMENTS.good : per.viewers < avg * 0.8 ? COMMENTS.bad : COMMENTS.meh;
  const tpl = pick(state, per.ad && rngNext(state) < 0.25 ? COMMENTS.ad : pool);
  return tpl.replace('{t}', per.title).replace('{s}', STATIONS[sid].name).replace('{b}', per.ad?.brand || 'Werbe');
}

export function serialize(state) { return JSON.stringify(state); }
export function deserialize(s) { return JSON.parse(s); }
