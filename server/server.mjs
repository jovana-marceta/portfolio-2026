// Jovana Marčeta — portfolio API server.
// Zero runtime dependencies: Node.js ≥ 22.13 (built-in node:sqlite, fetch, crypto).
//
// Development:  `npm run dev` runs this on :3001 next to Vite (:5173), which proxies /api and /blog here.
// Production:   `npm run build && npm start` — this also serves the built React app from dist/.

import http from "node:http";
import { readFile, stat, mkdir, writeFile } from "node:fs/promises";
import { createReadStream, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { renderMarkdown, readingMinutes, esc } from "../shared/md.js";
import {
  DEFAULT_AVAILABILITY,
  buildSlots,
  isBookable,
} from "../shared/slots.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Serve the Vite build when it exists, otherwise just the static public/ folder.
const PUBLIC = existsSync(path.join(ROOT, "dist", "index.html"))
  ? path.join(ROOT, "dist")
  : path.join(ROOT, "public");
const TEMPLATE = path.join(ROOT, "server", "templates", "post.html");

// ---------- config ----------
loadDotEnv();
const PORT = +(process.env.PORT || 3000);
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, "data");
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const SITE_URL = (process.env.SITE_URL || `http://localhost:${PORT}`).replace(
  /\/$/,
  "",
);
const IS_PROD = process.env.NODE_ENV === "production";
const OWNER = { name: "Jovana Marčeta", email: "jmarcetadev@gmail.com" };

if (!ADMIN_PASSWORD)
  console.warn(
    "⚠  ADMIN_PASSWORD is not set — the admin panel is locked until you set it.",
  );

