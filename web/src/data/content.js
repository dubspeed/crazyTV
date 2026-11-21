// CrazyTV – Spielinhalte. Alles erfunden; Anspielungen sind Parodie.

export const STATIONS = {
  k7: { id: 'k7', name: 'Kanal 7½', short: 'K7½', color: '#19c3b1', office: 'office_k7' },
  trash: { id: 'trash', name: 'TRASH24', short: 'T24', color: '#ff4f9a', office: 'office_trash' },
  prestige: { id: 'prestige', name: 'Prestige One', short: 'P1', color: '#f0b429', office: 'office_prestige' },
};

export const HOURS = [18, 19, 20, 21, 22, 23, 24];
export const hourLabel = (h) => `${String(h % 24).padStart(2, '0')}:00`;

export const GROUPS = {
  genz: { name: 'Gen Z', size: 5, icon: '📱', usage: [0.3, 0.4, 0.6, 0.8, 0.9, 0.8, 0.6], stream: 1.0, oer: 0.12 },
  mill: { name: 'Millennials', size: 7, icon: '☕', usage: [0.4, 0.6, 0.85, 0.9, 0.8, 0.5, 0.3], stream: 0.75, oer: 0.25 },
  fam: { name: 'Familien', size: 9, icon: '🏠', usage: [0.7, 0.9, 1.0, 0.7, 0.4, 0.2, 0.1], stream: 0.45, oer: 0.35 },
  boom: { name: 'Boomer', size: 10, icon: '📰', usage: [0.8, 0.95, 1.0, 0.9, 0.6, 0.3, 0.15], stream: 0.18, oer: 0.7 },
  nerd: { name: 'Nerds', size: 3, icon: '🎮', usage: [0.3, 0.4, 0.6, 0.8, 0.9, 0.9, 0.8], stream: 0.9, oer: 0.15 },
};

// pref: Gen Z, Millennials, Familien, Boomer, Nerds · peak: beste Stunden · jury: Anspruch
export const GENRES = {
  comedy: { name: 'Komödie', icon: '😂', pref: [0.6, 0.8, 0.9, 0.7, 0.6], peak: [20, 21], jury: 0.3 },
  crime: { name: 'Krimi', icon: '🔎', pref: [0.4, 0.7, 0.5, 1.0, 0.5], peak: [20, 21, 22], jury: 0.5 },
  drama: { name: 'Drama', icon: '🎭', pref: [0.5, 0.8, 0.5, 0.8, 0.4], peak: [21, 22], jury: 1.0 },
  reality: { name: 'Reality', icon: '🌴', pref: [1.0, 0.7, 0.5, 0.3, 0.2], peak: [19, 20, 21], jury: 0.05 },
  docu: { name: 'Doku', icon: '🌍', pref: [0.3, 0.6, 0.6, 0.8, 0.9], peak: [22, 23], jury: 0.9 },
  scifi: { name: 'Sci-Fi', icon: '🚀', pref: [0.7, 0.8, 0.5, 0.3, 1.0], peak: [21, 22, 23], jury: 0.5 },
  anim: { name: 'Animation', icon: '🦄', pref: [0.8, 0.6, 1.0, 0.2, 0.9], peak: [18, 19], jury: 0.4 },
  show: { name: 'Spielshow', icon: '🎲', pref: [0.6, 0.6, 0.9, 0.9, 0.4], peak: [19, 20], jury: 0.2 },
  cook: { name: 'Kochshow', icon: '🍳', pref: [0.4, 0.7, 0.8, 0.9, 0.3], peak: [18, 19], jury: 0.3 },
  sitcom: { name: 'Sitcom', icon: '🛋️', pref: [0.7, 0.9, 0.7, 0.6, 0.7], peak: [18, 19, 23], jury: 0.3 },
  sport: { name: 'Sport', icon: '⚽', pref: [0.8, 0.6, 0.5, 0.7, 0.7], peak: [20, 21], jury: 0.2 },
  talk: { name: 'Late Night', icon: '🎙️', pref: [0.5, 0.7, 0.2, 0.6, 0.5], peak: [23, 24], jury: 0.7 },
};
export const GROUP_KEYS = Object.keys(GROUPS);

