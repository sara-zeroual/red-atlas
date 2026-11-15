/* ============================================================
   RED ATLAS — Data layer
   All climate data: NASA POWER API (climatology, multi-year
   satellite-derived averages). Downloaded 2026-11-14.
   Mars / Moon reference values: published NASA mission data
   (MSL REMS / Curiosity, LRO Diviner) — see Sources section.
   ============================================================ */

const MARS_REF = {
  name: "Mars — Gale Crater (MSL Curiosity / REMS)",
  diurnalSwingC: 60,          // approx. typical diurnal air-temperature swing
  summerHighC: 6,
  nightLowC: -73,
  note: "Approximate published REMS ranges; varies by season."
};

const MOON_REF = {
  name: "Moon — equatorial surface (LRO Diviner)",
  diurnalSwingC: 260,         // ~ +120 C day / ~ -130 C night
  note: "Approximate published Diviner ranges at the equator."
};

/* Comparator: mean diurnal temperature swing, Moon vs Mars vs Earth sites.
   No Earth desert comes close to the Moon — and that is exactly WHY analog
   testing exists: you isolate one stress at a time (thermal cycling, dust,
   geology), you don't try to rebuild the whole planet. */
const SWING_COMPARISON = [
  { name: "Moon, equator (LRO Diviner)", swing: 260, cls: "moon" },
  { name: "Moon, poles (LRO Diviner)", swing: 60, cls: "moon",
    note: "Polar sites chosen for Artemis have far milder swings — near-permanently shadowed craters stay extremely cold, rim areas are temperate and sunlit for long stretches." },
  { name: "Mars, Gale Crater (MSL REMS)", swing: 60, cls: "mars" },
  { name: "M'hamid, Morocco (NASA POWER)", swing: 31.1, cls: "ma" },
  { name: "Erg Chebbi, Morocco (NASA POWER)", swing: 31.0, cls: "ma" },
  { name: "Atacama, Chile (NASA POWER)", swing: 31.1, cls: "ctrl" },
  { name: "Death Valley, USA (NASA POWER)", swing: 34.0, cls: "ctrl" }
];

