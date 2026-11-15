/* RED ATLAS — app logic: map, charts, i18n, chatbot */
/* Default language: French for French-speaking browsers, English otherwise (submission language). */
let LANG = (navigator.language || "en").toLowerCase().startsWith("fr") ? "fr" : "en";

/* ---------------- i18n ---------------- */
function applyLang() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const k = el.getAttribute("data-i18n");
    if (I18N[LANG][k]) el.textContent = I18N[LANG][k];
  });
  document.querySelectorAll("[data-i18n-ph]").forEach(el => {
    const k = el.getAttribute("data-i18n-ph");
    if (I18N[LANG][k]) el.placeholder = I18N[LANG][k];
  });
  document.getElementById("langToggle").textContent = LANG === "en" ? "FR" : "EN";
}
document.getElementById("langToggle").addEventListener("click", () => {
  LANG = LANG === "en" ? "fr" : "en";
  applyLang();
});

/* ---------------- Leaflet map ---------------- */
const map = L.map("leafletMap", { scrollWheelZoom: false }).setView([31.3, -6.5], 6);
L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  { attribution: "Esri World Imagery", maxZoom: 18 }
).addTo(map);

const redIcon = L.divIcon({ className: "", html: '<div style="width:16px;height:16px;border-radius:50%;background:#e8492e;border:3px solid #fff;box-shadow:0 0 10px #e8492e"></div>', iconSize: [16, 16], iconAnchor: [8, 8] });
const greyIcon = L.divIcon({ className: "", html: '<div style="width:14px;height:14px;border-radius:50%;background:#9aa3b5;border:3px solid #fff"></div>', iconSize: [14, 14], iconAnchor: [7, 7] });

SITES.forEach(s => {
  const m = L.marker([s.lat, s.lon], { icon: redIcon }).addTo(map);
  m.on("click", () => showSite(s));
});

CONTROLS.forEach(c => {
  const m = L.marker([c.lat, c.lon], { icon: greyIcon }).addTo(map);
  m.on("click", () => showControl(c));
});

/* ---------------- Analog Engine scan layer ---------------- */
function mliColor(v) {
  // yellow -> orange -> red as MLI rises
  if (v >= 65) return "#ff3b1f";
  if (v >= 55) return "#ff6a2b";
  if (v >= 45) return "#ff9a3d";
  if (v >= 35) return "#e8b04d";
  return "#6b7280";
}

const engineLayer = L.layerGroup();
const discoveryLayer = L.layerGroup();

fetch("engine/engine.json")
  .then(r => r.json())
  .then(eng => {
    window.__engine = eng;
    eng.points.forEach(p => {
      const dot = L.circleMarker([p.lat, p.lon], {
        radius: 5, color: mliColor(p.mli), weight: 1,
        fillColor: mliColor(p.mli), fillOpacity: 0.55
      });
      dot.bindTooltip(`MLI ${p.mli} · swing ${p.swing} °C · rain ${p.precip} mm/d · class ${p.cluster}`);
      engineLayer.addLayer(dot);
    });

    const goldIcon = L.divIcon({
      className: "",
      html: '<div style="width:18px;height:18px;border-radius:50%;background:#ffd24d;border:3px solid #fff;box-shadow:0 0 12px #ffd24d"></div>',
      iconSize: [18, 18], iconAnchor: [9, 9]
    });
    (eng.discoveries || []).forEach((d, i) => {
      const m = L.marker([d.lat, d.lon], { icon: goldIcon });
      m.bindTooltip(`🔍 ${d.name || "Machine-discovered zone #" + (i + 1)} — MLI ${d.mli} · ${Math.round(d.distNearestSiteKm)} km from the nearest hand-picked site`);
      discoveryLayer.addLayer(m);
    });

    // Engine-selected optimal station location
    if (eng.station) {
      const st = eng.station;
      const starIcon = L.divIcon({
        className: "",
        html: '<div style="width:22px;height:22px;background:#ffd24d;clip-path:polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%);filter:drop-shadow(0 0 6px #ffd24d)"></div>',
        iconSize: [22, 22], iconAnchor: [11, 11]
      });
      L.marker([st.lat, st.lon], { icon: starIcon })
        .bindTooltip(`⭐ Engine-selected station site — ${st.name} · own MLI ${st.ownMli} · mean MLI within 150 km: ${st.meanMli150km}`)
        .addTo(discoveryLayer);
    }

    L.control.layers(null, {
      "🛰️ Engine scan (MLI grid)": engineLayer,
      "🔍 Machine discoveries": discoveryLayer
    }, { collapsed: false }).addTo(map);
    engineLayer.addTo(map);
    discoveryLayer.addTo(map);
  })
  .catch(() => {}); // engine file optional — site works without it

/* ---------------- Site cards ---------------- */
function kv(label, value) {
  return `<div><span>${label}</span><strong>${value}</strong></div>`;
}

/* MLI component scores — same published formula as the Analog Engine */
function mliScores(x) {
  return [
    Math.min(x.swing / 60, 1),
    Math.max(1 - x.precipMmDay / 2, 0),
    Math.min(x.windMs / 6, 1),
    Math.min(x.solarMJm2 / 22, 1)
  ];
}
function mli(x) {
  const s = mliScores(x);
  return Math.round(100 * s.reduce((a, b) => a + b, 0) / 4);
}

