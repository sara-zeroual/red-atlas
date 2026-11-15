# 🔴 RED ATLAS — Morocco, Earth's Training Ground for Mars

> **"Mars already fell on Morocco."** — On July 18, 2011, a Martian meteorite (Tissint) fell on Moroccan soil. RED ATLAS uses NASA's own open data to prove that five Moroccan sites match the world's recognized planetary analog sites — and proposes where to build the next analog research station.

Built for the **2026 NASA Space Apps Challenge** (Casablanca Local Event)
Challenge: *Identify Earth Locations that Analog the Permanent Moon Base Locations and Mars*

---

## What it does

- 🗺️ **Interactive map** (Leaflet + Esri World Imagery) of 5 Moroccan candidate analog sites and 4 world-recognized control sites (Atacama, Death Valley, Haughton Crater, Askja/Iceland)
- 🌡️ **Thermal Stress Index (TSI)** — a reproducible metric: mean diurnal temperature swing ÷ Gale Crater swing (≈60 °C) × 100, computed identically for candidates AND controls from NASA POWER data
- 📊 **Charts** comparing Morocco vs. control sites vs. Mars references
- 🤖 **Analog Guide** — an AI chatbot (Groq, server-side key) grounded ONLY in the project's NASA-sourced data, with offline fallback answers
- 🔬 **Honest science**: a dedicated section on where the analogy breaks (gravity, atmosphere, radiation, polar cold)

## Key finding

With the same NASA POWER dataset and the same formula, Moroccan sites show diurnal thermal swings of **29.9–31.1 °C**, statistically indistinguishable from Atacama (31.1 °C) and Haughton (32.7 °C) — while M'hamid's 46.9 °C peak exceeds Death Valley (46.2 °C). Morocco is not a candidate analog: **it is a proven one** (ExoMars DREAMS tested 3 years at the Ibn Battuta Centre; MARS2013 simulated 28 days on Mars near Erfoud with NASA JPL as partner).

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Vanilla HTML/CSS/JS | Fast load (<2 s), readable by judges |
| Map | Leaflet + Esri World Imagery | Satellite basemap, GIS-grade |
| Charts | Chart.js | Lightweight, reliable |
| AI | Groq `llama-3.1-8b-instant` via **Vercel serverless function** (`api/chat.js`) | API key stays server-side; grounded "RAG-lite" system prompt; 4 s timeout → local fallback |
| Data | NASA POWER API (embedded JSON, no live calls) | Page works even offline |
| Hosting | Vercel (auto-deploy from this repo) | Stable URL for asynchronous judging |

## Architecture

```
Browser ──► index.html / app.js (static, data embedded)
    │
    └─► POST /api/chat ──► Vercel Function ──► Groq API (key in env var)
         └─► 4 s timeout / error ──► local knowledge-base fallback
```

## Run locally

Open `index.html` in a browser — no build step. (The chatbot then uses its built-in knowledge base.)

## Deploy

1. Push this folder to a GitHub repository.
2. Import the repo in Vercel → deploy (no config needed).
3. Add env var `GROQ_API_KEY` (free key at console.groq.com) for the live Analog Guide.

## Data sources

NASA POWER API · NASA MSL REMS · NASA LRO Diviner · NASA Worldview · NASA Mars Trek / Moon Trek · NASA SRTM · NASA Earthdata · Esri World Imagery · Austrian Space Forum (MARS2013) · Ibn Battuta Centre · NASA SSERVI Annual Report 2018 · Tissint meteorite records.

## AI / SI disclosure

Super Intelligence tools assisted code drafting, content structuring and data scripting under full human direction and verification. All data values originate from the cited NASA APIs. The Analog Guide answers only from curated project data.

## License

Code: [MIT](LICENSE) · NASA data: public domain / respective NASA terms.