await mkdir(DATA_DIR, { recursive: true });
const UPLOADS = path.join(DATA_DIR, "uploads");
await mkdir(UPLOADS, { recursive: true });
const db = new DatabaseSync(path.join(DATA_DIR, "portfolio.db"));
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    excerpt TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    tags TEXT NOT NULL DEFAULT '',
    published INTEGER NOT NULL DEFAULT 0,
    published_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    start_utc TEXT NOT NULL,
    end_utc TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    topic TEXT NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'confirmed',
    token TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS bookings_one_per_slot ON bookings(start_utc) WHERE status = 'confirmed';
  CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`);
// Migration: cover image for posts (added later — safe to run on existing databases)
if (
  !db
    .prepare("PRAGMA table_info(posts)")
    .all()
    .some((c) => c.name === "cover")
) {
  db.exec("ALTER TABLE posts ADD COLUMN cover TEXT NOT NULL DEFAULT ''");
}

const getSetting = (k, fallback) => {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(k);
  return row ? JSON.parse(row.value) : fallback;
};
const setSetting = (k, v) =>
  db
    .prepare(
      "INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    )
    .run(k, JSON.stringify(v));

if (!getSetting("calendarToken"))
  setSetting("calendarToken", crypto.randomBytes(18).toString("base64url"));
if (!getSetting("availability"))
  setSetting("availability", DEFAULT_AVAILABILITY);
if (getSetting("meetingLink") === undefined) setSetting("meetingLink", "");

// Seed one unpublished draft so the admin panel isn't empty on first run.
if (!db.prepare("SELECT COUNT(*) AS n FROM posts").get().n) {
  const now = new Date().toISOString();
  db.prepare(
    "INSERT INTO posts(slug,title,excerpt,content,tags,published,created_at,updated_at) VALUES(?,?,?,?,?,0,?,?)",
  ).run(
    "hello-world",
    "Hello, world",
    "A draft to show how posts work — edit or delete it in the admin panel.",
    "# Hello, world\n\nThis is a **draft**. Write in Markdown:\n\n- lists\n- `inline code`\n- [links](https://github.com/jovana-marceta)\n\n```ts\nconst greet = (name: string) => `Hi, ${name}!`;\n```\n\nClick **Publish** when it's ready.",
    "meta",
    now,
    now,
  );
}

// ---------- helpers ----------
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".gif": "image/gif",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
  ".xml": "application/xml",
};

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "SAMEORIGIN",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, { ...SECURITY_HEADERS, ...headers });
  res.end(body);
}
const json = (res, status, data, headers = {}) =>
  send(res, status, JSON.stringify(data), {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers,
  });

async function readJson(req, limit = 512 * 1024) {
  if (!/application\/json/i.test(req.headers["content-type"] || ""))
    throw httpError(415, "Expected application/json");
  let size = 0;
  const chunks = [];
  for await (const c of req) {
    size += c.length;
    if (size > limit) throw httpError(413, "Payload too large");
    chunks.push(c);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    throw httpError(400, "Invalid JSON");
  }
}

async function readRaw(req, limit) {
  let size = 0;
  const chunks = [];
  for await (const c of req) {
    size += c.length;
    if (size > limit) throw httpError(413, "Image is larger than 5 MB");
    chunks.push(c);
  }
  return Buffer.concat(chunks);
}

const IMAGE_TYPES = [
  {
    ext: "png",
    sig: (b) =>
      b
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  { ext: "jpg", sig: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: "gif", sig: (b) => b.subarray(0, 4).toString() === "GIF8" },
  {
    ext: "webp",
    sig: (b) =>
      b.subarray(0, 4).toString() === "RIFF" &&
      b.subarray(8, 12).toString() === "WEBP",
  },
];

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");
const safeEqual = (a, b) => {
  const x = Buffer.from(sha256(String(a))),
    y = Buffer.from(sha256(String(b)));
  return crypto.timingSafeEqual(x, y);
};

function cookies(req) {
  return Object.fromEntries(
    (req.headers.cookie || "")
      .split(";")
      .map((c) => c.trim().split("="))
      .filter((p) => p[0])
      .map(([k, ...v]) => [k, decodeURIComponent(v.join("="))]),
  );
}

function isAdmin(req) {
  const t = cookies(req).jm_admin;
  if (!t) return false;
  const row = db
    .prepare("SELECT expires_at FROM sessions WHERE token_hash = ?")
    .get(sha256(t));
  return !!row && row.expires_at > Date.now();
}

const buckets = new Map();
function rateLimit(key, max, windowMs) {
  const now = Date.now();
  const b = buckets.get(key) || { n: 0, reset: now + windowMs };
  if (now > b.reset) {
    b.n = 0;
    b.reset = now + windowMs;
  }
  b.n++;
  buckets.set(key, b);
  if (b.n > max)
    throw httpError(429, "Too many requests — please try again later.");
}
const ipOf = (req) =>
  (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
  req.socket.remoteAddress ||
  "?";

const slugify = (s) =>
  String(s)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "dj")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "post";

const str = (v, max, field, required = false) => {
  const s = typeof v === "string" ? v.trim() : "";
  if (required && !s) throw httpError(400, `${field} is required`);
  if (s.length > max) throw httpError(400, `${field} is too long (max ${max})`);
  return s;
};

// Cover image: the one chosen in the admin, otherwise the first image in the post
const coverOf = (p) =>
  p.cover ||
  (String(p.content).match(/!\[[^\]]*\]\(([^)\s]+)\)/) || [])[1] ||
  "";
const validCover = (v) => {
  const s = str(v, 300, "Cover image");
  if (
    s &&
    !/^(\/uploads\/[a-z0-9-]+\.(png|jpg|gif|webp)|https:\/\/\S+)$/i.test(s)
  )
    throw httpError(400, "Cover must be an uploaded image or an https:// link");
  return s;
};

const publicPost = (p) => ({
  slug: p.slug,
  title: p.title,
  excerpt: p.excerpt,
  tags: p.tags
    ? p.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : [],
  publishedAt: p.published_at,
  updatedAt: p.updated_at,
  minutes: readingMinutes(p.content),
  cover: coverOf(p),
});

const takenSlots = () =>
  db
    .prepare(
      "SELECT start_utc AS start, end_utc AS end FROM bookings WHERE status = 'confirmed' AND end_utc > ?",
    )
    .all(new Date().toISOString());

// ---------- iCalendar ----------
const icsDate = (iso) => iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const icsText = (s) =>
  String(s)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
const fold = (line) => line.match(/.{1,73}/g).join("\r\n ");

function icsEvent(b, { forOwner }) {
  const link = getSetting("meetingLink", "");
  const summary = forOwner
    ? `Call with ${b.name}${b.topic ? ` — ${b.topic}` : ""}`
    : `Call with ${OWNER.name}`;
  const desc = [
    b.topic && `Topic: ${b.topic}`,
    forOwner && `Guest: ${b.name} <${b.email}>`,
    b.note && `Note: ${b.note}`,
    link && `Join: ${link}`,
  ]
    .filter(Boolean)
    .join("\n");
  return [
    "BEGIN:VEVENT",
    `UID:booking-${b.id}@${new URL(SITE_URL).host}`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(b.start_utc)}`,
    `DTEND:${icsDate(b.end_utc)}`,
    `SUMMARY:${icsText(summary)}`,
    desc && `DESCRIPTION:${icsText(desc)}`,
    link && `LOCATION:${icsText(link)}`,
    `ORGANIZER;CN=${icsText(OWNER.name)}:mailto:${OWNER.email}`,
    `ATTENDEE;CN=${icsText(b.name)}:mailto:${b.email}`,
    `STATUS:${b.status === "confirmed" ? "CONFIRMED" : "CANCELLED"}`,
    "END:VEVENT",
  ]
    .filter(Boolean)
    .map(fold)
    .join("\r\n");
}