/* ---------------- Analog fingerprint radar ---------------- */
let radarChart;
function buildRadar(site) {
  const data = mliScores(site);
  if (radarChart) radarChart.destroy();
  radarChart = new Chart(document.getElementById("radarChart"), {
    type: "radar",
    data: {
      labels: ["Thermal cycling", "Aridity", "Aeolian (wind)", "Solar load"],
      datasets: [
        { label: site.name, data, borderColor: "#e8492e", backgroundColor: "rgba(232,73,46,.18)", pointBackgroundColor: "#e8492e" },
        { label: "Mars target", data: [1, 1, 1, 1], borderColor: "#e8b04d", borderDash: [5, 5], backgroundColor: "rgba(232,176,77,.05)", pointRadius: 0 }
      ]
    },
    options: {
      plugins: { legend: { labels: { color: "#cfd5e1", font: { size: 11 } } } },
      scales: { r: { min: 0, max: 1, grid: { color: "#262c3d" }, angleLines: { color: "#262c3d" },
        pointLabels: { color: "#9aa3b5", font: { size: 11 } }, ticks: { display: false } } }
    }
  });
}

function showSite(s) {
  if (window.__pointChart) { window.__pointChart.destroy(); window.__pointChart = null; }
  const card = document.getElementById("siteCard");
  card.innerHTML = `
    <h3>${s.name}</h3>
    <div class="badge">${s.badge}</div>
    <img class="site-img" src="${s.img}" alt="NASA Worldview satellite image of ${s.name}" loading="lazy" />
    <p class="img-credit">NASA Worldview · MODIS Terra · 15 Jul 2025</p>
    <p style="color:var(--muted);font-size:.85rem">${s.region} · ${s.lat}°N, ${Math.abs(s.lon)}°W · ~${s.elevationM} m</p>
    <div class="kv">
      ${kv("TSI (Mars = 100)", tsi(s.swing))}
      ${kv("MLI (Engine score)", mli(s) + " / 100")}
      ${kv("Diurnal swing", s.swing + " °C")}
      ${kv("Hottest month avg. max", s.hottest + " °C")}
      ${kv("Coldest month avg. min", s.coldest + " °C")}
      ${kv("Rain", s.precipMmDay + " mm/day")}
      ${kv("Wind", s.windMs + " m/s")}
      ${kv("Solar", s.solarMJm2 + " MJ/m²/day")}
    </div>
    <h4>Analog of</h4><p>${s.analogTo}</p>
    <h4>Why it works</h4><p>${s.analogy}</p>
    <h4>Where it breaks</h4><p>${s.breaks}</p>
    <p class="ext-links">
      <a href="https://browser.dataspace.copernicus.eu/?zoom=11&lat=${s.lat}&lng=${s.lon}" target="_blank" rel="noopener">Sentinel-2 · Copernicus Browser ↗</a>
      <a href="https://worldview.earthdata.nasa.gov/?v=${s.lon - 0.5},${s.lat - 0.25},${s.lon + 0.5},${s.lat + 0.25}" target="_blank" rel="noopener">NASA Worldview live ↗</a>
    </p>`;
  buildRadar(s);
}

function showControl(c) {
  if (window.__pointChart) { window.__pointChart.destroy(); window.__pointChart = null; }
  const card = document.getElementById("siteCard");
  card.innerHTML = `
    <h3 style="color:var(--muted)">${c.name}</h3>
    <div class="badge" style="background:rgba(154,163,181,.15);color:var(--muted);border-color:var(--muted)">Control site</div>
    <p style="color:var(--muted);font-size:.85rem">${c.usedBy}</p>
    <div class="kv">
      ${kv("TSI (Mars = 100)", tsi(c.swing))}
      ${kv("Diurnal swing", c.swing + " °C")}
      ${kv("Hottest month avg. max", c.hottest + " °C")}
      ${kv("Coldest month avg. min", c.coldest + " °C")}
    </div>
    <h4>Role in this study</h4>
    <p>This site is one of the world's recognized planetary analogs. We measure Moroccan candidates against it using the same NASA POWER data and the same formula — no special treatment.</p>`;
}

/* ---------------- TSI bar chart ---------------- */
const tsiCtx = document.getElementById("tsiChart");
new Chart(tsiCtx, {
  type: "bar",
  data: {
    labels: [...SITES.map(s => s.name), ...CONTROLS.map(c => c.name)],
    datasets: [{
      label: "TSI (Mars Gale Crater = 100)",
      data: [...SITES.map(s => tsi(s.swing)), ...CONTROLS.map(c => tsi(c.swing))],
      backgroundColor: [...SITES.map(() => "#e8492e"), ...CONTROLS.map(() => "#5a6373")],
      borderRadius: 6
    }]
  },
  options: {
    indexAxis: "y",
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: ctx => ` TSI ${ctx.raw} — swing ${[...SITES, ...CONTROLS][ctx.dataIndex].swing} °C` } }
    },
    scales: {
      x: { max: 110, grid: { color: "#262c3d" }, ticks: { color: "#9aa3b5" } },
      y: { grid: { display: false }, ticks: { color: "#eef1f7", font: { size: 11 } } }
    }
  }
});

/* ---------------- Space view gallery (NASA Worldview) ---------------- */
const gallery = document.getElementById("spaceGallery");
SITES.forEach(s => {
  const fig = document.createElement("figure");
  fig.className = "space-item";
  fig.innerHTML = `
    <img src="${s.img}" alt="NASA Worldview satellite image of ${s.name}" loading="lazy" />
    <figcaption><strong>${s.name}</strong><span>${s.analogTo}</span></figcaption>`;
  fig.addEventListener("click", () => {
    map.flyTo([s.lat, s.lon], 9, { duration: 1.2 });
    showSite(s);
    document.getElementById("map").scrollIntoView({ behavior: "smooth" });
  });
  gallery.appendChild(fig);
});