// k: film | serie | show · q: Qualität 0–100 · h: Hype 0–0.6 · l: Länge in Stundenblöcken (Standard 1)
export const PROGRAMS = [
  { id: 'p01', t: 'Love Island Exit – Gestrandet & Getrennt', g: 'reality', k: 'serie', q: 52, h: 0.5, d: 'Zwölf Singles, eine Insel, null WLAN.' },
  { id: 'p02', t: 'Tatort Kleingarten', g: 'crime', k: 'serie', q: 68, h: 0.1, d: 'Wer hat den Gartenzwerg entführt?' },
  { id: 'p03', t: 'Die Erbinnen von Hohenwalde', g: 'drama', k: 'serie', q: 88, h: 0.25, l: 1, d: 'Ein Schloss, drei Schwestern, ein Testament.' },
  { id: 'p04', t: 'Das perfekte Desaster', g: 'cook', k: 'show', q: 58, h: 0.2, d: 'Vier Gäste. Ein Rauchmelder.' },
  { id: 'p05', t: 'Stranger Schnitzel', g: 'scifi', k: 'serie', q: 80, h: 0.45, d: '80er-Jahre, Kleinstadt, Portal unter der Imbissbude.' },
  { id: 'p06', t: 'Liebe im 7. Untergeschoss', g: 'drama', k: 'serie', q: 72, h: 0.3, d: 'K-Drama-Romanze im Parkhaus.' },
  { id: 'p07', t: 'Tintenfisch-Lotto', g: 'show', k: 'show', q: 60, h: 0.6, l: 2, d: '456 Kandidaten spielen Kindergeburtstagsspiele um einen Präsentkorb.' },
  { id: 'p08', t: 'Mecha-Hausmeister Shin', g: 'anim', k: 'serie', q: 70, h: 0.25, d: 'Ein Riesenroboter, der nur den Flur wischen will.' },
  { id: 'p09', t: 'Gegen Mitternacht mit Jan Bäumerling', g: 'talk', k: 'show', q: 74, h: 0.2, d: 'Gäste, Gags und eine Hausband ohne Noten.' },
  { id: 'p10', t: 'Unboxing Deutschland', g: 'reality', k: 'show', q: 30, h: 0.35, d: 'Promis packen Pakete aus. Stundenlang.' },
  { id: 'p11', t: 'Planet Erde – Jetzt in 8K', g: 'docu', k: 'serie', q: 90, h: 0.15, d: 'Pinguine, so scharf, dass es weh tut.' },
  { id: 'p12', t: 'How I Met Your Steuerberater', g: 'sitcom', k: 'serie', q: 66, h: 0.15, d: 'Neun Staffeln Rückblende. Belege inklusive.' },
  { id: 'p13', t: 'Bundesliga der Bots', g: 'sport', k: 'show', q: 55, h: 0.4, l: 2, d: 'Roboter spielen Fußball. Elfmeter dauern 20 Minuten.' },
  { id: 'p14', t: 'Fast & Furios 14: Parkplatzsuche', g: 'comedy', k: 'film', q: 64, h: 0.5, l: 2, d: 'Die Familie kehrt zurück – und findet keinen Parkplatz.' },
  { id: 'p15', t: 'Der Hobbit-Hof', g: 'scifi', k: 'film', q: 84, h: 0.3, l: 3, d: 'Kleine Leute, großer Gemüsegarten.' },
  { id: 'p16', t: 'Bauer sucht WLAN', g: 'reality', k: 'serie', q: 45, h: 0.3, d: 'Auf dem Land ist das Signal wichtiger als die Liebe.' },
  { id: 'p17', t: 'Die Rentner-Detektive', g: 'crime', k: 'serie', q: 61, h: 0.05, d: 'Drei Senioren, ein Rollator, null Geduld.' },
  { id: 'p18', t: 'Schloss Einsteinchen', g: 'sitcom', k: 'serie', q: 57, h: 0.2, d: 'Internatsleben mit verrückten Erfindungen.' },
  { id: 'p19', t: 'Galaxy Gang: Neustart', g: 'scifi', k: 'film', q: 77, h: 0.4, l: 2, d: 'Ein Waschbär, ein Baum und ein Mixtape.' },
  { id: 'p20', t: 'Wer wird Millimeter?', g: 'show', k: 'show', q: 70, h: 0.1, d: 'Das Quiz, bei dem es um sehr kleine Beträge geht.' },
  { id: 'p21', t: 'Die Kronjuwelen (Staffel 9)', g: 'drama', k: 'serie', q: 82, h: 0.2, l: 1, d: 'Royals, Intrigen, sehr viel Tee.' },
  { id: 'p22', t: 'Tiger-König Kong', g: 'docu', k: 'serie', q: 62, h: 0.45, d: 'Ein Zoo, ein Affe, ein Haufen schräger Leute.' },
  { id: 'p23', t: 'Die Eiskönigin der Tiefkühltruhe', g: 'anim', k: 'film', q: 78, h: 0.35, l: 2, d: 'Lass jetzt los … die Fischstäbchen.' },
  { id: 'p24', t: 'Backen mit Oma Hilde', g: 'cook', k: 'show', q: 66, h: 0.1, d: 'Butter, Zucker, Weisheiten.' },
  { id: 'p25', t: 'Dschungelcamp der Influencer', g: 'reality', k: 'show', q: 48, h: 0.55, l: 2, d: 'Ohne Ringlicht. Ohne Gnade.' },
  { id: 'p26', t: 'Das Rätsel von Schloss Nebelstein', g: 'crime', k: 'film', q: 75, h: 0.15, l: 2, d: 'Ein Butler, ein Erbe, ein Knopf, der zu viel weiß.' },
  { id: 'p27', t: 'Ozean der Plastikenten', g: 'docu', k: 'film', q: 80, h: 0.2, l: 2, d: '29.000 Quietscheentchen auf Weltreise.' },
  { id: 'p28', t: 'Die Simpelsons', g: 'anim', k: 'serie', q: 63, h: 0.2, d: 'Eine gelbe Familie, eine sehr lange Serie.' },
  { id: 'p29', t: 'Schlag den Nachbarn', g: 'show', k: 'show', q: 59, h: 0.3, l: 2, d: 'Rasenmähen auf Zeit. Rechtsstreit garantiert.' },
  { id: 'p30', t: 'Die Wikingerinnen', g: 'drama', k: 'serie', q: 76, h: 0.35, d: 'Schwerter, Schiffe, Schwesternstreit.' },
  { id: 'p31', t: 'Haus des Geldautomaten', g: 'crime', k: 'serie', q: 73, h: 0.4, d: 'Die Bande mit den Pappmasken plant den Coup auf die Sparkasse.' },
  { id: 'p32', t: 'Die Mandalorianerin', g: 'scifi', k: 'serie', q: 81, h: 0.3, d: 'Kopfgeldjägerin mit Babysitter-Pflichten.' },
  { id: 'p33', t: 'Pommes-WM', g: 'sport', k: 'show', q: 50, h: 0.25, d: 'Wer frittiert am schnellsten?' },
  { id: 'p34', t: 'Das große Brettspiel-Duell', g: 'show', k: 'show', q: 54, h: 0.15, l: 3, d: 'Monopoly-Partie, Tag 3.' },
  { id: 'p35', t: 'Nachts im Fernsehturm', g: 'comedy', k: 'film', q: 71, h: 0.2, l: 2, d: 'Die Ausstellungsstücke erwachen zum Leben – und schauen fern.' },
  { id: 'p36', t: 'Lachen mit Lars', g: 'comedy', k: 'show', q: 47, h: 0.1, d: 'Stand-up über Bausparverträge.' },
  { id: 'p37', t: 'Mittelerde-Mittelmaß', g: 'comedy', k: 'serie', q: 60, h: 0.2, d: 'Fantasy-Sitcom im Rathaus von Mordor-Süd.' },
  { id: 'p38', t: 'Dr. Haus und Hof', g: 'drama', k: 'serie', q: 69, h: 0.1, d: 'Der mürrische Landarzt, der jede Kuh diagnostiziert.' },
  { id: 'p39', t: 'Weltall-Wetten', g: 'show', k: 'show', q: 63, h: 0.35, l: 2, d: 'Kandidaten wetten, was im Weltall passiert.' },
  { id: 'p40', t: 'Die Kunst des Schweigens', g: 'docu', k: 'film', q: 92, h: 0.05, l: 3, d: 'Zwei Stunden Klöster. Die Jury weint.' },
  { id: 'p41', t: 'Grill den Profi-Koch', g: 'cook', k: 'show', q: 70, h: 0.25, d: 'Promis gegen Sterneköche. Die Bratwurst entscheidet.' },
  { id: 'p42', t: 'Gaming-Nacht Live', g: 'sport', k: 'show', q: 58, h: 0.45, l: 2, d: 'Speedruns bis zum Morgengrauen.' },
  { id: 'p43', t: 'Kaffeeklatsch mit Kanzlerin a. D.', g: 'talk', k: 'show', q: 79, h: 0.15, d: 'Kuchen, Krisen und Anekdoten.' },
  { id: 'p44', t: 'Das Spukhaus von Bad Gruselheim', g: 'comedy', k: 'film', q: 66, h: 0.3, l: 2, d: 'Familienkomödie mit sehr höflichen Geistern.' },
  { id: 'p45', t: 'Abenteuer Aquarium', g: 'docu', k: 'serie', q: 70, h: 0.2, d: 'Fische, die Fische beobachten.' },
  { id: 'p46', t: 'Pixel-Ponys', g: 'anim', k: 'serie', q: 55, h: 0.3, d: 'Freundschaft ist Magie. Und Merchandise.' },
  { id: 'p47', t: 'Die Hochzeitsplanerin', g: 'comedy', k: 'serie', q: 62, h: 0.2, d: 'Jede Woche eine Hochzeit, jede Woche ein Unglück.' },
  { id: 'p48', t: 'Raumschiff Bürokratie', g: 'scifi', k: 'serie', q: 67, h: 0.15, d: 'Unendliche Weiten. Unendliche Formulare.' },
  { id: 'p49', t: 'Spät-Talk mit Schmidt & Schmitt', g: 'talk', k: 'show', q: 65, h: 0.2, d: 'Zwei Moderatoren, ein Name, kein Plan.' },
  { id: 'p51', t: 'Der Hobbit-Hof – Extended Edition', g: 'scifi', k: 'film', q: 91, h: 0.35, l: 4, d: 'Vier Stunden Gemüsegarten. Mit Making-of.' },
  { id: 'p52', t: 'Titanic auf dem Baggersee', g: 'drama', k: 'film', q: 83, h: 0.3, l: 3, d: 'Ein Tretboot, eine große Liebe, ein kleiner Eisberg.' },
  { id: 'p50', t: 'Die Superheldenrente', g: 'comedy', k: 'film', q: 74, h: 0.35, l: 2, d: 'Ex-Helden im Seniorenheim retten den Bingoabend.' },
];

