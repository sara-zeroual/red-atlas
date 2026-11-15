# RED ATLAS — Project Page (paste into spaceappschallenge.org)

---

## 1. The Problem & Relevance

As Artemis prepares permanent Moon bases and Mars exploration, analog missions cost millions and fly 10,000+ km to Chile, Canada or Iceland. The challenge asks: find *unexpected* Earth analogs, with a *systematic method*, and say honestly *where the analogy works and where it breaks*.

Our answer: **nobody had systematically scanned Morocco with NASA's own data.** The country already has Mars heritage — the Tissint Martian meteorite (2011), the MARS2013 analog mission (Austrian Space Forum, NASA JPL partner), and three years of ExoMars DREAMS instrument testing at the Ibn Battuta Centre. Yet no permanent analog station exists on the African continent.

## 2. Your Solution & Prototype/Demo

**RED ATLAS — we built a machine that searches for Mars on Earth, and the machine found Morocco.** Live demo: https://red-atlas-pi.vercel.app/

Four working components:

1. **The Analog Engine**: we scanned 159 points across Morocco (0.5° grid, land-masked to internationally recognized borders) via the NASA POWER API, computed a **Mars Likeness Index (MLI)** per point — mean of four mission-anchored scores (thermal cycling vs Gale Crater's ~60 °C swing, aridity, aeolian wind, solar load), equal weights, formula published — and let **k-means clustering (k=3)** find the analog zones by itself. The machine's top discovery, the **Guelmim–Assa steppe (MLI 79.9)**, was on none of our hand-picked lists. It also independently re-found the field-proven Tafilalet.
2. **Analyze Anywhere**: click ANY point on Earth → live NASA POWER climatology, MLI/TSI scores, analog fingerprint, and an **AI agent verdict** (Groq LLM, server-side key) stating what the point could test and one honest limitation.
3. **Zone Analysis**: draw a rectangle → full analog report from a 5-point NASA POWER sample: fingerprint, monthly temperatures vs Mars REMS references, TSI ranking against all study sites, AI verdict — cross-checked against the Engine's pre-computed grid.
4. **The proof**: TSI (Thermal Stress Index = site swing ÷ Gale ≈60 °C × 100) comparator. Morocco's Erg Chebbi (31.0 °C swing) **equals the Atacama** (31.1 °C). M'hamid (46.9 °C July max) **beats Death Valley** (46.2 °C). Plus a Moon/Mars/Morocco diurnal-swing comparison (LRO Diviner: poles ~60 °C vs equator ~260 °C) and an honest Limits section: gravity, atmosphere, radiation, polar cold cannot be replicated — we say so, in numbers.

**Local Impact** (inspired by the 2025 Global Winner playbook): one named place, one causal chain, one computed decision, one concrete first step. The Engine's siting algorithm picked the **Anti-Atlas corridor (29.3°N, 8.5°W)** as the optimal Atlas Analog Station location. **Phase 0 (90 days, <$500)**: deploy 3 thermal loggers at Erg Chebbi, Agoudal and the Guelmim–Assa discovery, compare ground truth vs NASA POWER, publish the delta — exactly how analog sites get scientifically validated.

## 3. NASA Data & Tech Stack

- **NASA POWER API** (climatology): all Earth climate data — T2M, T2M_MAX, T2M_MIN, PRECTOTCORR, WS10M, ALLSKY_SFC_SW_DWN — for the 159-point grid, the 9 study sites, AND live user queries (Analyze Anywhere / Zone Analysis)
- **NASA Worldview** (MODIS Terra): true-color satellite imagery of the five candidate sites
- **MSL Curiosity / REMS**: Mars reference swing (~60 °C, Gale Crater)
- **LRO Diviner**: lunar reference swings (equator ~260 °C, poles ~60 °C)
- **NASA SRTM**: site elevations · **NASA Earthdata & PDS**: dataset discovery
- Partner resources: **ESA Copernicus Browser** (Sentinel-2 link per site), CSA RADARSAT and JAXA G-Portal explored for follow-up SAR/precipitation layers
- Stack: Vanilla JS + Leaflet + Chart.js · Python engine (stdlib + numpy, `engine/scan.py` — rerun it yourself) · Vercel serverless functions proxying Groq (llama-3.1-8b-instant, key server-side) · PWA offline · bilingual EN/FR
- Open source (MIT): https://github.com/sara-zeroual/red-atlas

## 4. Impact

- **Who benefits**: Moroccan and African universities (first analog research infrastructure on the continent), the Ibn Battuta Centre's two decades of Mars work, Drâa-Tafilalet & Souss-Massa regions (high-tech jobs, astro-tourism), and every Mars program that needs cheaper, faster, more frequent field tests 3 h from Europe instead of 10,000 km away.
- **Scientific impact**: a published, reproducible method (MLI formula + open code + open data) that any country can rerun to find its own analogs — the Engine is not Morocco-specific, it is a replicable search tool.
- **Exploration impact**: a concrete, algorithm-selected station site and a budgeted 90-day validation plan that can start tomorrow.

---

## AI / SI use disclosure (required)

Super Intelligence tools were used to accelerate development (code drafting, content structuring, data-pipeline scripting) under full human direction and verification. All data values come from the cited NASA APIs; all historical claims are sourced.

## Video (30 s) — [URL YOUTUBE/LOOM]