const icsCalendar = (events, name) =>
  [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Jovana Marceta//Portfolio//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${icsText(name)}`,
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");

// Optional e-mail notification through Resend (https://resend.com) if configured.
async function notifyOwner(b) {
  const key = process.env.RESEND_API_KEY,
    to = process.env.NOTIFY_EMAIL;
  if (!key || !to) return;
  const when = new Date(b.start_utc).toLocaleString("en-GB", {
    timeZone: getSetting("availability").timezone,
    dateStyle: "full",
    timeStyle: "short",
  });
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.NOTIFY_FROM || "Portfolio <onboarding@resend.dev>",
        to: [to],
        reply_to: b.email,
        subject: `New call booked: ${b.name} — ${when}`,
        text: `${b.name} <${b.email}> booked a call.\n\nWhen: ${when}\nTopic: ${b.topic || "—"}\nNote: ${b.note || "—"}\n\nAdmin: ${SITE_URL}/admin`,
      }),
    });
  } catch (e) {
    console.error("notify failed", e.message);
  }
}

// ---------- server-rendered blog pages ----------
let shell;
async function pageShell() {
  if (!shell || !IS_PROD) shell = await readFile(TEMPLATE, "utf8");
  return shell;
}
const fmtDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

async function renderPostPage(res, slug) {
  const p = db
    .prepare("SELECT * FROM posts WHERE slug = ? AND published = 1")
    .get(slug);
  if (!p) return renderNotFound(res);
  const tags = publicPost(p).tags;
  const body = `
    <article class="post">
      <a class="back" href="/#blog">← All posts</a>
      <p class="tag mono">${fmtDate(p.published_at)} · ${readingMinutes(p.content)} min read</p>
      <h1>${esc(p.title)}</h1>
      ${p.excerpt ? `<p class="lede">${esc(p.excerpt)}</p>` : ""}
      ${tags.length ? `<ul class="chips">${tags.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}
      ${p.cover ? `<img class="post-cover" src="${esc(p.cover)}" alt="">` : ""}
      <div class="prose">${renderMarkdown(p.content)}</div>
      <footer class="post-foot">
        <p>Written by <strong>${esc(OWNER.name)}</strong>, Fullstack Software Engineer in Novi Sad.</p>
        <a class="btn btn-primary" href="/#book">Book a call →</a>
      </footer>
    </article>`;
  const html = (await pageShell())
    .replaceAll("{{TITLE}}", esc(`${p.title} — ${OWNER.name}`))
    .replaceAll("{{DESCRIPTION}}", esc(p.excerpt || p.title))
    .replaceAll("{{URL}}", esc(`${SITE_URL}/blog/${p.slug}`))
    .replaceAll(
      "{{IMAGE}}",
      esc(
        coverOf(p)
          ? new URL(coverOf(p), SITE_URL).href
          : `${SITE_URL}/portrait.webp`,
      ),
    )
    .replace("{{BODY}}", body);
  send(res, 200, html, {
    "Content-Type": MIME[".html"],
    "Cache-Control": "no-cache",
  });
}

async function renderBlogIndex(res) {
  const posts = db
    .prepare(
      "SELECT * FROM posts WHERE published = 1 ORDER BY published_at DESC",
    )
    .all();
  const body = `
    <section class="post">
      <a class="back" href="/">← Home</a>
      <p class="tag mono">Blog</p>
      <h1>Notes &amp; <em class="serif">writing.</em></h1>
      ${
        posts.length
          ? `<ul class="post-list">${posts
              .map(
                (p) => `
        <li><a href="/blog/${esc(p.slug)}">
          <span class="mono">${fmtDate(p.published_at)}</span>
          <strong>${esc(p.title)}</strong>
          <span>${esc(p.excerpt)}</span>
        </a></li>`,
              )
              .join("")}</ul>`
          : `<p class="lede">The first post is on its way.</p>`
      }
    </section>`;
  const html = (await pageShell())
    .replaceAll("{{TITLE}}", esc(`Blog — ${OWNER.name}`))
    .replaceAll(
      "{{DESCRIPTION}}",
      "Notes on software engineering by Jovana Marčeta.",
    )
    .replaceAll("{{URL}}", esc(`${SITE_URL}/blog`))
    .replaceAll("{{IMAGE}}", `${SITE_URL}/portrait.webp`)
    .replace("{{BODY}}", body);
  send(res, 200, html, {
    "Content-Type": MIME[".html"],
    "Cache-Control": "no-cache",
  });
}

async function renderNotFound(res) {
  const html = (await pageShell())
    .replaceAll("{{TITLE}}", "Not found")
    .replaceAll("{{DESCRIPTION}}", "Page not found")
    .replaceAll("{{URL}}", SITE_URL)
    .replaceAll("{{IMAGE}}", `${SITE_URL}/portrait.webp`)
    .replace(
      "{{BODY}}",
      `<section class="post"><p class="tag mono">404</p><h1>Nothing <em class="serif">here.</em></h1><p class="lede"><a href="/">Back to the homepage →</a></p></section>`,
    );
  send(res, 404, html, { "Content-Type": MIME[".html"] });
}

function rss(res) {
  const posts = db
    .prepare(
      "SELECT * FROM posts WHERE published = 1 ORDER BY published_at DESC LIMIT 30",
    )
    .all();
  const x = (s) => esc(s);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>${x(OWNER.name)} — Blog</title><link>${SITE_URL}/blog</link><description>Notes on software engineering</description>
${posts.map((p) => `<item><title>${x(p.title)}</title><link>${SITE_URL}/blog/${x(p.slug)}</link><guid>${SITE_URL}/blog/${x(p.slug)}</guid><pubDate>${new Date(p.published_at).toUTCString()}</pubDate><description>${x(p.excerpt)}</description></item>`).join("\n")}
</channel></rss>`;
  send(res, 200, xml, { "Content-Type": "application/rss+xml; charset=utf-8" });
}

