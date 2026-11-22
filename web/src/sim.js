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

// ------------------------------------------------------------------ Buchungen
/** Jede Geldbewegung wird sofort gebucht und (für den Spieler) im Tagesjournal festgehalten. */
export function book(state, sid, amount, kind, label = '') {
  amount = Math.round(amount);
  if (!amount) return;
  state.stations[sid].money += amount;
  (state.journal ||= []).push({ sid, m: Math.floor(state.minute), amount, kind, label });
}
export const JOURNAL_KINDS = {
  base: 'Werbeerlöse', ad: 'Werbeverträge', bonus: 'Bonus 🎯', sell: 'Verkäufe', loan: 'Kredit',
  buy: 'Einkäufe', news: 'Nachrichten', gift: 'Geschenke', prank: 'Streiche', penalty: 'Strafen',
  cost: 'Betriebskosten', interest: 'Zinsen', repay: 'Tilgung',
};
export function journalSum(state, sid = 'k7') {
  const out = {};
  for (const e of state.journal || []) if (e.sid === sid) out[e.kind] = (out[e.kind] || 0) + e.amount;
  return out;
}

// ------------------------------------------------------------------ Programme
export const progLen = (p) => p.l || 1;
export function programPrice(p) {
  return round((p.q * p.q * 9 + p.h * 70000) * (0.55 + 0.45 * progLen(p)) + (p.k === 'film' ? 12000 : 0) + 6000);
}
export function sellPrice(state, pid) {
  const p = state.programs[pid];
  return round(programPrice(p) * 0.45 * (0.4 + 0.6 * p.fresh));
}

// ------------------------------------------------------------------ Serien: Staffeln mit Folgen
function initEpisodes(p) {
  if (p.k !== 'serie') return p;
  const hash = [...p.id].reduce((a, c) => a + c.charCodeAt(0), 0);
  p.eps = p.e || 6 + (hash % 8); // 6–13 Folgen
  p.epNext = 0;
  p.epFresh = Array(p.eps).fill(p.fresh);
  p.bond = 0;
  return p;
}