/* ---------- Moroccan candidate analog sites (NASA POWER) ---------- */
const SITES = [
  {
    id: "erg_chebbi",
    img: "img/erg_chebbi.jpg",
    name: "Erg Chebbi",
    region: "Merzouga, Drâa-Tafilalet",
    lat: 31.16, lon: -3.99,
    elevationM: 730,                    // approx., SRTM-derived
    t2m:  [9.3, 11.4, 15.8, 20.2, 24.8, 29.9, 33.8, 32.9, 27.9, 22.0, 14.6, 10.2],
    swing: 31.0, hottest: 44.8, coldest: -4.4,
    precipMmDay: 0.23, windMs: 4.2, solarMJm2: 21.34,
    analogTo: "Martian dune fields (e.g. Nili Patera)",
    analogy: "Crescentic barchan dunes up to ~150 m tall built by the same aeolian (wind) physics that shapes dunes on Mars. NASA studies terrestrial dune fields to calibrate how Martian sand migrates — wind here averages 4.2 m/s with stronger seasonal gusts.",
    breaks: "Earth's dense atmosphere and occasional rain cement the sand; Martian dunes migrate under a thin CO2 atmosphere (~1% of Earth's pressure).",
    badge: "Best dune analog"
  },
  {
    id: "tafilalet",
    img: "img/tafilalet.jpg",
    name: "Tafilalet (Erfoud)",
    region: "Drâa-Tafilalet",
    lat: 31.44, lon: -4.23,
    elevationM: 800,
    t2m:  [9.3, 11.1, 15.2, 19.4, 23.9, 28.9, 33.1, 32.0, 26.9, 21.2, 14.1, 10.1],
    swing: 30.8, hottest: 44.1, coldest: -4.5,
    precipMmDay: 0.44, windMs: 3.8, solarMJm2: 21.15,
    analogTo: "Mars surface operations test range",
    analogy: "This exact area hosted MARS2013 — a 28-day international Mars analog simulation led by the Austrian Space Forum with the Ibn Battuta Centre (Marrakech), testing the Aouda.X spacesuit, rovers and 20 experiments from 10 nations, with NASA JPL among partners. Rocky hamada, reg (gravel plains) and dry stream beds mimic Martian terrain classes.",
    breaks: "Residual vegetation and biological soil crusts exist here; Mars has none that we know of.",
    badge: "Proven analog site"
  },
  {
    id: "agoudal",
    img: "img/agoudal.jpg",
    name: "Agoudal (High Atlas)",
    region: "High Atlas Mountains",
    lat: 31.59, lon: -5.41,
    elevationM: 2300,
    t2m:  [5.0, 6.2, 9.6, 13.4, 17.5, 22.4, 26.2, 25.1, 20.3, 15.1, 8.9, 5.8],
    swing: 29.9, hottest: 37.2, coldest: -10.0,
    precipMmDay: 0.59, windMs: 3.5, solarMJm2: 20.61,
    analogTo: "Impact-scarred highlands / harsh-altitude operations",
    analogy: "Site of the Agoudal iron meteorite find — a real piece of space rock recovered in Morocco. At ~2,300 m, the High Atlas combines the coldest Moroccan nights (-10 °C) with intense solar load, approximating thermal fatigue conditions for hardware.",
    breaks: "Atmospheric pressure at 2,300 m is still ~77 kPa — ten times Mars' surface pressure.",
    badge: "Coldest test site"
  },
  {
    id: "anti_atlas",
    img: "img/anti_atlas.jpg",
    name: "Anti-Atlas (Tafraoute)",
    region: "Souss-Massa",
    lat: 29.72, lon: -8.97,
    elevationM: 1100,
    t2m:  [9.9, 11.5, 14.8, 17.7, 21.4, 25.7, 30.9, 30.2, 25.0, 20.3, 14.5, 10.6],
    swing: 30.6, hottest: 42.9, coldest: -3.6,
    precipMmDay: 0.35, windMs: 4.9, solarMJm2: 21.79,
    analogTo: "Noachian (ancient) Martian crust",
    analogy: "The Anti-Atlas exposes some of the oldest rocks on Earth (Precambrian, up to ~2 billion years), an analog for the ancient Noachian crust of Mars that missions like Perseverance study. Strongest winds of our five sites (4.9 m/s): ideal for aeolian and dust-handling tests.",
    breaks: "Earth's ancient rocks were altered by water and life for billions of years; Mars' Noachian crust froze in time early.",
    badge: "Best geology analog"
  },
  {
    id: "mhamid",
    img: "img/mhamid.jpg",
    name: "Sebkhas of the Drâa (M'hamid)",
    region: "Zagora, gateway to the deep Sahara",
    lat: 29.83, lon: -5.72,
    elevationM: 650,
    t2m:  [11.2, 13.3, 17.7, 22.1, 26.6, 31.5, 35.4, 34.5, 29.6, 23.6, 16.5, 12.0],
    swing: 31.1, hottest: 46.9, coldest: -3.3,
    precipMmDay: 0.23, windMs: 4.0, solarMJm2: 21.90,
    analogTo: "Martian paleolake basins (e.g. Jezero Crater)",
    analogy: "Dry salt lakes (sebkhas) are the closest terrestrial cousins of the paleolake basins Perseverance explores in Jezero Crater. Hottest site of the study: 46.9 °C average July daily maximum — hotter than Death Valley (46.2 °C). Driest too: ~84 mm of rain per year.",
    breaks: "Sebkha salts formed from liquid water chemistry different from Mars' ancient brines.",
    badge: "Extreme heat champion"
  }
];