// Starter-Archive: alte Kamellen, damit der erste Abend gefüllt ist.
export const STARTERS = {
  k7: [
    { id: 's_k1', t: 'Die Rentner-Detektive (Wdh.)', g: 'crime', k: 'serie', q: 42, h: 0, d: 'Läuft seit 1998. Immer noch.' },
    { id: 's_k2', t: 'Kochen mit Kalle', g: 'cook', k: 'show', q: 38, h: 0, d: 'Der Hausmeister kocht. Mutig.' },
    { id: 's_k3', t: 'Hallo Nachbar!', g: 'sitcom', k: 'serie', q: 45, h: 0.05, d: 'Zwei Familien, ein Gartenzaun.' },
    { id: 's_k4', t: 'Bergdoktor im Flachland', g: 'drama', k: 'serie', q: 47, h: 0, d: 'Ein Arzt sucht verzweifelt einen Berg.' },
    { id: 's_k5', t: 'Glücksrad-Rad', g: 'show', k: 'show', q: 40, h: 0, d: 'Das Rad dreht sich. Sonst nichts.' },
    { id: 's_k6', t: 'Das Weltall in Pastell', g: 'docu', k: 'film', q: 50, h: 0, l: 2, d: 'Sterne, gezeichnet mit Kreide.' },
    { id: 's_k7', t: 'Spätschicht-Talk', g: 'talk', k: 'show', q: 36, h: 0, d: 'Ein Sofa, ein Gast, viel Stille.' },
  ],
  trash: [
    { id: 's_t1', t: 'Promis putzen Pools', g: 'reality', k: 'show', q: 40, h: 0.2, d: '' },
    { id: 's_t2', t: 'Schnell verliebt in Schwerin', g: 'reality', k: 'serie', q: 38, h: 0.15, d: '' },
    { id: 's_t3', t: 'Witzig oder wüst?', g: 'comedy', k: 'show', q: 42, h: 0.1, d: '' },
    { id: 's_t4', t: 'Pannen-Paradies', g: 'show', k: 'show', q: 45, h: 0.1, d: '' },
    { id: 's_t5', t: 'Roboter-Rambazamba', g: 'anim', k: 'serie', q: 40, h: 0.1, d: '' },
    { id: 's_t6', t: 'Mitternachtsmonster', g: 'scifi', k: 'film', q: 41, h: 0.1, l: 2, d: '' },
    { id: 's_t7', t: 'Laber-Lounge', g: 'talk', k: 'show', q: 33, h: 0.05, d: '' },
  ],
  prestige: [
    { id: 's_p1', t: 'Opernabend Spezial', g: 'docu', k: 'film', q: 50, h: 0, l: 3, d: '' },
    { id: 's_p2', t: 'Das Haus am Fluss', g: 'drama', k: 'serie', q: 46, h: 0, d: '' },
    { id: 's_p3', t: 'Kommissarin Klug', g: 'crime', k: 'serie', q: 45, h: 0, d: '' },
    { id: 's_p4', t: 'Weltreise im Ruderboot', g: 'docu', k: 'serie', q: 48, h: 0, d: '' },
    { id: 's_p5', t: 'Feinkost & Fragen', g: 'cook', k: 'show', q: 44, h: 0, d: '' },
    { id: 's_p6', t: 'Philosophie für Anfänger', g: 'talk', k: 'show', q: 47, h: 0, d: '' },
    { id: 's_p7', t: 'Schach der Großmeister', g: 'sport', k: 'show', q: 40, h: 0, d: '' },
  ],
};

