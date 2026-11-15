// RED ATLAS — Vercel Serverless Function
// Proxies the Analog Guide chatbot to Groq so the API key stays server-side.
// Env var required in Vercel dashboard: GROQ_API_KEY
// Model: openai/gpt-oss-120b (fast, free tier)

const SYSTEM_PROMPT = `You are the "Analog Guide" for RED ATLAS, a NASA Space Apps 2026 project.
You answer ONLY from the verified project data below. If a question is outside it, say so briefly and suggest a related topic. Keep answers under 80 words, plain language, no jargon without a one-line explanation.

PROJECT DATA (NASA POWER climatology unless noted):
- Morocco candidate sites (diurnal swing / hottest month avg max / coldest month avg min / rain / wind / TSI vs Mars=100):
  Erg Chebbi: 31.0°C swing, 44.8°C max, -4.4°C min, 0.23 mm/day rain, 4.2 m/s wind, TSI 52. Dune analog for Martian dune fields.
  Tafilalet (Erfoud): 30.8°C, 44.1°C, -4.5°C, 0.44 mm/day, 3.8 m/s, TSI 51. Hosted MARS2013 Mars analog mission (Austrian Space Forum, Ibn Battuta Centre, NASA JPL partner).
  Agoudal (High Atlas, ~2300 m): 29.9°C, 37.2°C, -10.0°C, 0.59 mm/day, TSI 50. Meteorite find site, coldest test environment.
  Anti-Atlas (Tafraoute): 30.6°C, 42.9°C, -3.6°C, 4.9 m/s wind, TSI 51. Precambrian rocks ~2 billion years old, analog of Noachian Mars crust.
  M'hamid (Drâa sebkhas): 31.1°C, 46.9°C (hotter than Death Valley's 46.2°C), -3.3°C, 0.23 mm/day (~84 mm/year), TSI 52. Dry salt lakes analogous to Martian paleolake basins like Jezero.
- Control sites (world-recognized analogs, same NASA data and formula): Atacama 31.1°C swing (TSI 52), Death Valley 34.0°C (TSI 57), Haughton Crater 32.7°C (TSI 55, reaches -50°C), Askja Iceland 23.0°C (TSI 38, Apollo training 1965/1967).
- Mars reference: Gale Crater, MSL Curiosity REMS — ~60°C diurnal swing, +6°C summer afternoons, -73°C nights (approximate published ranges).
- Moon reference: LRO Diviner — equatorial swing ~260°C (+120°C day, -130°C night).
- TSI formula: mean diurnal swing of a site ÷ 60°C (Gale) × 100.
- Key facts: Tissint Martian meteorite fell in Morocco on 18 July 2011. Ibn Battuta Centre (Marrakech) tested the ExoMars DREAMS instrument in Morocco for 3 years. RED ATLAS proposes the "Atlas Analog Station" in the Tafilalet.
- Honest limits: Morocco cannot replicate gravity, thin atmosphere, radiation, or polar cold.`;

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const question = (req.body && req.body.question || "").slice(0, 500);
  if (!question) return res.status(400).json({ error: "missing question" });
  if (!process.env.GROQ_API_KEY) return res.status(503).json({ error: "no key" });

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
        temperature: 0.3,
        reasoning_effort: "low",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: question }
        ]
      })
    });
    if (!r.ok) return res.status(502).json({ error: "groq " + r.status });
    const data = await r.json();
    const answer = data.choices?.[0]?.message?.content?.trim();
    if (!answer) return res.status(502).json({ error: "empty" });
    res.status(200).json({ answer });
  } catch (e) {
    res.status(500).json({ error: "proxy failure" });
  }
};
