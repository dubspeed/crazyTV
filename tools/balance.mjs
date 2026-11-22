// Headless-Balancing: node tools/balance.mjs [spiele]
import { newGame, simulateEvening, nextDay, aiDayPlan, aiEnterRoom, aiPlanSchedule, fmtMoney } from '../web/src/sim.js';
const N = +(process.argv[2] || 20);
function play(seed, mode) {
  const s = newGame(seed);
  while (!s.over) {
    if (mode === 'ai') aiPlanSchedule(s, 'k7'); // KI-K7½ plant morgens vor wie die Rivalen
    for (const sid of (s.day % 2 ? ['trash', 'prestige', ...(mode === 'ai' ? ['k7'] : [])] : [...(mode === 'ai' ? ['k7'] : []), 'prestige', 'trash']))
      for (const r of aiDayPlan(s, sid)) aiEnterRoom(s, sid, r);
    simulateEvening(s);
    if (!s.over) nextDay(s);
  }
  return s;
}
for (const mode of ['idle', 'ai']) {
  const agg = { k7: [0, 0, 0, 0], trash: [0, 0, 0, 0], prestige: [0, 0, 0, 0] }; const ends = {};
  for (let i = 0; i < N; i++) {
    const s = play(1000 + i, mode);
    ends[s.over.type] = (ends[s.over.type] || 0) + 1;
    for (const [sid, st] of Object.entries(s.stations)) {
      const a = agg[sid]; a[0] += st.money / N; a[1] += st.image / N; a[2] += st.jury / N;
      a[3] += s.history.reduce((x, h) => x + h.viewers[sid], 0) / s.history.length / N;
    }
    if (i === 0) console.log(mode, 'Tage gespielt:', s.day, s.over.type, s.over.reason || '');
  }
  console.log(`\n== ${mode} == Ausgang:`, ends);
  for (const [sid, a] of Object.entries(agg)) console.log(sid.padEnd(9), 'Geld', fmtMoney(a[0]).padStart(12), ' Image', a[1].toFixed(1), ' Jury', a[2].toFixed(1), ' Ø Zuschauer/Abend', a[3].toFixed(1), 'Mio.');
}