export const BRANDS = [
  { b: 'VOLT ZERO', p: 'Energydrink ohne alles', g: 'genz' },
  { b: 'Omas Kekse', p: 'Butterkekse seit 1952', g: 'boom' },
  { b: 'Klötzchen', p: 'Bausteine für kleine Architekten', g: 'fam' },
  { b: 'Pixelphone 12', p: 'Jetzt mit noch mehr Kameras', g: 'mill' },
  { b: 'Sicher & Sacht', p: 'Bausparkasse', g: 'boom' },
  { b: 'Haferkönig', p: 'Hafermilch, aber royal', g: 'mill' },
  { b: 'ThronX', p: 'Gaming-Stuhl mit Getränkehalter', g: 'nerd' },
  { b: 'Strahlemann', p: 'Zahnpasta mit Glitzer', g: 'fam' },
  { b: 'Pizza Bellissima', p: 'Tiefkühlpizza', g: null },
  { b: 'Wolke 7', p: 'Sneaker zum Abheben', g: 'genz' },
  { b: 'Blitzblank', p: 'Waschmittel', g: 'fam' },
  { b: 'Fernweh.de', p: 'Reiseportal', g: 'mill' },
  { b: 'Rundum-Versicherung', p: 'Versichert sogar Gartenzwerge', g: 'boom' },
  { b: 'NETFLUX', p: 'Ja, wirklich – sie werben bei dir', g: null },
  { b: 'Knusperkuh', p: 'Schokoriegel', g: 'genz' },
  { b: 'Scharfblick', p: 'Brillen für jede Lebenslage', g: 'boom' },
  { b: 'Flitzer', p: 'Lieferdienst in 9 Minuten', g: 'mill' },
  { b: 'Grünfink', p: 'Gartencenter', g: 'boom' },
  { b: 'PlayBox Ultra', p: 'Spielekonsole', g: 'nerd' },
  { b: 'Autohaus Brummer', p: 'Kombis mit Herz', g: null },
];