/* ---------- World-recognized control analog sites (NASA POWER) ---------- */
const CONTROLS = [
  { id:"atacama",      name:"Atacama Desert (Chile)",   lat:-23.5, lon:-68.2, swing:31.1, hottest:33.8, coldest:-6.3,  usedBy:"NASA rover & astrobiology tests" },
  { id:"death_valley", name:"Death Valley (USA)",       lat:36.5,  lon:-116.9, swing:34.0, hottest:46.2, coldest:-6.2, usedBy:"Geology & instrument field tests" },
  { id:"haughton",     name:"Haughton Crater (Canada)", lat:75.4,  lon:-89.7,  swing:32.7, hottest:17.2, coldest:-50.1, usedBy:"Haughton-Mars Project (NASA/SETI)" },
  { id:"iceland",      name:"Askja, Iceland",           lat:64.9,  lon:-19.0,  swing:23.0, hottest:15.8, coldest:-24.3, usedBy:"Apollo astronaut training 1965/1967" }
];

/* ---------- Thermal Stress Index ----------
   TSI = mean diurnal temperature swing of the site
         ÷ reference swing at Mars' Gale Crater (≈60 °C) × 100.
   Same NASA POWER variables, same formula, for every site.  */
function tsi(swingC) { return Math.round(swingC / MARS_REF.diurnalSwingC * 100); }

