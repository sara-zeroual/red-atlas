// RED ATLAS — Vercel Serverless Function
// AI verdict for a user-picked point: "Analyze Anywhere".
// Receives NASA POWER stats computed client-side, returns a short
// planetary-analog verdict via Groq. Env var: GROQ_API_KEY

const SYSTEM_PROMPT = `You are a planetary analog site scientist working for RED ATLAS (NASA Space Apps 2026).
The user picked a point on Earth. You receive its NASA POWER climatology and its Mars Likeness Index (MLI: mean of thermal cycling vs Gale Crater's ~60°C swing, aridity, aeolian wind activity, solar load, each 0-1) and TSI (thermal stress vs Mars=100).
Write a verdict of MAX 70 words, plain language:
1) How Mars-like this point is and what it could test (hardware thermal cycling, dust/aeolian ops, rover mobility, isolation ops...).
2) One honest limitation (gravity, atmosphere, radiation, cold, or wetness — pick the most relevant).
Never invent numbers beyond those given. Be direct, scientific, and concrete.`;

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const b = req.body || {};
  if (typeof b.lat !== "number" || typeof b.lon !== "number" || !b.stats)
    return res.status(400).json({ error: "missing fields" });
  if (!process.env.GROQ_API_KEY) return res.status(503).json({ error: "no key" });

  const lang = b.lang === "fr" ? "fr" : "en";
  const s = b.stats;
  const zoneLine = b.zoneKm2
    ? `This is a user-drawn ZONE of about ${b.zoneKm2} km² (stats = 5-point average).`
    : "This is a single point.";
  const userMsg = `Coordinates: ${b.lat.toFixed(3)}, ${b.lon.toFixed(3)}. ${zoneLine}
NASA POWER climatology: diurnal swing ${s.swing}°C, rain ${s.precip} mm/day, wind ${s.wind} m/s, solar ${s.solar} MJ/m²/day.
Computed scores: MLI ${s.mli}/100, TSI ${s.tsi} (Mars=100).
Answer in ${lang === "fr" ? "French" : "English"}.`;

  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        max_tokens: 900,
        temperature: 0.4,
        reasoning_effort: "low",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMsg }
        ]
      })
    });
    if (!r.ok) return res.status(502).json({ error: "groq " + r.status });
    const data = await r.json();
    const verdict = data.choices?.[0]?.message?.content?.trim();
    if (!verdict) return res.status(502).json({ error: "empty" });
    res.status(200).json({ verdict });
  } catch (e) {
    res.status(500).json({ error: "proxy failure" });
  }
};
