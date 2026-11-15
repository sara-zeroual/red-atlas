# 🔴 RED ATLAS — Morocco, Earth's Training Ground for Mars

**NASA Space Apps Challenge 2026 — Casablanca**
Challenge: *Identify Earth Locations that Analog the Permanent Moon Base Locations and Mars*

> **We built a machine that searches for Mars on Earth — and the machine found Morocco.**
> We didn't pick the sites. The data did.

---

## What this is

An interactive web app that uses **NASA's own open data** to systematically find, score and analyze planetary analog terrain — then proves Morocco rivals the world's recognized analog sites (Atacama, Death Valley, Haughton, Iceland) and proposes where to build the **Atlas Analog Station**.

### Four things you can do

1. **The Analog Engine** — we scanned **159 points across Morocco** (0.5° grid, land-masked) through the NASA POWER API, computed a **Mars Likeness Index (MLI)** for each, and let **k-means clustering (k=3)** find the analog zones by itself. The engine's top discovery — the **Guelmim–Assa steppe** (MLI 79.9) — was on none of our hand-picked lists.
2. **Analyze Anywhere** — click ANY point on Earth: live NASA POWER climatology + MLI/TSI scores + an **AI agent verdict** (Groq, server-side key) with one honest limitation.
3. **Zone Analysis** — draw a rectangle on the map: full analog report from a 5-point NASA POWER sample (fingerprint, monthly temperatures vs Mars, TSI comparison against all study sites, AI verdict), cross-checked against the Engine's pre-computed grid.
4. **The proof** — TSI comparator (Morocco vs the analog sites NASA already trusts), Moon/Mars/Morocco diurnal-swing comparison (LRO Diviner, MSL REMS), honest "where the analogy breaks" section.

## The metrics (published, reproducible)

```
TSI = mean diurnal swing of the site ÷ Gale Crater swing (≈60 °C, MSL REMS) × 100
MLI = mean( min(swing/60,1), max(1−rain/2,0), min(wind/6,1), min(solar/22,1) ) × 100
```

Equal weights, no tuning. Every figure regenerates from public API calls.

## NASA data used

| Source | Use |
|---|---|
| **NASA POWER API** (climatology) | All Earth climate data: T2M, T2M_MAX, T2M_MIN, PRECTOTCORR, WS10M, ALLSKY_SFC_SW_DWN — offline climatology + live queries |
| **NASA Worldview** (MODIS Terra) | True-color satellite imagery of the five candidate sites |
| **MSL Curiosity / REMS** | Mars reference: Gale Crater ≈60 °C diurnal swing |
| **LRO Diviner** | Lunar reference: ~260 °C equatorial vs ~60 °C polar swings |
| **NASA SRTM** | Site elevations |
| **NASA Earthdata / PDS** | Dataset discovery & planetary archive context |
| Partner portals | ESA Copernicus Browser (Sentinel-2 links per site), CSA RADARSAT, JAXA G-Portal |

## Key findings (NASA POWER climatology)

- Erg Chebbi's diurnal swing (31.0 °C) ≈ **Atacama** (31.1 °C) → TSI 52 = TSI 52
- M'hamid's July average maximum (46.9 °C) > **Death Valley** (46.2 °C)
- Drâa sebkhas: ~84 mm rain/year — near-Martian aridity
- The Engine's siting algorithm picked the **Anti-Atlas corridor (29.3°N, 8.5°W)** as the optimal station location — independently confirming the field-proven Tafilalet range (MARS2013, ExoMars DREAMS heritage)

## Tech stack

Vanilla JS + Leaflet + Chart.js · Vercel serverless functions (`/api/chat`, `/api/analyze`) proxying **Groq** (gpt-oss-120b) so the API key stays server-side · Python engine (`engine/scan.py`, stdlib + numpy) · PWA (offline-capable, installable) · Bilingual EN/FR (auto-detect)

## Run locally

```bash
node preview-server.js            # → http://localhost:7100/
GROQ_API_KEY=gsk_... node preview-server.js   # enables the live AI agent
```

## Regenerate the engine data

```bash
python engine/scan.py     # rescans the 159-point grid via NASA POWER → engine/engine.json
```

## AI / SI disclosure

Super Intelligence tools were used to accelerate development (code drafting, content structuring, data-pipeline scripting) under full human direction and verification. All data values come from the cited NASA APIs; all historical claims are sourced.

## License

MIT — see [LICENSE](LICENSE).