/* ---------- UI strings (EN default / FR toggle) ---------- */
const I18N = {
  en: {
    heroKicker: "NASA Space Apps Challenge 2026 — Casablanca",
    heroTitle: "Mars already fell on Morocco.",
    heroSub: "On July 18, 2011, a Martian meteorite fell near Tissint, Morocco. RED ATLAS uses NASA's own open data to prove what the space industry quietly knew: Morocco is one of the best natural training grounds for the Moon and Mars — and shows exactly where to build the next analog station.",
    ctaMap: "Explore the map",
    ctaScience: "See the proof",
    mapTitle: "Five candidate sites. Four world-class controls.",
    mapSub: "Click any marker. Red = Moroccan candidates · Grey = analog sites the world already uses.",
    scienceTitle: "The proof, in NASA's own numbers",
    scienceSub: "Same satellite dataset (NASA POWER), same variables, same formula — for Moroccan candidates and for the analog sites NASA already trusts.",
    limitsTitle: "Where the analogy breaks (and why that matters)",
    spaceTitle: "The five sites, seen from orbit",
    spaceSub: "Real NASA Worldview satellite frames (MODIS Terra, true color). Dunes, hamada, sebkhas and ancient massifs — the terrain classes missions care about, photographed by NASA's own Earth-observing fleet.",
    swingTitle: "Moon vs Mars vs Morocco — who swings hardest?",
    swingNote: "Mean diurnal temperature swing (°C). Sources: LRO Diviner (Moon), MSL REMS (Mars), NASA POWER (Earth sites).",
    swingWhy: "Lunar polar regions — where permanent Moon bases are planned — have far milder thermal swings than the equator (LRO Diviner). Morocco cannot replicate the Moon's 260 °C equatorial swing; no place on Earth can. What it replicates is the Mars-class daily stress that actually wears hardware down on analog missions.",
    statSwing: "°C diurnal swing at Erg Chebbi — same as Atacama",
    statHeat: "°C peak at M'hamid — hotter than Death Valley",
    statRain: "mm of rain/year in the Drâa sebkhas — near-Martian aridity",
    briefTitle: "Answering the brief, point by point.",
    briefText: "The challenge author asks for three things: an unexpected place (Morocco is not on the famous analog list — that's the point), a similarity metric and interactive map (the TSI + this site), and honesty about where the analogy works and where it breaks (every site file and the Limits section below). The brief also notes no analog needs to be perfect — Earth cannot reproduce lunar gravity, vacuum, or Martian atmosphere. We say exactly that, in numbers.",
    engineTitle: "🛰️ The Analog Engine — we didn't pick the sites, the data did",
    engineP1: "We scanned 159 points across Morocco (0.5° grid, land-masked to internationally recognized borders) with the NASA POWER API, computed a Mars Likeness Index (MLI) from four mission-anchored variables, and let unsupervised k-means clustering (k=3) find the analog zones by itself. Toggle the Engine scan layer on the map: the heat is where Earth behaves like Mars.",
    engineP2: "What the machine found surprised us: Morocco's highest-MLI zone — MLI 79.9, the Guelmim–Assa steppe south of the Anti-Atlas — sits ~160 km from any site we had hand-picked, and outranks every one of them. Gold markers = zones the machine discovered that no one had chosen. The engine also re-found the Tafilalet on its own, which independently validates our field-proven site.",
    engineP3: "— equal weights, published formula, reproducible code (engine/scan.py in our public repository).",
    tsiTitle: "Thermal Stress Index (TSI)",
    tsiNote: "Mean diurnal temperature swing ÷ Gale Crater swing (≈60 °C, MSL REMS) × 100",
    tempTitle: "Year-round temperatures",
    tempNote: "Monthly averages (NASA POWER) — pick a site on the map or below",
    radarTitle: "Analog fingerprint vs Mars",
    radarNote: "4 mission-anchored axes, 0–1 (Mars target = 1). Select a site on the map.",
    methodTitle: "Method — reproducible by design",
    method1: "Pull T2M, T2M_MAX, T2M_MIN, precipitation, wind and solar irradiance from the NASA POWER API (climatology endpoint) for 5 Moroccan sites and 4 world-recognized analog sites.",
    method2: "Compute the mean diurnal swing: average of (T2M_MAX − T2M_MIN) over 12 months. Normalize against Mars' Gale Crater reference swing (≈60 °C, MSL REMS published data) → the TSI.",
    method3: "Analog Engine: scan a 0.5° grid over Morocco (land-masked to internationally recognized borders), compute the MLI — mean of four mission-anchored scores: thermal cycling (Gale ≈60 °C swing), aridity (Mars = no liquid water), aeolian activity, solar load — equal weights, formula published above.",
    method4: "Unsupervised discovery: k-means (k=3) on the grid's score vectors finds analog classes by itself. Points far from every hand-picked site are flagged as machine discoveries.",
    method5: "Every figure on this page regenerates from the same public API calls — the code is in our public repository.",
    limitGravityT: "Gravity", limitGravity: "Earth is 1 g. The Moon is 0.17 g, Mars 0.38 g. No desert fixes that — only parabolic flights and centrifuges can.",
    limitAtmT: "Atmosphere", limitAtm: "Mars' surface pressure is ~0.6 kPa vs ~101 kPa on Earth. Dust behavior and hardware cooling differ fundamentally.",
    limitRadT: "Radiation", limitRad: "Morocco's surface is shielded by a magnetic field and a thick atmosphere. Radiation doses on Mars are far higher.",
    limitColdT: "Extreme cold", limitCold: "Haughton Crater reaches −50 °C; Morocco bottoms at −10 °C. Polar-analog tests still belong to the Arctic.",
    limitsNote: "An honest analog is a bounded one. Morocco replicates thermal stress, aridity, aeolian processes, geology and isolation — not everything, and we say so.",
    stationP1: "The space industry already chose Morocco: the Ibn Battuta Centre (Marrakech) spent three years testing the DREAMS instrument that flew on ExoMars 2016, and the MARS2013 mission simulated 28 days on Mars near Erfoud with 20 experiments and NASA JPL among partners.",
    stationP2: "RED ATLAS proposes the next step: a permanent Atlas Analog Station in the Tafilalet, at the crossroads of our five sites — dunes, ancient crust, sebkhas, high-altitude cold and proven test ranges within 150 km. Three hours from Europe, a fraction of Arctic logistics, and solar irradiance of ~21 MJ/m²/day to power it.",
    stationTitle: "Proposal: the Atlas Analog Station",
    impactTitle: "Local impact — one country, one gap, one plan",
    impactSub: "The problem is not that Morocco lacks Mars-like terrain. NASA's data proves the opposite. The problem is that nobody has built the bridge.",
    impactChainT: "The causal chain",
    impactChain: "Analog missions fly 10,000+ km to Chile, Canada or Iceland → costs explode, cadence drops → meanwhile NASA's own data shows equivalent terrain in Morocco, 3 h from Europe, unused. Every year without a station = tests not run, hardware not hardened, talent not trained.",
    impactWhoT: "Who benefits",
    impactWho: "Moroccan and African universities (first analog research infrastructure on the continent), the Ibn Battuta Centre's two decades of Mars work, the Drâa-Tafilalet and Souss-Massa regions (high-tech jobs + astro-tourism), and every Mars program that needs cheaper, faster, more frequent field tests.",
    impactPhaseT: "Phase 0 — first 90 days",
    impactPhase: "Deploy 3 low-cost thermal loggers (~$50 each) at Erg Chebbi, Agoudal and the machine-discovered Guelmim–Assa zone. Compare ground truth vs NASA POWER climatology, publish the delta — exactly how analog sites get scientifically validated. Total budget: under $500.",
    impactDualT: "The engine's answer",
    impactDual: "Our siting algorithm (max MLI richness within 150 km) picked the Anti-Atlas corridor (29.3°N, 8.5°W) as the optimal station location — between our geology/wind site and the Guelmim–Assa discovery. Paired with the field-proven Tafilalet range, Morocco gets a two-node analog network. The machine agrees with the field.",
    impactNote: "Local Impact formula, borrowed from the 2025 Global Winner playbook: one named place, one causal chain, one decision computed from NASA data, one concrete first step.",
    sourcesTitle: "Data sources & licenses",
    chatTitle: "Ask the Analog Guide",
    chatPlaceholder: "Ask about a site, Mars, the data…",
    analyzeBtn: "📍 Analyze Anywhere",
    analyzeHint: "Pick a mode, then use the map: one click for a point, two corners for a full zone report.",
    zoneBtn: "⬚ Zone Analysis",
    zoneTitle: "Zone Analysis Report",
    footer: "Built with NASA open data · Code: MIT license · NASA Space Apps 2026"
  },
  fr: {
    heroKicker: "NASA Space Apps Challenge 2026 — Casablanca",
    heroTitle: "Mars est déjà tombé sur le Maroc.",
    heroSub: "Le 18 juillet 2011, une météorite martienne est tombée près de Tissint. RED ATLAS utilise les données ouvertes de la NASA pour prouver ce que l'industrie spatiale savait déjà : le Maroc est l'un des meilleurs terrains d'entraînement naturels pour la Lune et Mars — et montre exactement où construire la prochaine station analogue.",
    ctaMap: "Explorer la carte",
    ctaScience: "Voir la preuve",
    mapTitle: "Cinq sites candidats. Quatre témoins mondiaux.",
    mapSub: "Cliquez sur un marqueur. Rouge = candidats marocains · Gris = sites analogues déjà utilisés.",
    scienceTitle: "La preuve, avec les chiffres de la NASA",
    scienceSub: "Même dataset satellite (NASA POWER), mêmes variables, même formule — pour les candidats marocains et pour les sites analogues que la NASA utilise déjà.",
    limitsTitle: "Où l'analogie s'arrête (et pourquoi c'est important)",
    spaceTitle: "Les cinq sites, vus depuis l'orbite",
    spaceSub: "Vraies images satellite NASA Worldview (MODIS Terra, vraies couleurs). Dunes, hamada, sebkhas et massifs anciens — les terrains qui comptent pour les missions, photographiés par la flotte d'observation de la NASA.",
    swingTitle: "Lune vs Mars vs Maroc — qui subit le plus ?",
    swingNote: "Amplitude thermique diurne moyenne (°C). Sources : LRO Diviner (Lune), MSL REMS (Mars), NASA POWER (sites terrestres).",
    swingWhy: "Les régions polaires lunaires — où les bases permanentes sont prévues — ont des amplitudes bien plus douces que l'équateur (LRO Diviner). Le Maroc ne peut pas reproduire les 260 °C d'amplitude de l'équateur lunaire ; aucun endroit sur Terre ne le peut. Ce qu'il reproduit, c'est le stress quotidien de classe martienne qui use réellement le matériel en mission analogue.",
    statSwing: "°C d'amplitude jour/nuit à Erg Chebbi — comme l'Atacama",
    statHeat: "°C de pic à M'hamid — plus chaud que Death Valley",
    statRain: "mm de pluie/an dans les sebkhas du Drâa — aridité quasi martienne",
    briefTitle: "On répond au brief, point par point.",
    briefText: "L'auteur du défi demande trois choses : un lieu inattendu (le Maroc n'est PAS dans la liste des analogues célèbres — c'est tout l'intérêt), une mesure de similarité et une carte interactive (le TSI + ce site), et l'honnêteté sur ce qui marche et ce qui s'effondre (chaque fiche site + la section Limites ci-dessous). Le brief dit aussi qu'aucun analogue n'a besoin d'être parfait — la Terre ne peut pas reproduire la gravité lunaire, le vide, ni l'atmosphère martienne. On le dit exactement ainsi, en chiffres.",
    engineTitle: "🛰️ L'Analog Engine — on n'a pas choisi les sites, ce sont les données",
    engineP1: "Nous avons scanné 159 points sur tout le Maroc (grille 0,5°, limitée aux frontières internationalement reconnues) via l'API NASA POWER, calculé un Mars Likeness Index (MLI) à partir de quatre variables ancrées sur des données de mission, puis laissé un clustering non supervisé (k-means, k=3) trouver les zones analogues tout seul. Activez la couche « Engine scan » sur la carte : la chaleur montre où la Terre se comporte comme Mars.",
    engineP2: "Ce que la machine a trouvé nous a surpris : la zone au MLI le plus élevé du Maroc — MLI 79,9, la steppe de Guelmim–Assa au sud de l'Anti-Atlas — se situe à ~160 km de tout site choisi à la main, et les surclasse tous. Marqueurs dorés = zones découvertes par la machine que personne n'avait choisies. Le moteur a aussi retrouvé le Tafilalet tout seul, ce qui valide indépendamment notre site éprouvé sur le terrain.",
    engineP3: "— poids égaux, formule publiée, code reproductible (engine/scan.py dans notre dépôt public).",
    tsiTitle: "Indice de Stress Thermique (TSI)",
    tsiNote: "Amplitude thermique diurne moyenne ÷ amplitude de Gale Crater (≈60 °C, MSL REMS) × 100",
    tempTitle: "Températures sur l'année",
    tempNote: "Moyennes mensuelles (NASA POWER) — choisissez un site sur la carte ou ci-dessous",
    radarTitle: "Empreinte analogue vs Mars",
    radarNote: "4 axes ancrés sur des données de mission, 0–1 (cible Mars = 1). Sélectionnez un site sur la carte.",
    methodTitle: "Méthode — reproductible par construction",
    method1: "Extraire T2M, T2M_MAX, T2M_MIN, précipitations, vent et irradiance solaire depuis l'API NASA POWER (endpoint climatologie) pour 5 sites marocains et 4 sites analogues mondialement reconnus.",
    method2: "Calculer l'amplitude diurne moyenne : moyenne de (T2M_MAX − T2M_MIN) sur 12 mois. Normaliser par l'amplitude de référence de Gale Crater sur Mars (≈60 °C, données MSL REMS publiées) → le TSI.",
    method3: "Analog Engine : scanner une grille 0,5° sur le Maroc (masquée aux frontières reconnues), calculer le MLI — moyenne de quatre scores ancrés sur des missions : cyclage thermique (Gale ≈60 °C), aridité (Mars = pas d'eau liquide), activité éolienne, charge solaire — poids égaux, formule publiée ci-dessus.",
    method4: "Découverte non supervisée : k-means (k=3) sur les vecteurs de scores de la grille trouve les classes analogues tout seul. Les points éloignés de tout site choisi à la main sont marqués comme découvertes de la machine.",
    method5: "Chaque chiffre de cette page se régénère depuis les mêmes appels API publics — le code est dans notre dépôt public.",
    limitGravityT: "Gravité", limitGravity: "La Terre est à 1 g. La Lune à 0,17 g, Mars à 0,38 g. Aucun désert ne corrige ça — seuls les vols paraboliques et les centrifugeuses le peuvent.",
    limitAtmT: "Atmosphère", limitAtm: "La pression de surface de Mars est ~0,6 kPa contre ~101 kPa sur Terre. Le comportement de la poussière et le refroidissement du matériel diffèrent fondamentalement.",
    limitRadT: "Rayonnement", limitRad: "La surface marocaine est protégée par un champ magnétique et une atmosphère épaisse. Les doses de rayonnement sur Mars sont bien plus élevées.",
    limitColdT: "Froid extrême", limitCold: "Haughton Crater atteint −50 °C ; le Maroc plafonne à −10 °C. Les tests d'analogues polaires restent l'affaire de l'Arctique.",
    limitsNote: "Un analogue honnête est un analogue borné. Le Maroc reproduit le stress thermique, l'aridité, les processus éoliens, la géologie et l'isolement — pas tout, et on le dit.",
    stationP1: "L'industrie spatiale a déjà choisi le Maroc : le Ibn Battuta Centre (Marrakech) a passé trois ans à tester l'instrument DREAMS qui a volé sur ExoMars 2016, et la mission MARS2013 a simulé 28 jours sur Mars près d'Erfoud avec 20 expériences et la NASA JPL parmi les partenaires.",
    stationP2: "RED ATLAS propose l'étape suivante : une Atlas Analog Station permanente dans le Tafilalet, au carrefour de nos cinq sites — dunes, croûte ancienne, sebkhas, froid d'altitude et terrains de test éprouvés dans un rayon de 150 km. Trois heures de l'Europe, une fraction de la logistique arctique, et une irradiance solaire de ~21 MJ/m²/jour pour l'alimenter.",
    stationTitle: "Proposition : l'Atlas Analog Station",
    impactTitle: "Impact local — un pays, un manque, un plan",
    impactSub: "Le problème n'est pas que le Maroc manque de terrain martien. Les données de la NASA prouvent le contraire. Le problème, c'est que personne n'a construit le pont.",
    impactChainT: "La chaîne causale",
    impactChain: "Les missions analogues volent à plus de 10 000 km vers le Chili, le Canada ou l'Islande → les coûts explosent, la cadence chute → pendant ce temps, les données de la NASA montrent un terrain équivalent au Maroc, à 3 h de l'Europe, inutilisé. Chaque année sans station = des tests non faits, du matériel non durci, des talents non formés.",
    impactWhoT: "Qui en bénéficie",
    impactWho: "Les universités marocaines et africaines (première infrastructure de recherche analogue du continent), le Ibn Battuta Centre et ses vingt ans de travail sur Mars, les régions Drâa-Tafilalet et Souss-Massa (emplois high-tech + astro-tourisme), et tout programme martien qui a besoin de tests terrain moins chers, plus rapides, plus fréquents.",
    impactPhaseT: "Phase 0 — les 90 premiers jours",
    impactPhase: "Déployer 3 enregistreurs thermiques low-cost (~50 $ pièce) à Erg Chebbi, Agoudal et dans la zone découverte de Guelmim–Assa. Comparer le terrain réel à la climatologie NASA POWER, publier l'écart — c'est exactement ainsi qu'un site analogue se valide scientifiquement. Budget total : moins de 500 $.",
    impactDualT: "La réponse du moteur",
    impactDual: "Notre algorithme d'implantation (richesse MLI maximale dans un rayon de 150 km) a désigné le corridor de l'Anti-Atlas (29,3°N, 8,5°O) comme emplacement optimal — entre notre site géologie/vent et la découverte Guelmim–Assa. Associé au terrain éprouvé du Tafilalet, le Maroc obtient un réseau analogue à deux nœuds. La machine est d'accord avec le terrain.",
    impactNote: "Formule Local Impact, empruntée au lauréat mondial 2025 : un lieu nommé, une chaîne causale, une décision calculée à partir des données NASA, un premier pas concret.",
    sourcesTitle: "Sources de données & licences",
    chatTitle: "Demandez au Guide Analogue",
    chatPlaceholder: "Posez une question sur un site, Mars, les données…",
    analyzeBtn: "📍 Analysez n'importe où",
    analyzeHint: "Choisissez un mode, puis utilisez la carte : un clic pour un point, deux coins pour un rapport de zone complet.",
    zoneBtn: "⬚ Analyse de zone",
    zoneTitle: "Rapport d'analyse de zone",
    footer: "Construit avec les données ouvertes de la NASA · Code : licence MIT · NASA Space Apps 2026"
  }
};