/* ---------------- Swing comparator: Moon vs Mars vs Morocco ---------------- */
new Chart(document.getElementById("swingChart"), {
  type: "bar",
  data: {
    labels: SWING_COMPARISON.map(x => x.name),
    datasets: [{
      data: SWING_COMPARISON.map(x => x.swing),
      backgroundColor: SWING_COMPARISON.map(x =>
        x.cls === "moon" ? "#8f9bb5" : x.cls === "mars" ? "#e8b04d" :
        x.cls === "ma" ? "#e8492e" : "#5a6373"),
      borderRadius: 6
    }]
  },
  options: {
    indexAxis: "y",
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: ctx => ` ${ctx.raw} °C mean diurnal swing` } }
    },
    scales: {
      x: { grid: { color: "#262c3d" }, ticks: { color: "#9aa3b5" }, title: { display: true, text: "°C", color: "#9aa3b5" } },
      y: { grid: { display: false }, ticks: { color: "#eef1f7", font: { size: 11 } } }
    }
  }
});

/* ---------------- Temperature line chart ---------------- */
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
let tempChart;

function buildTempChart(siteId) {
  const s = SITES.find(x => x.id === siteId) || SITES[0];
  if (tempChart) tempChart.destroy();
  tempChart = new Chart(document.getElementById("tempChart"), {
    type: "line",
    data: {
      labels: MONTHS,
      datasets: [
        { label: s.name + " (avg °C)", data: s.t2m, borderColor: "#e8492e", backgroundColor: "rgba(232,73,46,.12)", fill: true, tension: .35 },
        { label: "Mars Gale summer high (~+6 °C)", data: Array(12).fill(6), borderColor: "#e8b04d", borderDash: [6, 6], pointRadius: 0 },
        { label: "Mars Gale night low (~−73 °C)", data: Array(12).fill(-73), borderColor: "#5a9bd5", borderDash: [6, 6], pointRadius: 0 }
      ]
    },
    options: {
      plugins: { legend: { labels: { color: "#cfd5e1", font: { size: 11 } } } },
      scales: {
        x: { grid: { color: "#262c3d" }, ticks: { color: "#9aa3b5" } },
        y: { grid: { color: "#262c3d" }, ticks: { color: "#9aa3b5" } }
      }
    }
  });
  document.querySelectorAll("#tempChartBtns button").forEach(b =>
    b.classList.toggle("active", b.dataset.id === siteId));
}

SITES.forEach(s => {
  const b = document.createElement("button");
  b.textContent = s.name;
  b.dataset.id = s.id;
  b.addEventListener("click", () => buildTempChart(s.id));
  document.getElementById("tempChartBtns").appendChild(b);
});