export const NEWS = [
  { t: 'KI-Toaster gewinnt Ortsratswahl in Kleinkleckersdorf', topic: 'politik', q: 55 },
  { t: 'Rathaus beschließt: Montag wird verschoben', topic: 'politik', q: 45 },
  { t: 'Bundestag debattiert über Sockenpflicht im Winter', topic: 'politik', q: 50 },
  { t: 'Bürgermeisterin eröffnet Radweg – er ist 3 Meter lang', topic: 'politik', q: 40 },
  { t: 'Hitzewelle im Anmarsch: Eisdielen melden Rekord', topic: 'wetter', q: 45 },
  { t: 'Wetterdienst: Morgen „irgendwie Wetter“', topic: 'wetter', q: 30 },
  { t: 'Riesenhagel? Nein, nur verlorene Tischtennisbälle', topic: 'wetter', q: 35 },
  { t: 'Popstar adoptiert 14. Alpaka', topic: 'promi', q: 35 },
  { t: 'Schlagerkönig verliert Stimme – findet sie im Taxi wieder', topic: 'promi', q: 40 },
  { t: 'Influencerin postet erstmals Foto ohne Filter – Server brechen zusammen', topic: 'promi', q: 38 },
  { t: 'Kreisliga-Sensation: Torwart schießt fünf Tore', topic: 'sport', q: 50 },
  { t: 'Schach-WM: Zug dauert 6 Stunden, Publikum schläft', topic: 'sport', q: 42 },
  { t: 'Nationalelf gewinnt gegen Fantasieland 3:0', topic: 'sport', q: 55 },
  { t: 'Streaming-Riese NETFLUX erhöht Preise – zum 7. Mal dieses Jahr', topic: 'tech', q: 60 },
  { t: 'Neues Smartphone faltet sich selbst – und den Besitzer', topic: 'tech', q: 48 },
  { t: 'Forscher entwickeln Akku, der eine ganze Woche hält', topic: 'tech', q: 65 },
  { t: 'Dizzy+ startet Abo für Haustiere', topic: 'tech', q: 50 },
  { t: 'Eichhörnchen legt Stromnetz von Bielefeld lahm', topic: 'tiere', q: 52 },
  { t: 'Zoo meldet: Pinguin hat Ausbruch geplant', topic: 'tiere', q: 46 },
  { t: 'Katze wird Ehrenbürgerin', topic: 'tiere', q: 44 },
  { t: 'Museum findet verschollenes Gemälde – hinter dem Kaffeeautomaten', topic: 'kultur', q: 62 },
  { t: 'Theater führt Stück ohne Text auf – Kritik begeistert', topic: 'kultur', q: 58 },
  { t: 'Nobelpreis für Erfindung des selbstfaltenden Hemdes', topic: 'kultur', q: 70 },
  { t: 'Weltrekord: Längste Polonaise führt durch drei Bundesländer', topic: 'kultur', q: 48 },
  { t: 'Raumsonde funkt Urlaubsgrüße vom Mars', topic: 'tech', q: 66 },
  { t: 'Bahn kommt pünktlich – Fahrgäste misstrauisch', topic: 'politik', q: 58 },
  { t: 'Erste Kita für Roboter eröffnet', topic: 'tech', q: 44 },
  { t: 'Sommerferien verlängert – wegen zu gutem Wetter', topic: 'politik', q: 52 },
];

