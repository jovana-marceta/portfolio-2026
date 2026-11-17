// Local server for development (and any plain Node host).
//   npm run dev   → this runs on :3001 next to Vite (:5173), which proxies /api, /blog, /uploads and /rss.xml here.
//   npm start     → serves the built site from dist/ plus the API on one port.
// On Netlify the same app runs as a function instead: see netlify/functions/api.mjs.

import http from "node:http";
import { stat, readdir, readFile } from "node:fs/promises";
import { createReadStream, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openDb } from "./db.mjs";
import { createApp } from "./app.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadDotEnv();

const PORT = +(process.env.PORT || 3000);
const DATA_DIR = path.resolve(ROOT, process.env.DATA_DIR || "data");
const PUBLIC = existsSync(path.join(ROOT, "dist", "index.html")) ? path.join(ROOT, "dist") : path.join(ROOT, "public");

const db = await openDb({ dataDir: DATA_DIR });
const app = createApp({ db });
await app.init();
await importOldUploads();

const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".webp": "image/webp",
  ".png": "image/png", ".gif": "image/gif", ".jpg": "image/jpeg", ".ico": "image/x-icon", ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8", ".woff2": "font/woff2", ".xml": "application/xml",
};

async function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === "/") rel = "/index.html";
  if (rel === "/admin" || rel === "/admin/") rel = "/admin.html";
  const file = path.normalize(path.join(PUBLIC, rel));
  if (!file.startsWith(PUBLIC + path.sep)) return false;
  let s;
  try { s = await stat(file); } catch { return false; }
  if (!s.isFile()) return false;
  const ext = path.extname(file).toLowerCase();
  res.writeHead(200, {
    "Content-Type": MIME[ext] || "application/octet-stream",
    "Content-Length": s.size,
    "Cache-Control": /\.(webp|png|jpg|svg|woff2|pdf)$/.test(ext) ? "public, max-age=604800" : "no-cache",
    "X-Content-Type-Options": "nosniff",
  });
  if (req.method === "HEAD") return res.end(), true;
  createReadStream(file).pipe(res);
  return true;
}

// Node request → web Request
async function toRequest(req) {
  const proto = req.headers["x-forwarded-proto"] || "http";
  const url = `${proto}://${req.headers.host || `localhost:${PORT}`}${req.url}`;
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) if (v !== undefined) headers.set(k, Array.isArray(v) ? v.join(", ") : v);
  if (!headers.has("x-forwarded-for")) headers.set("x-forwarded-for", req.socket.remoteAddress || "");
  let body;
  if (req.method !== "GET" && req.method !== "HEAD") {
    const chunks = [];
    let size = 0;
    for await (const c of req) {
      size += c.length;
      if (size > 8 * 1024 * 1024) break; // the app rejects anything this large anyway
      chunks.push(c);
    }
    body = Buffer.concat(chunks);
  }
  return new Request(url, { method: req.method, headers, body });
}

const server = http.createServer(async (req, res) => {
  try {
    const response = await app.handle(await toRequest(req));
    if (response) {
      res.writeHead(response.status, Object.fromEntries(response.headers));
      return res.end(req.method === "HEAD" ? undefined : Buffer.from(await response.arrayBuffer()));
    }
    if (await serveStatic(req, res, new URL(req.url, "http://x").pathname)) return;
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  } catch (e) {
    console.error(e);
    if (!res.headersSent) res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Something went wrong");
  }
});

server.listen(PORT, () => {
  const site = (process.env.SITE_URL || `http://localhost:${PORT}`).replace(/\/$/, "");
  console.log(`✓ API server on http://localhost:${PORT}${PUBLIC.endsWith("dist") ? `  ·  site: ${site}  ·  admin: ${site}/admin` : ""}`);
});

// Images used to be saved as files in data/uploads. They now live in the database
// (Netlify has no disk), so copy any old files in once.
async function importOldUploads() {
  const dir = path.join(DATA_DIR, "uploads");
  if (!existsSync(dir)) return;
  const types = { png: "image/png", jpg: "image/jpeg", gif: "image/gif", webp: "image/webp" };
  for (const name of await readdir(dir)) {
    const ext = name.split(".").pop();
    if (!types[ext] || (await db.get("SELECT 1 AS x FROM uploads WHERE name = ?", [name]))) continue;
    const data = await readFile(path.join(dir, name));
    await db.run("INSERT INTO uploads(name, mime, data, created_at) VALUES(?,?,?,?)", [name, types[ext], new Uint8Array(data), new Date().toISOString()]);
    console.log(`  imported old upload ${name}`);
  }
}

function loadDotEnv() {
  const f = path.join(ROOT, ".env");
  if (!existsSync(f)) return;
  for (const line of readFileSync(f, "utf8").split(/\r?\n/)) {
    const mm = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (mm && !(mm[1] in process.env)) process.env[mm[1]] = mm[2].replace(/^["']|["']$/g, "");
  }
}