/* ---------------- Chatbot: Analog Guide (bilingual EN/FR) ---------------- */
const KB = [
  { k: ["tissint", "meteorite", "météorite"], af: "Le 18 juillet 2011, une météorite venue de Mars est tombée près de Tissint (province de Tata). Une chute de roche martienne observée — la preuve que le lien entre le Maroc et Mars n'est pas que géologique, il est littéral.",
    a: "On July 18, 2011, a meteorite from Mars fell near Tissint, in Morocco's Tata province — a witnessed fall of Martian rock. It is one of the strongest proofs that Morocco's link to Mars is not just geological, it is literal." },
  { k: ["erg chebbi", "dune", "merzouga"], af: "Les dunes d'Erg Chebbi atteignent ~150 m et sont sculptées par la même physique du vent que les dunes martiennes. Amplitude thermique : 31,0 °C — TSI 52, égal au désert d'Atacama.",
    a: "Erg Chebbi's dunes reach ~150 m and are shaped by the same wind physics as Martian dune fields. Its diurnal thermal swing is 31.0 °C — TSI 52, equal to the Atacama Desert." },
  { k: ["tafilalet", "erfoud", "mars2013"], af: "Le Tafilalet a accueilli MARS2013 : 28 jours de simulation martienne avec l'Austrian Space Forum et le Ibn Battuta Centre — 20 expériences, combinaison spatiale, et la NASA JPL parmi les partenaires. Mars a déjà été simulé là-bas.",
    a: "The Tafilalet hosted MARS2013, a 28-day Mars analog simulation with the Austrian Space Forum and Ibn Battuta Centre — 20 experiments, spacesuit tests, and NASA JPL among the partners. Mars has already been simulated there." },
  { k: ["agoudal", "atlas", "cold", "froid"], af: "Agoudal (Haut Atlas, ~2 300 m) offre l'environnement de test le plus froid du Maroc (−10 °C les nuits d'hiver) et c'est un vrai site de chute de météorite de fer.",
    a: "Agoudal (High Atlas, ~2,300 m) offers Morocco's coldest test environment (−10 °C winter nights) and is a real meteorite find site — an iron meteorite fell there." },
  { k: ["anti-atlas", "tafraoute", "geology", "rock", "géologie", "roche"], af: "L'Anti-Atlas expose des roches précambriennes vieilles de ~2 milliards d'années — un analogue de la croûte noachienne de Mars. C'est aussi notre site le plus venteux (4,9 m/s), idéal pour les études de poussière.",
    a: "The Anti-Atlas exposes Precambrian rocks up to ~2 billion years old — an analog for Mars' ancient Noachian crust. It is also our windiest site (4.9 m/s), ideal for dust-behavior studies." },
  { k: ["sebkha", "mhamid", "m'hamid", "salt", "lake", "draa", "sel", "lac"], af: "Les sebkhas du Drâa sont des lacs salés asséchés — cousins des paléolacs martiens que Perseverance étudie à Jezero. M'hamid culmine à 46,9 °C, plus chaud que Death Valley, avec seulement ~84 mm de pluie par an.",
    a: "The Drâa sebkhas are dry salt lakes — cousins of the Martian paleolake basins Perseverance studies at Jezero. M'hamid peaks at 46.9 °C, hotter than Death Valley, with only ~84 mm of rain a year." },
  { k: ["tsi", "index", "score", "formula", "formule", "indice"], af: "TSI = amplitude thermique moyenne d'un site ÷ celle de Gale Crater sur Mars (≈60 °C) × 100. Mêmes données NASA POWER, même formule pour tous les sites, témoins compris. Reproductible par n'importe qui.",
    a: "TSI = a site's mean diurnal temperature swing ÷ Mars' Gale Crater swing (≈60 °C) × 100. Same NASA POWER data, same formula for every site, controls included. Reproducible by anyone." },
  { k: ["mli", "engine", "moteur", "scan", "discovery", "découverte", "guelmim", "assa", "k-means", "cluster", "machine", "grid", "grille"], af: "L'Analog Engine a scanné 159 points couvrant tout le Maroc (API NASA POWER) et a calculé un Mars Likeness Index pour chacun. Surprise : la meilleure zone (MLI 79,9 — la steppe de Guelmim–Assa, au sud de l'Anti-Atlas) n'était dans AUCUNE de nos listes. La machine a aussi retrouvé le Tafilalet toute seule. Ce sont les marqueurs dorés sur la carte.",
    a: "The Analog Engine scanned 159 points covering all of Morocco (NASA POWER API) and computed a Mars Likeness Index for each. The surprise: the top zone (MLI 79.9 — the Guelmim–Assa steppe, south of the Anti-Atlas) was on NONE of our hand-picked lists. The machine also re-found the Tafilalet by itself. These are the gold markers on the map." },
  { k: ["mars", "gale", "curiosity", "temperature", "température"], af: "À Gale Crater, l'instrument REMS de Curiosity mesure des écarts de ~60 °C en un seul jour — de +6 °C l'après-midi d'été à −73 °C la nuit. Les déserts marocains reproduisent environ la moitié de ce stress quotidien, au niveau des meilleurs sites analogues du monde.",
    a: "At Gale Crater, Curiosity's REMS instrument measures swings around 60 °C in a single day — from about +6 °C on summer afternoons to −73 °C at night. Morocco's deserts reproduce roughly half of that daily stress, matching the world's best analog sites." },
  { k: ["moon", "lune", "diviner", "pole", "pôle", "artemis"], af: "Selon LRO Diviner, l'équateur lunaire subit ~260 °C d'amplitude — irréplicable sur Terre. Mais les pôles lunaires, où Artemis installera ses bases, ont des amplitudes bien plus douces (~60 °C). C'est pour ça que notre comparateur montre la Lune : l'analogie dépend de l'endroit de la Lune qu'on vise.",
    a: "Per LRO Diviner, the lunar equator swings ~260 °C — impossible to replicate on Earth. But the lunar poles, where Artemis bases are planned, have far milder swings (~60 °C). That's why our comparator includes the Moon: the right analog depends on which part of the Moon you're targeting." },
  { k: ["station", "base", "ibn battuta", "exomars"], af: "Nous proposons l'Atlas Analog Station dans le Tafilalet : cinq terrains analogues distincts dans un rayon de 150 km, ~6 kWh/m²/jour d'énergie solaire, et un palmarès — le Ibn Battuta Centre a testé l'instrument DREAMS d'ExoMars au Maroc pendant trois ans.",
    a: "We propose the Atlas Analog Station in the Tafilalet: five distinct analog terrains within 150 km, ~6 kWh/m²/day of solar power, and a track record — the Ibn Battuta Centre tested the ExoMars DREAMS instrument in Morocco for three years." },
  { k: ["data", "nasa", "source", "power", "données"], af: "Tous les chiffres climatiques viennent de l'API NASA POWER (climatologie). Mars : MSL REMS (Curiosity). Lune : LRO Diviner. Altitude : SRTM. Images : NASA Worldview et fonds Esri. Liens Sentinel-2 : Copernicus (ESA). Tout est listé dans la section Sources.",
    a: "All climate figures come from the NASA POWER API (climatology). Mars values: MSL REMS (Curiosity). Lunar values: LRO Diviner. Elevation: SRTM. Imagery: NASA Worldview and Esri basemaps. Sentinel-2 links: Copernicus (ESA). Everything is listed in the Sources section." },
  { k: ["limit", "wrong", "break", "gravity", "atmosphere", "radiation", "limite", "gravité", "atmosphère", "rayonnement", "faux"], af: "Honnêtement ? Le Maroc ne peut pas reproduire la gravité (1 g contre 0,38 g sur Mars), l'atmosphère ténue de CO2, le rayonnement, ni le froid polaire. Il excelle pour le stress thermique, l'aridité, les processus éoliens, la géologie et l'isolement — et on le dit exactement comme ça sur la page.",
    a: "Honestly? Morocco cannot replicate gravity (1 g vs 0.38 g on Mars), the thin CO2 atmosphere, radiation, or polar cold. It excels at thermal stress, aridity, aeolian processes, geology and isolation — and we say exactly that on the page." },
  { k: ["who", "team", "made", "built", "qui", "équipe"], af: "RED ATLAS a été construit pour le NASA Space Apps Challenge 2026 (Casablanca) avec les données ouvertes de la NASA. Code sous licence MIT ; des outils IA ont assisté le développement, déclarés dans la section Sources.",
    a: "RED ATLAS was built for the NASA Space Apps Challenge 2026 (Casablanca) with NASA open data. Code is MIT-licensed; AI tools assisted development and are disclosed in the Sources section." }
];