export const TRENDS = [
  { g: 'cook', tag: '#Kochfieber', text: 'Alle wollen heute kochen sehen.' },
  { g: 'reality', tag: '#Inseldrama', text: 'Reality-Clips gehen viral.' },
  { g: 'crime', tag: '#WerWarEs', text: 'Rätselfans sind los.' },
  { g: 'docu', tag: '#Wissensdurst', text: 'Die Leute wollen was lernen.' },
  { g: 'scifi', tag: '#AbInsAll', text: 'Raumfahrt ist cool, Sci-Fi auch.' },
  { g: 'comedy', tag: '#LachAnfall', text: 'Alle brauchen was zum Lachen.' },
  { g: 'drama', tag: '#TaschentuchAlarm', text: 'Große Gefühle sind gefragt.' },
  { g: 'show', tag: '#Quizzeit', text: 'Rate-Fieber im ganzen Land.' },
  { g: 'anim', tag: '#Zeichentrick', text: 'Cartoons erleben ein Comeback.' },
  { g: 'sport', tag: '#Anpfiff', text: 'Sportfieber!' },
  { g: 'sitcom', tag: '#Couchzeit', text: 'Gemütliche Serien sind angesagt.' },
  { g: 'talk', tag: '#Plauderstunde', text: 'Talkshow-Clips trenden.' },
];

