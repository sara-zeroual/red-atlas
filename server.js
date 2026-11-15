// RED ATLAS — serveur statique de dev (zero dependance)
// Usage : node server.js --port 7100 --host 127.0.0.1
const http = require("http");
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
function arg(name, def) {
  const i = args.indexOf(name);
  return i !== -1 && args[i + 1] ? args[i + 1] : def;
}
const PORT = parseInt(arg("--port", process.env.PORT || "7100"), 10);
const HOST = arg("--host", process.env.HOST || "127.0.0.1");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml",
  ".ico": "image/x-icon", ".md": "text/markdown; charset=utf-8"
};

http.createServer(async (req, res) => {
  let urlPath = decodeURIComponent(req.url.split("?")[0]);

  // Local dev proxy for the Analog Guide + Analyze Anywhere (same contract as api/*.js on Vercel)
  if ((urlPath === "/api/chat" || urlPath === "/api/analyze") && req.method === "POST") {
    let body = "";
    req.on("data", c => body += c);
    req.on("end", async () => {
      res.setHeader("Content-Type", "application/json");
      if (!process.env.GROQ_API_KEY) { res.writeHead(503); return res.end(JSON.stringify({ error: "no key" })); }
      try {
        const payload = JSON.parse(body);
        const fn = require(urlPath === "/api/chat" ? "./api/chat.js" : "./api/analyze.js");
        // adapt the Vercel handler to plain Node
        const fakeRes = {
          _h: {}, setHeader(k, v) { this._h[k] = v; },
          status(c) { this._c = c; return this; },
          json(o) { Object.entries(this._h).forEach(([k, v]) => res.setHeader(k, v)); res.writeHead(this._c); res.end(JSON.stringify(o)); },
          end() { res.writeHead(this._c || 200); res.end(); }
        };
        await fn({ method: "POST", body: payload }, fakeRes);
      } catch { res.writeHead(500); res.end(JSON.stringify({ error: "proxy failure" })); }
    });
    return;
  }

  if (urlPath === "/") urlPath = "/index.html";
  const file = path.join(__dirname, path.normalize(urlPath));
  if (!file.startsWith(__dirname)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end("404 — " + urlPath); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  });
}).listen(PORT, HOST, () => console.log(`RED ATLAS → http://${HOST}:${PORT}/`));