const GREETING = {
  en: "Hi! I'm the Analog Guide — I answer from this page's NASA-sourced data, in English or French. Ask me anything about the sites, the scores, or the discovery.",
  fr: "Salut ! Je suis le Guide Analogue — je réponds à partir des données NASA de cette page, en français ou en anglais. Demandez-moi un site, un score, ou la découverte du moteur."
};
const FALLBACK = {
  en: "I don't have that in my NASA-sourced data. Try: a site (Erg Chebbi, M'hamid, Agoudal…), the TSI or MLI scores, the Guelmim–Assa machine discovery, Mars/Moon references, or the Atlas Analog Station.",
  fr: "Je n'ai pas ça dans mes données NASA. Essayez : un site (Erg Chebbi, M'hamid, Agoudal…), les scores TSI ou MLI, la découverte Guelmim–Assa, les références Mars/Lune, ou l'Atlas Analog Station."
};

function isFrench(q) {
  return /[àâçéèêëîïôùû]|\b(le|la|les|des|une?|est|sont|quel|quelle|quoi|pourquoi|comment|c'est|ou|où|avec|dans|sur|plus|mieux)\b/i.test(q);
}

function kbAnswer(q) {
  const fr = isFrench(q);
  const ql = q.toLowerCase();
  let best = null, bestScore = 0;
  for (const item of KB) {
    const score = item.k.reduce((n, kw) => n + (ql.includes(kw) ? 1 : 0), 0);
    if (score > bestScore) { bestScore = score; best = item; }
  }
  if (bestScore === 0) return fr ? FALLBACK.fr : FALLBACK.en;
  return fr ? best.af : best.a;
}

const chatPanel = document.getElementById("chatPanel");
const chatLog = document.getElementById("chatLog");
document.getElementById("chatFab").addEventListener("click", () => {
  chatPanel.hidden = !chatPanel.hidden;
  if (!chatPanel.hidden && chatLog.children.length === 0) addMsg("bot", GREETING[LANG]);
});
document.getElementById("chatClose").addEventListener("click", () => chatPanel.hidden = true);

function addMsg(role, text) {
  const d = document.createElement("div");
  d.className = "msg " + role;
  d.textContent = text;
  chatLog.appendChild(d);
  chatLog.scrollTop = chatLog.scrollHeight;
  return d;
}

document.getElementById("chatForm").addEventListener("submit", async e => {
  e.preventDefault();
  const input = document.getElementById("chatInput");
  const q = input.value.trim();
  if (!q) return;
  input.value = "";
  addMsg("user", q);
  const thinking = addMsg("bot", "…");

  // Try the live agent (Vercel function → Groq). Fall back to local KB after 4 s.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: q }),
      signal: controller.signal
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error("api");
    const data = await res.json();
    if (!data.answer) throw new Error("api");
    thinking.textContent = data.answer;
  } catch {
    clearTimeout(timer);
    thinking.textContent = kbAnswer(q);
  }
});

/* ---------------- Analyze Anywhere: user picks a point, NASA data + AI judge it ---------------- */
let analyzeMode = true;   // ON by default: click anywhere on the map = instant analysis
let analyzeMarker = null;
const analyzeBtn = document.getElementById("analyzeBtn");
analyzeBtn.classList.add("active");

analyzeBtn.addEventListener("click", () => {
  analyzeMode = !analyzeMode;
  analyzeBtn.classList.toggle("active", analyzeMode);
  if (analyzeMode && zoneMode) zoneBtn.click();   // mutual exclusion
  map.getContainer().style.cursor = analyzeMode ? "crosshair" : "";
});

map.on("click", e => {
  if (!analyzeMode) return;
  // ignore clicks that landed on a site/control/discovery marker — those open site files
  const t = e.originalEvent && e.originalEvent.target;
  if (t && t.closest && t.closest(".leaflet-marker-pane")) return;
  const { lat, lng } = e.latlng;
  if (analyzeMarker) analyzeMarker.remove();
  // vector marker: always visible, no CDN image needed
  analyzeMarker = L.circleMarker([lat, lng], {
    radius: 10, color: "#ffd24d", weight: 3, fillColor: "#e8492e", fillOpacity: 0.9
  }).addTo(map);
  analyzePoint(lat, lng);
});

const MONTH_KEYS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

function localVerdict(st, fr) {
  const tier = st.mli >= 70
    ? (fr ? "fort potentiel analogue martien — le stress thermique et l'aridité rivalisent avec les sites classiques"
          : "strong Mars-analog potential — thermal stress and aridity rival the classic sites")
    : st.mli >= 55
    ? (fr ? "analogue modéré — utile pour certains tests (mobilité, opérations), pas pour tous"
          : "a moderate analog — useful for some tests (mobility, ops), not all")
    : (fr ? "analogue faible — trop humide ou trop doux pour un stress de classe martienne"
          : "a weak analog — too wet or too mild for Mars-class stress");
  const lim = fr
    ? "Limite honnête : ni la gravité, ni l'atmosphère ténue, ni le rayonnement ne sont reproductibles sur Terre."
    : "Honest limit: gravity, thin atmosphere and radiation cannot be replicated anywhere on Earth.";
  return fr
    ? `Avec ${st.swing} °C d'amplitude jour/nuit (TSI ${st.tsi}) et ${st.precip} mm/j de pluie, ce point obtient un MLI de ${st.mli}/100 : ${tier}. ${lim}`
    : `With a ${st.swing} °C diurnal swing (TSI ${st.tsi}) and ${st.precip} mm/day of rain, this point scores MLI ${st.mli}/100: ${tier}. ${lim}`;
}