// ---------- static ----------
async function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === "/") rel = "/index.html";
  if (rel === "/admin" || rel === "/admin/") rel = "/admin.html";
  const file = path.normalize(path.join(PUBLIC, rel));
  if (!file.startsWith(PUBLIC + path.sep)) return false;
  let s;
  try {
    s = await stat(file);
  } catch {
    return false;
  }
  if (!s.isFile()) return false;
  const ext = path.extname(file).toLowerCase();
  const immutable = /\.(webp|png|jpg|svg|woff2|pdf)$/.test(ext);
  res.writeHead(200, {
    ...SECURITY_HEADERS,
    "Content-Type": MIME[ext] || "application/octet-stream",
    "Content-Length": s.size,
    "Cache-Control": immutable ? "public, max-age=604800" : "no-cache",
    ...(rel === "/admin.html" ? { "X-Robots-Tag": "noindex" } : {}),
  });
  if (req.method === "HEAD") return (res.end(), true);
  createReadStream(file).pipe(res);
  return true;
}

// ---------- API ----------
async function api(req, res, url) {
  const p = url.pathname;
  const m = req.method;

  // Public: blog
  if (m === "GET" && p === "/api/posts") {
    const rows = db
      .prepare(
        "SELECT * FROM posts WHERE published = 1 ORDER BY published_at DESC",
      )
      .all();
    return json(res, 200, rows.map(publicPost));
  }
  let mm;
  if (m === "GET" && (mm = p.match(/^\/api\/posts\/([a-z0-9-]+)$/))) {
    const row = db
      .prepare("SELECT * FROM posts WHERE slug = ? AND published = 1")
      .get(mm[1]);
    if (!row) throw httpError(404, "Post not found");
    return json(res, 200, {
      ...publicPost(row),
      html: renderMarkdown(row.content),
    });
  }

  // Public: booking
  if (m === "GET" && p === "/api/availability") {
    const av = getSetting("availability");
    return json(res, 200, {
      timezone: av.timezone,
      slotMinutes: av.slotMinutes,
      days: buildSlots(av, takenSlots()),
    });
  }
  if (m === "POST" && p === "/api/bookings") {
    rateLimit(`book:${ipOf(req)}`, 6, 3600000);
    const body = await readJson(req);
    if (body.website) throw httpError(400, "Rejected"); // honeypot
    const name = str(body.name, 100, "Name", true);
    const email = str(body.email, 160, "Email", true);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
      throw httpError(400, "Please enter a valid email address");
    const topic = str(body.topic, 120, "Topic");
    const note = str(body.note, 1000, "Message");
    const start = str(body.start, 40, "Time", true);
    const av = getSetting("availability");
    if (!isBookable(av, takenSlots(), start))
      throw httpError(
        409,
        "That time was just taken or is no longer available — please pick another slot.",
      );
    const end = new Date(
      Date.parse(start) + av.slotMinutes * 60000,
    ).toISOString();
    const token = crypto.randomBytes(16).toString("base64url");
    let id;
    try {
      id = db
        .prepare(
          "INSERT INTO bookings(start_utc,end_utc,name,email,topic,note,token,created_at) VALUES(?,?,?,?,?,?,?,?)",
        )
        .run(
          start,
          end,
          name,
          email,
          topic,
          note,
          token,
          new Date().toISOString(),
        ).lastInsertRowid;
    } catch {
      throw httpError(
        409,
        "That time was just taken — please pick another slot.",
      );
    }
    const b = db.prepare("SELECT * FROM bookings WHERE id = ?").get(id);
    notifyOwner(b);
    return json(res, 201, {
      id: Number(id),
      start,
      end,
      timezone: av.timezone,
      ics: `/api/bookings/${id}/ics?t=${token}`,
      cancel: `/api/bookings/${id}/cancel?t=${token}`,
      meetingLink: getSetting("meetingLink", "") || null,
    });
  }
  if ((mm = p.match(/^\/api\/bookings\/(\d+)\/(ics|cancel)$/))) {
    const b = db.prepare("SELECT * FROM bookings WHERE id = ?").get(+mm[1]);
    if (!b || !safeEqual(b.token, url.searchParams.get("t") || ""))
      throw httpError(404, "Booking not found");
    if (mm[2] === "ics" && m === "GET") {
      return send(
        res,
        200,
        icsCalendar(
          [icsEvent(b, { forOwner: false })],
          `Call with ${OWNER.name}`,
        ),
        {
          "Content-Type": "text/calendar; charset=utf-8",
          "Content-Disposition": `attachment; filename="call-with-jovana.ics"`,
        },
      );
    }
    if (mm[2] === "cancel" && m === "POST") {
      db.prepare("UPDATE bookings SET status = 'cancelled' WHERE id = ?").run(
        b.id,
      );
      return json(res, 200, { ok: true });
    }
  }

  // Owner calendar feed (subscribe in Google Calendar / Apple Calendar / Outlook)
  if (
    m === "GET" &&
    (mm = p.match(/^\/api\/calendar\/([A-Za-z0-9_-]+)\.ics$/))
  ) {
    if (!safeEqual(mm[1], getSetting("calendarToken")))
      throw httpError(404, "Not found");
    const rows = db
      .prepare("SELECT * FROM bookings WHERE start_utc > ? ORDER BY start_utc")
      .all(new Date(Date.now() - 30 * 864e5).toISOString());
    return send(
      res,
      200,
      icsCalendar(
        rows.map((b) => icsEvent(b, { forOwner: true })),
        "Portfolio bookings",
      ),
      {
        "Content-Type": "text/calendar; charset=utf-8",
        "Cache-Control": "no-store",
      },
    );
  }

  // Auth
  if (m === "POST" && p === "/api/login") {
    rateLimit(`login:${ipOf(req)}`, 10, 15 * 60000);
    const { password } = await readJson(req);
    if (!ADMIN_PASSWORD || !safeEqual(password || "", ADMIN_PASSWORD))
      throw httpError(401, "Wrong password");
    const token = crypto.randomBytes(32).toString("base64url");
    const maxAge = 14 * 86400;
    db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(Date.now());
    db.prepare("INSERT INTO sessions(token_hash, expires_at) VALUES(?,?)").run(
      sha256(token),
      Date.now() + maxAge * 1000,
    );
    const secure =
      IS_PROD || req.headers["x-forwarded-proto"] === "https" ? "; Secure" : "";
    return json(
      res,
      200,
      { ok: true },
      {
        "Set-Cookie": `jm_admin=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure}`,
      },
    );
  }
  if (m === "POST" && p === "/api/logout") {
    const t = cookies(req).jm_admin;
    if (t)
      db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(sha256(t));
    return json(
      res,
      200,
      { ok: true },
      {
        "Set-Cookie": "jm_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
      },
    );
  }

  // Admin
  if (p.startsWith("/api/admin/")) {
    if (!isAdmin(req)) throw httpError(401, "Not signed in");
    if (
      m !== "GET" &&
      p !== "/api/admin/uploads" &&
      !/application\/json/i.test(req.headers["content-type"] || "")
    )
      throw httpError(415, "Expected JSON");

    if (m === "POST" && p === "/api/admin/uploads") {
      const buf = await readRaw(req, 5 * 1024 * 1024);
      const type = IMAGE_TYPES.find((t) => t.sig(buf));
      if (!type) throw httpError(415, "Only PNG, JPG, GIF or WebP images");
      const name = `${Date.now().toString(36)}-${crypto.randomBytes(6).toString("hex")}.${type.ext}`;
      await writeFile(path.join(UPLOADS, name), buf);
      return json(res, 201, { url: `/uploads/${name}` });
    }
    if (m === "GET" && p === "/api/admin/me") {
      return json(res, 200, {
        ok: true,
        calendarFeed: `${SITE_URL}/api/calendar/${getSetting("calendarToken")}.ics`,
        availability: getSetting("availability"),
        meetingLink: getSetting("meetingLink", ""),
      });
    }
    if (m === "GET" && p === "/api/admin/posts") {
      return json(
        res,
        200,
        db.prepare("SELECT * FROM posts ORDER BY updated_at DESC").all(),
      );
    }
    if (m === "POST" && p === "/api/admin/posts") {
      const b = await readJson(req);
      const title = str(b.title, 200, "Title", true);
      let slug = slugify(b.slug || title);
      while (db.prepare("SELECT 1 FROM posts WHERE slug = ?").get(slug))
        slug = `${slug}-${crypto.randomBytes(2).toString("hex")}`;
      const now = new Date().toISOString();
      const pub = b.published ? 1 : 0;
      const id = db
        .prepare(
          "INSERT INTO posts(slug,title,excerpt,content,tags,cover,published,published_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)",
        )
        .run(
          slug,
          title,
          str(b.excerpt, 400, "Excerpt"),
          str(b.content, 200000, "Content"),
          str(b.tags, 200, "Tags"),
          validCover(b.cover),
          pub,
          pub ? now : null,
          now,
          now,
        ).lastInsertRowid;
      return json(
        res,
        201,
        db.prepare("SELECT * FROM posts WHERE id = ?").get(id),
      );
    }
    if ((mm = p.match(/^\/api\/admin\/posts\/(\d+)$/))) {
      const id = +mm[1];
      const cur = db.prepare("SELECT * FROM posts WHERE id = ?").get(id);
      if (!cur) throw httpError(404, "Post not found");
      if (m === "DELETE") {
        db.prepare("DELETE FROM posts WHERE id = ?").run(id);
        return json(res, 200, { ok: true });
      }
      if (m === "PUT") {
        const b = await readJson(req);
        const title = str(b.title ?? cur.title, 200, "Title", true);
        let slug = slugify(b.slug ?? cur.slug);
        if (
          db
            .prepare("SELECT 1 FROM posts WHERE slug = ? AND id != ?")
            .get(slug, id)
        )
          throw httpError(409, "Another post already uses that URL slug");
        const pub = (b.published ?? cur.published) ? 1 : 0;
        const now = new Date().toISOString();
        db.prepare(
          "UPDATE posts SET slug=?, title=?, excerpt=?, content=?, tags=?, cover=?, published=?, published_at=?, updated_at=? WHERE id=?",
        ).run(
          slug,
          title,
          str(b.excerpt ?? cur.excerpt, 400, "Excerpt"),
          str(b.content ?? cur.content, 200000, "Content"),
          str(b.tags ?? cur.tags, 200, "Tags"),
          validCover(b.cover ?? cur.cover),
          pub,
          pub ? cur.published_at || now : null,
          now,
          id,
        );
        return json(
          res,
          200,
          db.prepare("SELECT * FROM posts WHERE id = ?").get(id),
        );
      }
    }
    if (m === "GET" && p === "/api/admin/bookings") {
      return json(
        res,
        200,
        db
          .prepare(
            "SELECT id,start_utc,end_utc,name,email,topic,note,status,created_at FROM bookings ORDER BY start_utc DESC LIMIT 500",
          )
          .all(),
      );
    }
    if (m === "PATCH" && (mm = p.match(/^\/api\/admin\/bookings\/(\d+)$/))) {
      const b = await readJson(req);
      if (!["confirmed", "cancelled"].includes(b.status))
        throw httpError(400, "Invalid status");
      try {
        db.prepare("UPDATE bookings SET status = ? WHERE id = ?").run(
          b.status,
          +mm[1],
        );
      } catch {
        throw httpError(409, "Another booking already holds that slot");
      }
      return json(res, 200, { ok: true });
    }
    if (m === "PUT" && p === "/api/admin/settings") {
      const b = await readJson(req);
      if (b.availability) {
        const a = b.availability;
        try {
          new Intl.DateTimeFormat("en", { timeZone: a.timezone });
        } catch {
          throw httpError(400, "Unknown time zone");
        }
        const hm = /^([01]\d|2[0-3]):[0-5]\d$/;
        const days = {};
        for (const [k, wins] of Object.entries(a.days || {})) {
          if (!/^[0-6]$/.test(k) || !Array.isArray(wins))
            throw httpError(400, "Invalid days");
          days[k] = wins.filter(
            (w) =>
              Array.isArray(w) && hm.test(w[0]) && hm.test(w[1]) && w[0] < w[1],
          );
        }
        setSetting("availability", {
          timezone: a.timezone,
          slotMinutes: Math.min(240, Math.max(15, +a.slotMinutes || 30)),
          days,
          minNoticeHours: Math.min(720, Math.max(0, +a.minNoticeHours || 0)),
          horizonDays: Math.min(120, Math.max(1, +a.horizonDays || 30)),
          blockedDates: (a.blockedDates || [])
            .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
            .slice(0, 365),
        });
      }
      if (typeof b.meetingLink === "string") {
        const link = b.meetingLink.trim();
        if (link && !/^https:\/\//i.test(link))
          throw httpError(400, "Meeting link must start with https://");
        setSetting("meetingLink", link.slice(0, 300));
      }
      if (b.rotateCalendarToken)
        setSetting(
          "calendarToken",
          crypto.randomBytes(18).toString("base64url"),
        );
      return json(res, 200, { ok: true });
    }
  }
  throw httpError(404, "Not found");
}

// ---------- router ----------
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  try {
    if (url.pathname.startsWith("/api/")) return await api(req, res, url);
    if (req.method !== "GET" && req.method !== "HEAD")
      throw httpError(405, "Method not allowed");
    if (url.pathname === "/blog" || url.pathname === "/blog/")
      return await renderBlogIndex(res);
    const pm = url.pathname.match(/^\/blog\/([a-z0-9-]+)\/?$/);
    if (pm) return await renderPostPage(res, pm[1]);
    if (url.pathname === "/rss.xml") return rss(res);
    const um = url.pathname.match(
      /^\/uploads\/([a-z0-9-]+\.(png|jpg|gif|webp))$/,
    );
    if (um) {
      const file = path.join(UPLOADS, um[1]);
      try {
        const s = await stat(file);
        res.writeHead(200, {
          ...SECURITY_HEADERS,
          "Content-Type": MIME["." + um[2]],
          "Content-Length": s.size,
          "Cache-Control": "public, max-age=31536000, immutable",
        });
        return createReadStream(file).pipe(res);
      } catch {
        return await renderNotFound(res);
      }
    }
    if (url.pathname === "/healthz")
      return send(res, 200, "ok", { "Content-Type": "text/plain" });
    if (await serveStatic(req, res, url.pathname)) return;
    return await renderNotFound(res);
  } catch (e) {
    const status = e.status || 500;
    if (status === 500) console.error(e);
    if (!res.headersSent)
      json(res, status, {
        error: status === 500 ? "Something went wrong" : e.message,
      });
    else res.end();
  }
});

server.listen(PORT, () =>
  console.log(
    `✓ API server on http://localhost:${PORT}${PUBLIC.endsWith("dist") ? `  ·  site: ${SITE_URL}  ·  admin: ${SITE_URL}/admin` : "  (run `npm run build` to serve the React app from here)"}`,
  ),
);

function loadDotEnv() {
  const f = path.join(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
    ".env",
  );
  if (!existsSync(f)) return;
  for (const line of readFileSync(f, "utf8").split(/\r?\n/)) {
    const mm = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (mm && !(mm[1] in process.env))
      process.env[mm[1]] = mm[2].replace(/^["']|["']$/g, "");
  }
}