// Tagesereignisse. mod: wirkt auf Zuschauerrechnung, world: wirkt im Tower.
export const EVENTS = [
  { id: 'heat', t: 'Hitzewelle!', d: 'Alle sitzen draußen im Biergarten. Weniger Zuschauer heute.', mod: { all: 0.85 } },
  { id: 'rain', t: 'Dauerregen', d: 'Perfektes Fernsehwetter. Mehr Zuschauer heute.', mod: { all: 1.12 } },
  { id: 'drop', t: 'NETFLUX droppt „Stranger Schnitzel 5“', d: 'Alle Folgen auf einmal! Gen Z und Millennials sind heute abgelenkt.', mod: { stream: 1.7 } },
  { id: 'outage', t: 'Störung bei Dizzy+', d: 'Der Streamingdienst ist down – alle zappen zurück ins Fernsehen.', mod: { stream: 0.35 } },
  { id: 'soccer', t: 'Länderspiel im Ersten', d: 'Zwischen 20 und 22 Uhr schauen viele Boomer und Millennials Fußball.', mod: { oerPrime: 1.8 } },
  { id: 'holiday', t: 'Ferienbeginn', d: 'Die Kinder dürfen lange aufbleiben: Familien schauen auch spät.', mod: { famLate: true } },
  { id: 'cold', t: 'Schnupfenwelle', d: 'Alle bleiben zu Hause unter der Decke.', mod: { all: 1.08 } },
  { id: 'influencer', t: 'Influencer-Dreh im Aufzug', d: 'Ein Influencer filmt im Aufzug. Er fährt heute nur halb so schnell.', world: { elevator: 0.5 } },
  { id: 'election', t: 'Wahlabend in drei Bundesländern', d: 'Nachrichten sind heute doppelt so viel wert.', mod: { news: 2 } },
  { id: 'cleaning', t: 'Großputz im Tower', d: 'Der Boden ist frisch gewischt. Alle laufen heute vorsichtiger (langsamer).', world: { walk: 0.75 } },
];

export const GIFTS = [
  { id: 'flowers', name: 'Blumenstrauß', icon: '💐', price: 4000, jury: 3 },
  { id: 'pralines', name: 'Pralinen', icon: '🍫', price: 8000, jury: 6 },
  { id: 'theater', name: 'Theaterkarten', icon: '🎭', price: 18000, jury: 12 },
];

export const PRANKS = [
  { id: 'confetti', name: 'Konfetti-Kanone', icon: '🎉', price: 15000, d: 'Kalle füllt das Büro eines Rivalen mit Konfetti. Der braucht ewig zum Aufräumen.' },
  { id: 'antenna', name: 'Antennen-Kitzler', icon: '📡', price: 25000, d: 'Kalle kitzelt die Antenne des Rivalen. Bildstörung zur Primetime (20–22 Uhr).' },
];

export const BOSS_GOALS = [
  { id: 'prime', t: 'Hol um 20 Uhr mindestens {n} Mio. Zuschauer.', n: [3.5, 4.5, 5.5] },
  { id: 'wins', t: 'Gewinne mindestens {n} Stunden des Abends.', n: [2, 3, 4] },
  { id: 'ads', t: 'Strahle heute mindestens {n} Werbespots erfolgreich aus.', n: [2, 3, 4] },
  { id: 'total', t: 'Erreiche heute insgesamt {n} Mio. Zuschauer.', n: [18, 22, 26] },
];

export const COMMENTS = {
  good: [
    'Okay, {t} ist besser als gedacht 😮',
    'Ich wollte eigentlich streamen, aber {t} läuft gerade 📺',
    'Oma und ich schauen {t} zusammen ❤️',
    '{s} hat heute echt geliefert 👏',
    'Wer hat bitte {t} eingekauft? Gehaltserhöhung!',
    'Couch, Chips, {t}. Perfekter Abend.',
  ],
  meh: [
    '{t}? Hab ich irgendwie schon mal gesehen …',
    'Läuft nebenher, während ich auf dem Handy bin',
    'Ganz okay. Wie lauwarmer Tee.',
    '{s} könnte echt mal was Neues bringen',
  ],
  bad: [
    'Umgeschaltet. Tschüss {s} 👋',
    'Wer guckt das bitte um diese Uhrzeit? 💤',
    '{t} schon wieder?! Ernsthaft?',
    'Mein Hund hat den Raum verlassen 🐶',
  ],
  ad: [
    'Werbung … Zeit für Snacks 🍿',
    'Der {b}-Spot ist ein Ohrwurm, Hilfe',
  ],
};

export const BOSS_NAME = 'Henriette Hochkant';
export const JURY_NAME = 'Dr. Ilka Sendeschluss';