async function analyzePoint(lat, lon) {
  const fr = LANG === "fr";
  const card = document.getElementById("siteCard");
  card.innerHTML = `
    <h3>📍 ${lat.toFixed(2)}°, ${lon.toFixed(2)}°</h3>
    <div class="badge">${fr ? "Analyse en direct" : "Live analysis"}</div>
    <p style="color:var(--muted)">${fr ? "Interrogation de l'API NASA POWER pour ce point exact…" : "Querying the NASA POWER API for this exact point…"}</p>`;

  // 1) Live NASA POWER climatology (CORS-enabled public API)
  let st = null;
  try {
    const u = `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=T2M,T2M_MAX,T2M_MIN,PRECTOTCORR,WS10M,ALLSKY_SFC_SW_DWN&community=AG&longitude=${lon.toFixed(4)}&latitude=${lat.toFixed(4)}&format=JSON`;
    const j = await (await fetch(u)).json();
    const P = j.properties.parameter;
    const swing = MONTH_KEYS.reduce((a, m) => a + (P.T2M_MAX[m] - P.T2M_MIN[m]), 0) / 12;
    const x = {
      swing: +swing.toFixed(1),
      precipMmDay: P.PRECTOTCORR.ANN,
      windMs: P.WS10M.ANN,
      solarMJm2: P.ALLSKY_SFC_SW_DWN.ANN
    };
    const sc = mliScores(x);
    st = {
      swing: x.swing, precip: x.precipMmDay, wind: x.windMs, solar: x.solarMJm2,
      mli: Math.round(100 * sc.reduce((a, b) => a + b, 0) / 4),
      tsi: tsi(x.swing), scores: sc,
      monthly: MONTH_KEYS.map(m => +P.T2M[m].toFixed(1))
    };
    // the radar in the Science section follows the analyzed point too
    buildRadar({
      name: `📍 ${lat.toFixed(2)}°, ${lon.toFixed(2)}°`,
      swing: st.swing, precipMmDay: st.precip, windMs: st.wind, solarMJm2: st.solar
    });
  } catch {
    card.innerHTML = `<h3>📍 ${lat.toFixed(2)}°, ${lon.toFixed(2)}°</h3>
      <p style="color:var(--red2)">${fr ? "L'API NASA POWER n'a pas répondu. Vérifiez votre connexion et réessayez." : "The NASA POWER API did not answer. Check your connection and try again."}</p>`;
    return;
  }

  // 2) Render the computed card immediately
  const labels = fr
    ? ["Cyclage thermique", "Aridité", "Éolien (vent)", "Charge solaire"]
    : ["Thermal cycling", "Aridity", "Aeolian (wind)", "Solar load"];
  const bars = st.scores.map((v, i) => `
    <div class="abar"><span>${labels[i]}</span>
      <div class="abar-track"><div class="abar-fill" style="width:${Math.round(v * 100)}%"></div></div>
      <strong>${(v).toFixed(2)}</strong>
    </div>`).join("");

  card.innerHTML = `
    <h3>📍 ${lat.toFixed(2)}°, ${lon.toFixed(2)}°</h3>
    <div class="badge">${fr ? "Analyse en direct · NASA POWER" : "Live analysis · NASA POWER"}</div>
    <div class="big-mli">${st.mli}<span>/100 MLI</span></div>
    <div class="kv">
      ${kv("TSI (Mars = 100)", st.tsi)}
      ${kv(fr ? "Amplitude jour/nuit" : "Diurnal swing", st.swing + " °C")}
      ${kv(fr ? "Pluie" : "Rain", st.precip + " mm/day")}
      ${kv(fr ? "Vent" : "Wind", st.wind + " m/s")}
      ${kv(fr ? "Solaire" : "Solar", st.solar + " MJ/m²/day")}
    </div>
    <h4>${fr ? "Empreinte analogue" : "Analog fingerprint"}</h4>
    ${bars}
    <h4>${fr ? "Températures mensuelles vs Mars" : "Monthly temperatures vs Mars"}</h4>
    <div class="pt-chart"><canvas id="pointTemp"></canvas></div>
    <h4>${fr ? "Verdict de l'agent IA" : "AI agent verdict"}</h4>
    <p id="aiVerdict" style="color:var(--muted)">…</p>`;

  if (window.__pointChart) { window.__pointChart.destroy(); window.__pointChart = null; }
  window.__pointChart = new Chart(document.getElementById("pointTemp"), {
    type: "line",
    data: {
      labels: ["J","F","M","A","M","J","J","A","S","O","N","D"],
      datasets: [
        { label: fr ? "Ce point (moy °C)" : "This point (avg °C)", data: st.monthly, borderColor: "#e8492e", backgroundColor: "rgba(232,73,46,.12)", fill: true, tension: .35, pointRadius: 0 },
        { label: "Mars day (~+6 °C)", data: Array(12).fill(6), borderColor: "#e8b04d", borderDash: [5, 5], pointRadius: 0 },
        { label: "Mars night (~−73 °C)", data: Array(12).fill(-73), borderColor: "#5a9bd5", borderDash: [5, 5], pointRadius: 0 }
      ]
    },
    options: {
      plugins: { legend: { labels: { color: "#cfd5e1", font: { size: 9 }, boxWidth: 12 } } },
      scales: {
        x: { grid: { color: "#262c3d" }, ticks: { color: "#9aa3b5", font: { size: 9 } } },
        y: { grid: { color: "#262c3d" }, ticks: { color: "#9aa3b5", font: { size: 9 } } }
      }
    }
  });

  // 3) AI verdict via Groq (server-side key); local fallback if unavailable
  const vEl = document.getElementById("aiVerdict");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat, lon, stats: st, lang: LANG }),
      signal: controller.signal
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error("api");
    const data = await res.json();
    if (!data.verdict) throw new Error("api");
    vEl.textContent = data.verdict;
    vEl.style.color = "#cfd5e1";
  } catch {
    clearTimeout(timer);
    vEl.textContent = localVerdict(st, fr);
    vEl.style.color = "#cfd5e1";
  }
}

