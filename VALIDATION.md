# RED ATLAS — Proof & Validation

**One-command verification:** `python engine/verify.py` recomputes every headline number live from the NASA POWER API and prints PASS/FAIL. Nothing to install, no account, no key. Last run: **9/9 PASS** (2026-11-15).

---

## Why this file exists

Judges score five criteria: **Impact, Creativity, Validity, Relevance, Presentation**. This document maps each criterion to a concrete, checkable proof inside the project.

## 1. Validity — the numbers are NASA's, not ours

| Claim | Source | How to verify |
|---|---|---|
| Erg Chebbi diurnal swing = **31.0 °C** | NASA POWER climatology (T2M_MAX−T2M_MIN, 12-month mean) | `engine/verify.py` |
| M'hamid July avg max = **46.9 °C** > Death Valley **46.2 °C** | NASA POWER climatology, both sites | `engine/verify.py` |
| Atacama (control) swing = **31.1 °C** → TSI 52 = Erg Chebbi TSI 52 | Same API, same formula for both | `engine/verify.py` |
| Mars reference: Gale ≈ **60 °C** swing | MSL Curiosity REMS published ranges | cited on the site |
| Moon reference: equator ~**260 °C**, poles ~**60 °C** | LRO Diviner published products | cited on the site |
| 159-point Morocco grid + k-means (k=3) | NASA POWER, one call per point | `engine/scan.py` regenerates `engine/engine.json` |

Method: equal weights, no tuning, formula published on the page itself:
`TSI = swing ÷ 60 °C × 100` · `MLI = mean(thermal, aridity, wind, solar) × 100`.

**Honesty is part of the proof:** the site has a dedicated "Where the analogy breaks" section (gravity, atmosphere, radiation, polar cold). A model that admits its limits is more credible than one that hides them.

## 2. Creativity — the machine found what we didn't pick

- We did **not** hand-pick the conclusion. The Analog Engine scanned 159 points and its top discovery — the **Guelmim–Assa steppe (MLI 79.9)** — was on none of our manual lists. That is the difference between a map and a discovery tool.
- **Analyze Anywhere**: click ANY point on Earth → live NASA POWER data → MLI/TSI → an AI-agent verdict with one honest limitation. The tool works on the whole planet, not just our five sites.
- **Zone Analysis**: draw any rectangle → full analog report (5-point sample), cross-checked against the pre-computed engine grid.

## 3. Impact — a decision, not a dashboard

The output is a siting decision: the **Atlas Analog Station**, located by the algorithm at the Anti-Atlas corridor (29.3°N, 8.5°W), independently confirming the range where MARS2013 and ESA's ExoMars DREAMS tests already happened — and extending it. Who benefits: analog-mission planners, Moroccan universities and the Ibn Battuta Centre, ESA/NASA instrument teams that currently fly hardware to other continents.

## 4. Relevance — it answers the challenge literally

The challenge asks to identify Earth locations that analog the permanent Moon-base locations and Mars. RED ATLAS identifies them **systematically** (engine grid), scores them (MLI/TSI vs published Mars/Moon references), and addresses the Moon-base nuance directly: lunar *polar* swings (~60 °C, LRO Diviner) — not the equatorial 260 °C — are the right comparison, and Morocco-class swings sit in exactly that regime.

## 5. Presentation — 30-second story

One sentence carries the whole project: **"We built a machine that searches for Mars on Earth — and the machine found Morocco."** Every visual on the site (map, fingerprint radar, swing comparator) exists to make that sentence checkable in under a minute.

---

*AI/SI disclosure: SI tools accelerated development (code drafting, structuring, data-pipeline scripting) under full human direction. All data values originate from the cited NASA APIs; all historical claims are sourced on the site.*