// ------------------------------------------------------------------ Neues Spiel
export function newGame(seed = (Date.now() % 1e9) | 0) {
  const state = {
    version: 3,
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
  for (const p of PROGRAMS) state.programs[p.id] = initEpisodes({ ...p, owner: null, fresh: 1, hype: p.h, airings: 0 });
  for (const sid of Object.keys(STATIONS)) {
    for (const p of STARTERS[sid]) state.programs[p.id] = initEpisodes({ ...p, owner: sid, fresh: 0.75, hype: p.h, airings: 3 });
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
      schedule: HOURS.map(() => ({ prog: null, part: 0, ad: null })),
    };
    // Startplan: Starter der Reihe nach
    const own = STARTERS[sid].map((p) => p.id);
    let hi = 0;
    for (const pid of own) if (placeProgram(state, sid, pid, hi, true).ok) hi += progLen(state.programs[pid]);
    for (const pid of own) if (hi < HOURS.length && progLen(state.programs[pid]) === 1 && placeProgram(state, sid, pid, hi, true).ok) hi++;
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
  state.journal = [];
  for (const st of Object.values(state.stations)) {
    st.newsBought = [];
    st.debuff = {};
    st.dayStartMoney = st.money;
    book(state, st.id, -DAILY_COST, 'cost', 'Miete & Gehälter');
    if (st.loan) book(state, st.id, -st.loan * LOAN_RATE, 'interest', 'Kreditzinsen');
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
  if (!opts.future && state.trend && state.trend.g === p.g) a *= 1.25;
  if (opts.bond) a *= 1 + 0.6 * opts.bond; // Stammpublikum einer Serie
  a *= opts.cont ? 1 + 1.1 * leadShare : 1 + 0.4 * leadShare; // laufende Sendung hält ihr Publikum über die Werbepause
  if (h === 20) a *= newsMul(state, sid);
  const st = state.stations[sid];
  if (st.debuff.antenna && h >= 20 && h <= 21) a *= 0.7;
  if (p.g === 'anim' && g === 'fam' && h >= 22 && !state.event?.mod?.famLate) a *= 0.4;
  return a;
}

/** Schätzung für den Programmplaner: Zuschauer (Mio.) gegen durchschnittliche Konkurrenz. */
export function estimate(state, sid, pid, hi, cont = false, extra = {}) {
  let total = 0;
  const byGroup = {};
  for (const g of GROUP_KEYS) {
    const a = attraction(state, sid, pid, hi, g, cont ? 0.3 : 0.15, { cont, ...extra });
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
    const cont = !!slot.prog && slot.part > 0 && state.stations[s].schedule[hi - 1]?.prog === slot.prog;
    const P0 = slot.prog ? state.programs[slot.prog] : null;
    const xo = { cont };
    if (P0 && P0.eps) {
      xo.fresh = P0.epFresh[P0.epNext];
      const start = hi - (slot.part || 0);
      xo.bond = slot.part ? P0.bond : (P0.bondSlot === start && P0.bondDay === state.day - 1 ? Math.min(1, P0.bond + 0.15) : P0.bondSlot === start && P0.bondDay === state.day ? P0.bond : 0.1);
    }
    for (const g of GROUP_KEYS) attrs[s][g] = attraction(state, s, slot.prog, hi, g, prevShare[s][g], xo);
    attrs[s]._bond = xo.bond;
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
    per[s].part = slot.part || 0;
    per[s].len = P ? progLen(P) : 1;
    if (P && P.eps) {
      per[s].ep = P.epNext + 1;
      per[s].eps = P.eps;
      per[s].rerun = (P.season || 0) > 0 || P.epFresh[P.epNext] < 0.9;
      per[s].bond = attrs[s]._bond;
    }
    if (P && !slot.part) {
      if (P.lastAiredDay === state.day) summary[s].repeats++;
      P.lastAiredDay = state.day;
      P.airings++;
      P.hype = Math.max(0, P.hype - 0.08);
    }
    if (P && P.eps) {
      // Serie: Folge nutzt sich ab, nach dem letzten Block der Folge kommt die nächste
      const e = P.epNext;
      P.epFresh[e] = Math.max(0.1, P.epFresh[e] - 0.5 / progLen(P));
      if ((slot.part || 0) === progLen(P) - 1) {
        P.bond = attrs[s]._bond; P.bondDay = state.day; P.bondSlot = hi - (slot.part || 0);
        P.epNext = (e + 1) % P.eps;
        if (P.epNext === 0) P.season = (P.season || 0) + 1;
      }
      P.fresh = P.epFresh[P.epNext];
    } else if (P) {
      // Frische sinkt pro Ausstrahlung (verteilt auf die Blöcke)
      P.fresh = Math.max(0.1, P.fresh - (P.k === 'film' ? 0.35 : 0.18) / progLen(P));
    }
    if (P) {
      if (h >= 20 && h <= 22) {
        const jg = Math.pow(P.q / 100, 2) * GENRES[P.g].jury * 4 * (0.4 + 0.6 * P.fresh);
        st.jury += jg;
        summary[s].juryGain += jg;
      }
    }
  }
  // Sofort buchen: allgemeine Werbeerlöse, News-Jury um 20 Uhr, Verträge aufräumen, Strafen
  for (const s of sids) {
    const st = state.stations[s];
    const base = per[s].viewers * VIEWER_REVENUE;
    book(state, s, base, 'base', hourLabel(h));
    per[s].base = Math.round(base);
    summary[s].baseIncome = (summary[s].baseIncome || 0) + Math.round(base);
    if (h === 20) {
      const nj = st.newsBought.reduce((a, n) => a + n.q * (n.topic === 'kultur' || n.topic === 'politik' ? 1.5 : 1), 0) / 45;
      st.jury += nj;
      summary[s].juryGain += nj;
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

/** Werbeblock (:55–:00) einer Stunde auswerten: Teilzahlung je erfolgreichem Spot, Strafen bei verpasster Frist. */
export function airAd(state, hi) {
  const eve = ensureBroadcast(state);
  while (eve.hi < hi) simulateHour(state, eve.hi + 1);
  if ((eve.adDone ?? -1) >= hi) return eve.hours[hi];
  while ((eve.adDone ?? -1) < hi - 1) airAd(state, (eve.adDone ?? -1) + 1);
  eve.adDone = hi;
  const H = eve.hours[hi];
  const hoursLeft = HOURS.length - 1 - hi;
  for (const s of Object.keys(state.stations)) {
    const st = state.stations[s];
    const per = H.per[s];
    const sum = eve.summary[s];
    const slot = st.schedule[hi];
    const c = slot.ad && st.contracts.find((x) => x.id === slot.ad);
    if (c && c.done < c.spots && per.prog) {
      const v = c.group ? per.byGroup[c.group] : per.viewers;
      const ok = v >= c.minM;
      per.ad = { brand: c.brand, ok, need: c.minM, got: v, group: c.group, spot: c.done + 1, spots: c.spots };
      if (ok) {
        c.done++;
        const pay = c.done >= c.spots ? c.reward - (c.paid || 0) : Math.round(c.reward / c.spots);
        c.paid = (c.paid || 0) + pay;
        book(state, s, pay, 'ad', `${c.brand} ${c.done}/${c.spots}`);
        sum.adIncome += pay;
        sum.adOk++;
        per.ad.paid = pay;
        if (c.done >= c.spots) c.completed = true;
      } else sum.adFail++;
    }
    for (const k of st.contracts) {
      if (k.completed) continue;
      if (k.deadlineDay <= state.day && k.spots - k.done > hoursLeft) {
        book(state, s, -k.penalty, 'penalty', k.brand);
        sum.penalties += k.penalty;
        k.expired = true;
        (per.penalties ||= []).push({ brand: k.brand, amount: k.penalty, done: k.done, spots: k.spots });
      }
    }
    st.contracts = st.contracts.filter((k) => !k.completed && !k.expired);
    for (const sl of st.schedule) if (sl.ad && !st.contracts.some((k) => k.id === sl.ad)) sl.ad = null;
  }
  return H;
}

/** Darf der Werbespot dieser Stunde noch geändert werden? (bis zum Beginn des Werbeblocks um :55) */
export function adLocked(state, hi) {
  if (!state.eve || state.eve.day !== state.day) return false;
  if ((state.eve.adDone ?? -1) >= hi) return true;
  return state.minute >= AIR_START + hi * 60 + 55;
}

/** Tagesabschluss nach 01:00 Uhr. */
export function finishDay(state) {
  const eve = ensureBroadcast(state);
  for (let hi = eve.hi + 1; hi < HOURS.length; hi++) simulateHour(state, hi);
  airAd(state, HOURS.length - 1);
  const sids = Object.keys(state.stations);
  const { hours, summary } = eve;
  // Chefin-Ziel
  let bossResult = null;
  const goal = state.boss.goal;
  if (goal && goal.day === state.day) {
    const k = summary.k7;
    const val = goal.id === 'prime' ? k.prime : goal.id === 'wins' ? k.hoursWon : goal.id === 'ads' ? k.adOk : k.viewers;
    const ok = val >= goal.n;
    if (ok) {
      book(state, 'k7', goal.reward, 'bonus', 'Tagesziel');
      state.boss.mood = Math.min(3, state.boss.mood + 1);
    } else state.boss.mood -= 1;
    bossResult = { ok, goal, val };
  }

  for (const s of sids) {
    const st = state.stations[s];
    summary[s].imageAfter = st.image;
    summary[s].moneyAfter = st.money;
    summary[s].moneyBefore = st.dayStartMoney ?? summary[s].moneyBefore;
    summary[s].jury = st.jury;
  }

  // Frische erholt sich über Nacht
  for (const p of Object.values(state.programs)) {
    if (p.eps) { p.epFresh = p.epFresh.map((f) => Math.min(1, f + 0.08)); p.fresh = p.epFresh[p.epNext]; }
    else p.fresh = Math.min(1, p.fresh + 0.08);
  }

  const result = { day: state.day, journal: journalSum(state, 'k7'), hours, summary, bossResult, headline: headline(state, hours, summary), event: state.event, trend: state.trend };
  state.lastResults = result;
  state.eve = null;
  state.history.push({ day: state.day, viewers: Object.fromEntries(sids.map((s) => [s, summary[s].viewers])), image: Object.fromEntries(sids.map((s) => [s, state.stations[s].image])) });
  state.phase = 'summary';
  checkEnd(state, summary);
  return result;
}


export function simulateEvening(state) {
  for (let hi = 0; hi < HOURS.length; hi++) { simulateHour(state, hi); airAd(state, hi); }
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
  const day = state.day + 1;
  for (const sid of Object.keys(state.stations)) {
    const st = state.stations[sid];
    st.future ||= {};
    st.schedule = st.future[day] || HOURS.map(() => ({ prog: null, part: 0, ad: null }));
    for (const d of Object.keys(st.future)) if (+d <= day) delete st.future[d];
  }
  state.day = day;
  startDay(state);
  // KI-Sender planen morgens einen Grundplan (später im Büro wird nachgebessert)
  for (const sid of Object.keys(state.stations)) if (sid !== 'k7') aiPlanSchedule(state, sid);
}

// ------------------------------------------------------------------ Programmplan (Blöcke, mehrere Tage)
export const PLAN_DAYS = 6; // so viele Tage im Voraus planbar

function contractValid(st, cid, day) {
  const c = st.contracts.find((x) => x.id === cid);
  return !!c && !c.completed && c.deadlineDay >= day;
}
const emptyPlan = () => HOURS.map(() => ({ prog: null, part: 0, ad: null }));
/** Plan eines Tages (heute = aktueller Plan; Zukunft: eigener Plan oder leer). */
export function planFor(state, sid, day = state.day) {
  const st = state.stations[sid];
  if (day <= state.day) return st.schedule;
  return st.future?.[day] || emptyPlan();
}
export function hasOwnPlan(state, sid, day) {
  return day <= state.day || !!state.stations[sid].future?.[day];
}
/** Plan zum Bearbeiten holen (legt für künftige Tage einen leeren Plan an). */
export function editPlan(state, sid, day = state.day) {
  const st = state.stations[sid];
  if (day <= state.day) return st.schedule;
  st.future ||= {};
  if (!st.future[day]) st.future[day] = emptyPlan();
  return st.future[day];
}

/** Startstunde und Länge der Sendung, die in Stunde hi liegt (oder null). */
export function instanceAt(state, sid, hi, day = state.day) {
  const c = planFor(state, sid, day)[hi];
  if (!c || !c.prog) return null;
  return { pid: c.prog, start: hi - c.part, len: progLen(state.programs[c.prog]) };
}

/** Gesperrt: schon gesendet oder Teil einer Sendung, die bereits begonnen hat (nur heute). */
export function cellLocked(state, sid, hi, day = state.day) {
  if (day !== state.day) return false;
  if (!state.eve || state.eve.day !== state.day || state.eve.hi < 0) return false;
  if (hi <= state.eve.hi) return true;
  const inst = instanceAt(state, sid, hi);
  return !!inst && inst.start <= state.eve.hi;
}

export function gapAt(state, sid, hi, ignoreStart = null, day = state.day) {
  let n = 0;
  for (let i = hi; i < HOURS.length; i++) {
    const inst = instanceAt(state, sid, i, day);
    if (cellLocked(state, sid, i, day) || (inst && inst.start !== ignoreStart)) break;
    n++;
  }
  return n;
}

export function canPlace(state, sid, pid, hi, ignoreStart = null, day = state.day) {
  return progLen(state.programs[pid]) <= gapAt(state, sid, hi, ignoreStart, day);
}

function clearInstance(plan, start, len) {
  for (let i = start; i < start + len && i < HOURS.length; i++) { plan[i].prog = null; plan[i].part = 0; }
}
function putInstance(plan, pid, hi, len) {
  for (let i = 0; i < len; i++) { plan[hi + i].prog = pid; plan[hi + i].part = i; }
}

export function removeAt(state, sid, hi, day = state.day) {
  const inst = instanceAt(state, sid, hi, day);
  if (!inst || cellLocked(state, sid, inst.start, day)) return { ok: false };
  clearInstance(editPlan(state, sid, day), inst.start, inst.len);
  return { ok: true };
}

/** Sendung ab Stunde hi einplanen (nur in freie Blöcke). */
export function placeProgram(state, sid, pid, hi, force = false, replaceStart = null, day = state.day) {
  const len = progLen(state.programs[pid]);
  if (!force && !canPlace(state, sid, pid, hi, replaceStart, day)) return { ok: false, msg: `⏱ ${len} Std. – passt nicht` };
  if (hi + len > HOURS.length) return { ok: false };
  const plan = editPlan(state, sid, day);
  if (replaceStart !== null) { const old = instanceAt(state, sid, replaceStart, day); if (old) clearInstance(plan, old.start, old.len); }
  putInstance(plan, pid, hi, len);
  return { ok: true };
}

/** Drag & Drop: Sendung ab hi ablegen. fromStart = verschobene Sendung. Überlappende (ungesperrte) Sendungen fliegen raus. */
export function dropProgram(state, sid, pid, hi, fromStart = null, day = state.day) {
  if (!dropFits(state, sid, pid, hi, fromStart, day)) return { ok: false, msg: '🔒' };
  const len = progLen(state.programs[pid]);
  const plan = editPlan(state, sid, day);
  if (fromStart !== null) { const old = instanceAt(state, sid, fromStart, day); if (old) clearInstance(plan, old.start, old.len); }
  const bumped = [];
  for (let i = hi; i < hi + len; i++) {
    const inst = instanceAt(state, sid, i, day);
    if (inst) { bumped.push(inst.pid); clearInstance(plan, inst.start, inst.len); }
  }
  putInstance(plan, pid, hi, len);
  return { ok: true, bumped };
}

export function dropFits(state, sid, pid, hi, fromStart = null, day = state.day) {
  const len = progLen(state.programs[pid]);
  if (hi < 0 || hi + len > HOURS.length) return false;
  for (let i = hi; i < hi + len; i++) {
    const inst = instanceAt(state, sid, i, day);
    if (cellLocked(state, sid, i, day) && !(inst && inst.start === fromStart)) return false;
  }
  return true;
}

export function bestGap(state, sid, pid, day = state.day) {
  let best = null;
  for (let hi = 0; hi < HOURS.length; hi++) {
    if (!canPlace(state, sid, pid, hi, null, day)) continue;
    const e = estimateBlock(state, sid, pid, hi, day);
    if (!best || e > best.e) best = { hi, e };
  }
  return best;
}

/** Werbespot für Tag/Stunde setzen (null = leeren). */
export function setAd(state, sid, hi, cid, day = state.day) {
  if (day === state.day && adLocked(state, hi)) return { ok: false };
  if (cid && !contractValid(state.stations[sid], cid, day)) return { ok: false, msg: '⏳' };
  editPlan(state, sid, day)[hi].ad = cid;
  return { ok: true };
}

/** Welche Folge (0-basiert) läuft an Tag/Stunde? Zählt alle noch ungesendeten Ausstrahlungen davor. */
export function expectedEpisode(state, sid, pid, day, hi) {
  const p = state.programs[pid];
  if (!p.eps) return null;
  let n = 0;
  const firstOpen = state.eve && state.eve.day === state.day ? state.eve.hi + 1 : 0;
  for (let d = state.day; d <= day; d++) {
    const plan = planFor(state, sid, d);
    for (let i = d === state.day ? firstOpen : 0; i < HOURS.length; i++) {
      if (d === day && i >= hi) break;
      if (plan[i].prog === pid && plan[i].part === 0) n++;
    }
  }
  return (p.epNext + n) % p.eps;
}

/** Serie täglich zur gleichen Zeit einplanen, bis die Staffel durch ist (belegte Plätze bleiben). */
export function scheduleDaily(state, sid, pid, hi, fromDay = state.day) {
  const last = Math.min(state.day + PLAN_DAYS, SEASON_DAYS);
  let placed = 0;
  let started = false;
  for (let d = fromDay; d <= last; d++) {
    const ep = expectedEpisode(state, sid, pid, d, hi);
    const here = planFor(state, sid, d)[hi];
    if (started && ep === 0) {
      break; // Staffel durch
    }
    if (here.prog === pid && here.part === 0) { started = true; continue; }
    if (canPlace(state, sid, pid, hi, null, d)) { placeProgram(state, sid, pid, hi, false, null, d); placed++; started = true; }
  }
  return { ok: true, placed };
}

/** Stammpublikum-Prognose für eine Serie an Tag/Stunde. */
export function bondFor(state, p, hi, day = state.day) {
  if (!p.eps) return 0;
  if (p.bondSlot !== hi || p.bondDay === undefined) return 0.1;
  if (p.bondDay === day - 1) return Math.min(1, p.bond + 0.15);
  if (p.bondDay === day) return p.bond;
  if (day > state.day && p.bondDay >= state.day - 1) return Math.min(1, p.bond + 0.15 * (day - p.bondDay));
  return 0.1;
}

/** Durchschnittliche Zuschauer, wenn die Sendung ab hi läuft. */
export function estimateBlock(state, sid, pid, hi, day = state.day) {
  const p = state.programs[pid];
  const len = progLen(p);
  const opts = { future: day !== state.day, bond: bondFor(state, p, hi, day) };
  if (p.eps) { const ep = expectedEpisode(state, sid, pid, day, hi); opts.fresh = p.epFresh[ep] ?? p.fresh; }
  let t = 0, n = 0;
  for (let i = hi; i < Math.min(HOURS.length, hi + len); i++) { t += estimate(state, sid, pid, i, i > hi, opts).total; n++; }
  return n ? t / n : 0;
}

// ------------------------------------------------------------------ Aktionen (Spieler & KI)
export function buyProgram(state, sid, pid) {
  const p = state.programs[pid];
  const st = state.stations[sid];
  const price = programPrice(p);
  if (p.owner) return { ok: false, msg: 'Schon verkauft.' };
  if (st.money < price) return { ok: false, msg: 'Nicht genug Geld.' };
  book(state, sid, -price, 'buy', p.t);
  p.owner = sid;
  state.market = state.market.filter((x) => x !== pid);
  return { ok: true, msg: `„${p.t}“ gekauft.` };
}

export function sellProgram(state, sid, pid) {
  const p = state.programs[pid];
  const st = state.stations[sid];
  if (p.owner !== sid) return { ok: false };
  const v = sellPrice(state, pid);
  book(state, sid, v, 'sell', p.t);
  p.owner = PROGRAMS.some((x) => x.id === pid) ? null : 'gone';
  for (let hi = 0; hi < HOURS.length; hi++) if (st.schedule[hi].prog === pid && !cellLocked(state, sid, hi)) { st.schedule[hi].prog = null; st.schedule[hi].part = 0; }
  for (const plan of Object.values(st.future || {})) for (const c of plan) if (c.prog === pid) { c.prog = null; c.part = 0; }
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
  book(state, sid, -n.price, 'news', n.t);
  st.newsBought.push(n);
  state.news = state.news.filter((x) => x.id !== nid);
  return { ok: true, msg: 'Meldung gekauft.' };
}

export function buyGift(state, sid, gid) {
  const g = GIFTS.find((x) => x.id === gid);
  const st = state.stations[sid];
  if (st.money < g.price) return { ok: false, msg: 'Nicht genug Geld.' };
  book(state, sid, -g.price, 'gift', g.name);
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
  book(state, sid, -pr.price, 'prank', pr.name);
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
  book(state, sid, LOAN_STEP, 'loan', 'Kredit');
  return { ok: true, msg: `${fmtMoney(LOAN_STEP)} Kredit erhalten.` };
}
export function repayLoan(state, sid) {
  const st = state.stations[sid];
  const v = Math.min(st.loan, LOAN_STEP);
  if (!v) return { ok: false, msg: 'Kein Kredit offen.' };
  if (st.money < v) return { ok: false, msg: 'Nicht genug Geld.' };
  st.loan -= v;
  book(state, sid, -v, 'repay', 'Tilgung');
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
  const locked = (hi) => cellLocked(state, sid, hi);
  const used = new Set();
  st.schedule.forEach((slot, hi) => {
    if (locked(hi)) { if (slot.prog) used.add(slot.prog); return; }
    slot.prog = null; slot.part = 0;
    if (!adLocked(state, hi)) slot.ad = null;
  });
  const score = (p, hi) => {
    const e = estimateBlock(state, sid, p.id, hi);
    const prime = HOURS[hi] >= 20 && HOURS[hi] <= 22 ? GENRES[p.g].jury * cfg.juryW * p.q / 60 : 0;
    return { e, s: (e * (cfg.genres[p.g] || 0.9) + prime) * (1 + 0.04 * (progLen(p) - 1)) };
  };
  const cand = [];
  for (const p of arc) for (let hi = 0; hi < HOURS.length; hi++) if (!locked(hi)) cand.push({ p, hi, ...score(p, hi) });
  cand.sort((a, b) => b.s - a.s);
  for (const c of cand) {
    if (used.has(c.p.id) || !canPlace(state, sid, c.p.id, c.hi)) continue;
    placeProgram(state, sid, c.p.id, c.hi);
    used.add(c.p.id);
  }
  // Lücken: notfalls mit Wiederholungen füllen
  for (let hi = 0; hi < HOURS.length; hi++) {
    if (st.schedule[hi].prog || locked(hi)) continue;
    const fit = cand.find((c) => c.hi === hi && canPlace(state, sid, c.p.id, hi));
    if (fit) placeProgram(state, sid, fit.p.id, hi);
  }
  // Werbung verteilen
  const est = HOURS.map((_, hi) => (st.schedule[hi].prog ? estimate(state, sid, st.schedule[hi].prog, hi, st.schedule[hi].part > 0) : null));
  const contracts = st.contracts.slice().sort((a, b) => a.deadlineDay - b.deadlineDay);
  for (const c of contracts) {
    let need = c.spots - c.done - st.schedule.filter((sl) => sl.ad === c.id).length;
    const slots = HOURS.map((_, hi) => hi).sort((a, b) => (est[b]?.total || 0) - (est[a]?.total || 0));
    for (const hi of slots) {
      if (need <= 0) break;
      if (adLocked(state, hi) || st.schedule[hi].ad || !est[hi]) continue;
      const v = c.group ? est[hi].byGroup[c.group] : est[hi].total;
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