/* ---------------- Zone Analysis: draw a rectangle, get a full analog report ---------------- */
let zoneMode = false, zoneCorner = null, zoneRect = null, zoneCornerMarker = null;
const zoneBtn = document.getElementById("zoneBtn");
const zoneModal = document.getElementById("zoneModal");

zoneBtn.addEventListener("click", () => {
  zoneMode = !zoneMode;
  zoneCorner = null;
  if (zoneCornerMarker) { zoneCornerMarker.remove(); zoneCornerMarker = null; }
  zoneBtn.classList.toggle("active", zoneMode);
  if (zoneMode && analyzeMode) {           // zone drawing takes over the clicks
    analyzeMode = false;
    analyzeBtn.classList.remove("active");
  } else if (!zoneMode && !analyzeMode) {  // leaving zone mode: restore point analysis
    analyzeMode = true;
    analyzeBtn.classList.add("active");
  }
  zoneBtn.textContent = zoneMode
    ? (LANG === "fr" ? "⬚ Cliquez le 1er coin…" : "⬚ Click the 1st corner…")
    : I18N[LANG].zoneBtn;
  map.getContainer().style.cursor = zoneMode ? "crosshair" : "";
});

document.getElementById("zoneClose").addEventListener("click", () => zoneModal.hidden = true);
zoneModal.addEventListener("click", e => { if (e.target === zoneModal) zoneModal.hidden = true; });

map.on("click", e => {
  if (!zoneMode) return;
  if (!zoneCorner) {
    zoneCorner = e.latlng;
    zoneCornerMarker = L.marker(e.latlng).addTo(map);
    zoneBtn.textContent = LANG === "fr" ? "⬚ Cliquez le coin opposé…" : "⬚ Click the opposite corner…";
    return;
  }
  const bounds = L.latLngBounds(zoneCorner, e.latlng);
  if (zoneRect) zoneRect.remove();
  if (zoneCornerMarker) { zoneCornerMarker.remove(); zoneCornerMarker = null; }
  zoneRect = L.rectangle(bounds, { color: "#ffd24d", weight: 2, fillOpacity: 0.08 }).addTo(map);
  zoneCorner = null;
  zoneMode = false;
  zoneBtn.classList.remove("active");
  zoneBtn.textContent = I18N[LANG].zoneBtn;
  map.getContainer().style.cursor = "";
  analyzeMode = true;                      // back to point-analysis mode after a zone
  analyzeBtn.classList.add("active");
  analyzeZone(bounds);
});

async function fetchPowerPoint(lat, lon) {
  const u = `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=T2M,T2M_MAX,T2M_MIN,PRECTOTCORR,WS10M,ALLSKY_SFC_SW_DWN&community=AG&longitude=${lon.toFixed(4)}&latitude=${lat.toFixed(4)}&format=JSON`;
  const j = await (await fetch(u)).json();
  return j.properties.parameter;
}

let zoneTempChart = null, zoneTsiChart = null;

async function analyzeZone(bounds) {
  const fr = LANG === "fr";
  zoneModal.hidden = false;
  const body = document.getElementById("zoneBody");
  body.innerHTML = `<p style="color:var(--muted)">${fr
    ? "Échantillonnage NASA POWER sur 5 points de la zone…"
    : "Sampling NASA POWER at 5 points across the zone…"}</p>`;

  const c = bounds.getCenter();
  const n = bounds.getNorth(), s = bounds.getSouth(), e = bounds.getEast(), w = bounds.getWest();
  const latMid = (n + s) / 2, lonMid = (e + w) / 2;
  const samples = [
    [latMid, lonMid],
    [n - (n - s) * 0.25, w + (e - w) * 0.25],
    [n - (n - s) * 0.25, e - (e - w) * 0.25],
    [s + (n - s) * 0.25, w + (e - w) * 0.25],
    [s + (n - s) * 0.25, e - (e - w) * 0.25]
  ];
  // rough area in km²
  const areaKm2 = Math.round(
    (n - s) * 111 * (e - w) * 111 * Math.cos(latMid * Math.PI / 180));

  let Ps;
  try { Ps = await Promise.all(samples.map(([la, lo]) => fetchPowerPoint(la, lo))); }
  catch {
    body.innerHTML = `<p style="color:var(--red2)">${fr ? "L'API NASA POWER n'a pas répondu. Réessayez." : "The NASA POWER API did not answer. Try again."}</p>`;
    return;
  }

  const avg = k => Ps.reduce((a, P) => a + P[k].ANN, 0) / Ps.length;
  const swing = Ps.reduce((a, P) => a + MONTH_KEYS.reduce((x, m) => x + (P.T2M_MAX[m] - P.T2M_MIN[m]), 0) / 12, 0) / Ps.length;
  const monthly = MONTH_KEYS.map((_, i) => +(Ps.reduce((a, P) => a + P.T2M[MONTH_KEYS[i]], 0) / Ps.length).toFixed(1));
  const x = { swing: +swing.toFixed(1), precipMmDay: +avg("PRECTOTCORR").toFixed(2), windMs: +avg("WS10M").toFixed(1), solarMJm2: +avg("ALLSKY_SFC_SW_DWN").toFixed(1) };
  const sc = mliScores(x);
  const st = { swing: x.swing, precip: x.precipMmDay, wind: x.windMs, solar: x.solarMJm2,
    mli: Math.round(100 * sc.reduce((a, b) => a + b, 0) / 4), tsi: tsi(x.swing), scores: sc };
  buildRadar({ name: fr ? "⬚ Votre zone" : "⬚ Your zone",
    swing: st.swing, precipMmDay: st.precip, windMs: st.wind, solarMJm2: st.solar });

  // engine overlap (Morocco grid)
  let engineHtml = "";
  if (window.__engine) {
    const inside = window.__engine.points.filter(p =>
      p.lat <= n && p.lat >= s && p.lon >= w && p.lon <= e);
    if (inside.length) {
      const meanMli = (inside.reduce((a, p) => a + p.mli, 0) / inside.length).toFixed(1);
      engineHtml = `<div class="zone-engine">🛰️ ${fr
        ? `Le moteur a déjà scanné cette zone : <strong>${inside.length} point(s)</strong> de la grille s'y trouvent, MLI moyen <strong>${meanMli}</strong>.`
        : `The Engine already scanned this zone: <strong>${inside.length} grid point(s)</strong> inside, mean MLI <strong>${meanMli}</strong>.`}</div>`;
    }
  }

  const labels = fr ? ["Thermique", "Aridité", "Éolien", "Solaire"] : ["Thermal", "Aridity", "Aeolian", "Solar"];
  const bars = st.scores.map((v, i) => `
    <div class="abar"><span>${labels[i]}</span>
      <div class="abar-track"><div class="abar-fill" style="width:${Math.round(v * 100)}%"></div></div>
      <strong>${v.toFixed(2)}</strong></div>`).join("");

  body.innerHTML = `
    <div class="zone-top">
      <div class="big-mli">${st.mli}<span>/100 MLI · TSI ${st.tsi}</span></div>
      <p class="zone-coords">${s.toFixed(2)}°→${n.toFixed(2)}° N · ${Math.abs(w).toFixed(2)}°→${Math.abs(e).toFixed(2)}° W · ~${areaKm2.toLocaleString()} km² · ${fr ? "moyenne de 5 points" : "5-point average"}</p>
    </div>
    ${engineHtml}
    <div class="zone-grid">
      <div>
        <h4>${fr ? "Empreinte analogue" : "Analog fingerprint"}</h4>${bars}
        <div class="kv" style="margin-top:.8rem">
          ${kv(fr ? "Amplitude jour/nuit" : "Diurnal swing", st.swing + " °C")}
          ${kv(fr ? "Pluie" : "Rain", st.precip + " mm/day")}
          ${kv(fr ? "Vent" : "Wind", st.wind + " m/s")}
          ${kv(fr ? "Solaire" : "Solar", st.solar + " MJ/m²/day")}
        </div>
      </div>
      <div><h4>${fr ? "Températures mensuelles" : "Monthly temperatures"}</h4><canvas id="zoneTemp"></canvas></div>
    </div>
    <div class="zone-grid" style="margin-top:1rem">
      <div><h4>${fr ? "TSI : cette zone vs les sites étudiés" : "TSI: this zone vs the studied sites"}</h4><canvas id="zoneTsi"></canvas></div>
      <div><h4>${fr ? "Verdict de l'agent IA" : "AI agent verdict"}</h4><p id="zoneVerdict" style="color:var(--muted)">…</p></div>
    </div>`;

  const MONTHS_S = ["J","F","M","A","M","J","J","A","S","O","N","D"];
  if (zoneTempChart) zoneTempChart.destroy();
  zoneTempChart = new Chart(document.getElementById("zoneTemp"), {
    type: "line",
    data: { labels: MONTHS_S, datasets: [
      { label: fr ? "Zone (moy °C)" : "Zone (avg °C)", data: monthly, borderColor: "#e8492e", backgroundColor: "rgba(232,73,46,.12)", fill: true, tension: .35 },
      { label: "Mars Gale day (~+6 °C)", data: Array(12).fill(6), borderColor: "#e8b04d", borderDash: [6, 6], pointRadius: 0 },
      { label: "Mars Gale night (~−73 °C)", data: Array(12).fill(-73), borderColor: "#5a9bd5", borderDash: [6, 6], pointRadius: 0 }
    ]},
    options: { plugins: { legend: { labels: { color: "#cfd5e1", font: { size: 10 } } } },
      scales: { x: { grid: { color: "#262c3d" }, ticks: { color: "#9aa3b5" } },
                y: { grid: { color: "#262c3d" }, ticks: { color: "#9aa3b5" } } } }
  });

  if (zoneTsiChart) zoneTsiChart.destroy();
  const tsiNames = [...SITES.map(x => x.name), ...CONTROLS.map(x => x.name)];
  const tsiVals = [...SITES.map(x => tsi(x.swing)), ...CONTROLS.map(x => tsi(x.swing))];
  zoneTsiChart = new Chart(document.getElementById("zoneTsi"), {
    type: "bar",
    data: { labels: [fr ? "VOTRE ZONE" : "YOUR ZONE", ...tsiNames],
      datasets: [{ data: [st.tsi, ...tsiVals],
        backgroundColor: ["#ffd24d", ...SITES.map(() => "#e8492e"), ...CONTROLS.map(() => "#5a6373")], borderRadius: 5 }]},
    options: { indexAxis: "y", plugins: { legend: { display: false } },
      scales: { x: { max: 110, grid: { color: "#262c3d" }, ticks: { color: "#9aa3b5" } },
                y: { grid: { display: false }, ticks: { color: "#eef1f7", font: { size: 10 } } } } }
  });

  // AI verdict (Groq via server; local fallback)
  const vEl = document.getElementById("zoneVerdict");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch("/api/analyze", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat: c.lat, lon: c.lng, stats: st, lang: LANG, zoneKm2: areaKm2 }),
      signal: controller.signal
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error("api");
    const data = await res.json();
    if (!data.verdict) throw new Error("api");
    vEl.textContent = data.verdict;
  } catch {
    clearTimeout(timer);
    vEl.textContent = localVerdict(st, fr);
  }
  vEl.style.color = "#cfd5e1";
}

/* ---------------- init ---------------- */
applyLang();
buildTempChart("erg_chebbi");
showSite(SITES[0]);
