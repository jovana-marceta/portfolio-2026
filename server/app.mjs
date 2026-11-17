// Portfolio backend: blog, bookings, admin, calendar feed and uploaded images.
// Platform-neutral: takes a web Request and returns a Response, so the same code runs
// in the local Node server (server.mjs) and as a Netlify Function (netlify/functions/api.mjs).

import crypto from "node:crypto";
import { renderMarkdown, readingMinutes, esc } from "../shared/md.js";
import { DEFAULT_AVAILABILITY, buildSlots, isBookable } from "../shared/slots.js";
import POST_TEMPLATE from "./templates/post.mjs";

const OWNER = { name: "Jovana Marčeta", email: "jmarcetadev@gmail.com" };
const MAX_UPLOAD = 4 * 1024 * 1024; // Netlify Functions accept request bodies up to about 6 MB

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "SAMEORIGIN",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

const IMAGE_TYPES = [
  { ext: "png", mime: "image/png", sig: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: "jpg", mime: "image/jpeg", sig: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: "gif", mime: "image/gif", sig: (b) => b.subarray(0, 4).toString() === "GIF8" },
  { ext: "webp", mime: "image/webp", sig: (b) => b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP" },
];

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    excerpt TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    tags TEXT NOT NULL DEFAULT '',
    cover TEXT NOT NULL DEFAULT '',
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
  CREATE TABLE IF NOT EXISTS uploads (name TEXT PRIMARY KEY, mime TEXT NOT NULL, data BLOB NOT NULL, created_at TEXT NOT NULL);
`;

// ---------- small helpers ----------
function httpError(status, message) { const e = new Error(message); e.status = status; return e; }

const respond = (status, body, headers = {}) => new Response(body, { status, headers: { ...SECURITY_HEADERS, ...headers } });
const json = (status, data, headers = {}) =>
  respond(status, JSON.stringify(data), { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers });
const html = (status, body) => respond(status, body, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" });

async function readBody(request, limit, tooBig) {
  const buf = Buffer.from(await request.arrayBuffer());
  if (buf.length > limit) throw httpError(413, tooBig);
  return buf;
}
async function readJson(request) {
  if (!/application\/json/i.test(request.headers.get("content-type") || "")) throw httpError(415, "Expected application/json");
  const buf = await readBody(request, 512 * 1024, "Payload too large");
  try { return JSON.parse(buf.toString("utf8") || "{}"); }
  catch { throw httpError(400, "Invalid JSON"); }
}

const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");
const safeEqual = (a, b) => crypto.timingSafeEqual(Buffer.from(sha256(String(a))), Buffer.from(sha256(String(b))));

const cookies = (request) =>
  Object.fromEntries(
    (request.headers.get("cookie") || "").split(";").map((c) => c.trim().split("=")).filter((p) => p[0])
      .map(([k, ...v]) => [k, decodeURIComponent(v.join("="))])
  );

const ipOf = (request) =>
  request.headers.get("x-nf-client-connection-ip") || (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "local";

// Best effort: counts are per server instance (serverless functions may run several)
const buckets = new Map();
function rateLimit(key, max, windowMs) {
  const now = Date.now();
  const b = buckets.get(key) || { n: 0, reset: now + windowMs };
  if (now > b.reset) { b.n = 0; b.reset = now + windowMs; }
  b.n++;
  buckets.set(key, b);
  if (b.n > max) throw httpError(429, "Too many requests, please try again later.");
}

const slugify = (s) =>
  String(s).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "dj").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "post";

const str = (v, max, field, required = false) => {
  const s = typeof v === "string" ? v.trim() : "";
  if (required && !s) throw httpError(400, `${field} is required`);
  if (s.length > max) throw httpError(400, `${field} is too long (max ${max})`);
  return s;
};

// Cover image: the one chosen in the admin, otherwise the first image in the post
const coverOf = (p) => p.cover || (String(p.content).match(/!\[[^\]]*\]\(([^)\s]+)\)/) || [])[1] || "";
const validCover = (v) => {
  const s = str(v, 300, "Cover image");
  if (s && !/^(\/uploads\/[a-z0-9-]+\.(png|jpg|gif|webp)|https:\/\/\S+)$/i.test(s)) throw httpError(400, "Cover must be an uploaded image or an https:// link");
  return s;
};

const publicPost = (p) => ({
  slug: p.slug, title: p.title, excerpt: p.excerpt, tags: p.tags ? p.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
  publishedAt: p.published_at, updatedAt: p.updated_at, minutes: readingMinutes(p.content), cover: coverOf(p),
});

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "");

// ---------- iCalendar ----------
const icsDate = (iso) => iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const icsText = (s) => String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const fold = (line) => line.match(/.{1,73}/g).join("\r\n ");
const icsCalendar = (events, name) =>
  ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Jovana Marceta//Portfolio//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", `X-WR-CALNAME:${icsText(name)}`, ...events, "END:VCALENDAR"].join("\r\n");

/**
 * @param {{ db: Awaited<ReturnType<import("./db.mjs").openDb>>, env?: Record<string, string | undefined> }} options
 */
export function createApp({ db, env = process.env }) {
  const ADMIN_PASSWORD = env.ADMIN_PASSWORD || "";
  if (!ADMIN_PASSWORD) console.warn("ADMIN_PASSWORD is not set, so the admin panel stays locked.");

  // ---------- settings ----------
  const getSetting = async (k, fallback) => {
    const row = await db.get("SELECT value FROM settings WHERE key = ?", [k]);
    return row ? JSON.parse(row.value) : fallback;
  };
  const setSetting = (k, v) =>
    db.run("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [k, JSON.stringify(v)]);

  // ---------- one-time setup (schema, migrations, defaults) ----------
  let ready;
  const init = () => (ready ??= (async () => {
    await db.exec(SCHEMA);
    const cols = await db.all("PRAGMA table_info(posts)");
    if (!cols.some((c) => c.name === "cover")) await db.exec("ALTER TABLE posts ADD COLUMN cover TEXT NOT NULL DEFAULT ''");
    if (!(await getSetting("calendarToken"))) await setSetting("calendarToken", crypto.randomBytes(18).toString("base64url"));
    if (!(await getSetting("availability"))) await setSetting("availability", DEFAULT_AVAILABILITY);
    if ((await getSetting("meetingLink")) === undefined) await setSetting("meetingLink", "");
  })().catch((e) => { ready = undefined; throw e; }));

  let SITE_URL = "";

  const isAdmin = async (request) => {
    const t = cookies(request).jm_admin;
    if (!t) return false;
    const row = await db.get("SELECT expires_at FROM sessions WHERE token_hash = ?", [sha256(t)]);
    return !!row && row.expires_at > Date.now();
  };

  const takenSlots = () =>
    db.all("SELECT start_utc AS start, end_utc AS end FROM bookings WHERE status = 'confirmed' AND end_utc > ?", [new Date().toISOString()]);

  async function icsEvent(b, { forOwner }) {
    const link = await getSetting("meetingLink", "");
    const summary = forOwner ? `Call with ${b.name}${b.topic ? ` (${b.topic})` : ""}` : `Call with ${OWNER.name}`;
    const desc = [
      b.topic && `Topic: ${b.topic}`,
      forOwner && `Guest: ${b.name} <${b.email}>`,
      b.note && `Note: ${b.note}`,
      link && `Join: ${link}`,
    ].filter(Boolean).join("\n");
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
    ].filter(Boolean).map(fold).join("\r\n");
  }

  // Optional e-mail for every new booking through Resend (https://resend.com)
  async function notifyOwner(b) {
    const key = env.RESEND_API_KEY, to = env.NOTIFY_EMAIL;
    if (!key || !to) return;
    const av = await getSetting("availability", DEFAULT_AVAILABILITY);
    const when = new Date(b.start_utc).toLocaleString("en-GB", { timeZone: av.timezone, dateStyle: "full", timeStyle: "short" });
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: env.NOTIFY_FROM || "Portfolio <onboarding@resend.dev>",
          to: [to],
          reply_to: b.email,
          subject: `New call booked: ${b.name}, ${when}`,
          text: `${b.name} <${b.email}> booked a call.\n\nWhen: ${when}\nTopic: ${b.topic || "-"}\nNote: ${b.note || "-"}\n\nAdmin: ${SITE_URL}/admin`,
        }),
      });
    } catch (e) { console.error("notify failed", e.message); }
  }

  // ---------- server-rendered pages ----------
  const page = ({ title, description, url, image, body }) =>
    POST_TEMPLATE.replaceAll("{{TITLE}}", esc(title))
      .replaceAll("{{DESCRIPTION}}", esc(description))
      .replaceAll("{{URL}}", esc(url))
      .replaceAll("{{IMAGE}}", esc(image))
      .replace("{{BODY}}", body);

  const notFound = () => html(404, page({
    title: "Not found", description: "Page not found", url: SITE_URL, image: `${SITE_URL}/portrait.webp`,
    body: `<section class="post"><p class="tag mono">404</p><h1>Nothing <em class="serif">here.</em></h1><p class="lede"><a href="/">Back to the homepage →</a></p></section>`,
  }));

  async function postPage(slug) {
    const p = await db.get("SELECT * FROM posts WHERE slug = ? AND published = 1", [slug]);
    if (!p) return notFound();
    const tags = publicPost(p).tags;
    const cover = coverOf(p);
    return html(200, page({
      title: `${p.title} | ${OWNER.name}`,
      description: p.excerpt || p.title,
      url: `${SITE_URL}/blog/${p.slug}`,
      image: cover ? new URL(cover, SITE_URL).href : `${SITE_URL}/portrait.webp`,
      body: `
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
    </article>`,
    }));
  }

  async function blogIndex() {
    const posts = await db.all("SELECT * FROM posts WHERE published = 1 ORDER BY published_at DESC");
    return html(200, page({
      title: `Blog | ${OWNER.name}`,
      description: "Notes on software engineering by Jovana Marčeta.",
      url: `${SITE_URL}/blog`,
      image: `${SITE_URL}/portrait.webp`,
      body: `
    <section class="post">
      <a class="back" href="/">← Home</a>
      <p class="tag mono">Blog</p>
      <h1>Notes &amp; <em class="serif">writing.</em></h1>
      ${posts.length ? `<ul class="post-list">${posts.map((p) => `
        <li><a href="/blog/${esc(p.slug)}">
          <span class="mono">${fmtDate(p.published_at)}</span>
          <strong>${esc(p.title)}</strong>
          <span>${esc(p.excerpt)}</span>
        </a></li>`).join("")}</ul>` : `<p class="lede">The first post is on its way.</p>`}
    </section>`,
    }));
  }

  async function rss() {
    const posts = await db.all("SELECT * FROM posts WHERE published = 1 ORDER BY published_at DESC LIMIT 30");
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>${esc(OWNER.name)} | Blog</title><link>${SITE_URL}/blog</link><description>Notes on software engineering</description>
${posts.map((p) => `<item><title>${esc(p.title)}</title><link>${SITE_URL}/blog/${esc(p.slug)}</link><guid>${SITE_URL}/blog/${esc(p.slug)}</guid><pubDate>${new Date(p.published_at).toUTCString()}</pubDate><description>${esc(p.excerpt)}</description></item>`).join("\n")}
</channel></rss>`;
    return respond(200, xml, { "Content-Type": "application/rss+xml; charset=utf-8" });
  }

  async function upload(name) {
    const row = await db.get("SELECT mime, data FROM uploads WHERE name = ?", [name]);
    if (!row) return notFound();
    return respond(200, row.data, { "Content-Type": row.mime, "Cache-Control": "public, max-age=31536000, immutable" });
  }

  // ---------- API ----------
  async function api(request, url) {
    const p = url.pathname, m = request.method;
    let mm;

    // Public: blog
    if (m === "GET" && p === "/api/posts") {
      const rows = await db.all("SELECT * FROM posts WHERE published = 1 ORDER BY published_at DESC");
      return json(200, rows.map(publicPost));
    }
    if (m === "GET" && (mm = p.match(/^\/api\/posts\/([a-z0-9-]+)$/))) {
      const row = await db.get("SELECT * FROM posts WHERE slug = ? AND published = 1", [mm[1]]);
      if (!row) throw httpError(404, "Post not found");
      return json(200, { ...publicPost(row), html: renderMarkdown(row.content) });
    }

    // Public: booking
    if (m === "GET" && p === "/api/availability") {
      const av = await getSetting("availability");
      return json(200, { timezone: av.timezone, slotMinutes: av.slotMinutes, days: buildSlots(av, await takenSlots()) });
    }
    if (m === "POST" && p === "/api/bookings") {
      rateLimit(`book:${ipOf(request)}`, 6, 3600000);
      const body = await readJson(request);
      if (body.website) throw httpError(400, "Rejected"); // honeypot
      const name = str(body.name, 100, "Name", true);
      const email = str(body.email, 160, "Email", true);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw httpError(400, "Please enter a valid email address");
      const topic = str(body.topic, 120, "Topic");
      const note = str(body.note, 1000, "Message");
      const start = str(body.start, 40, "Time", true);
      const av = await getSetting("availability");
      if (!isBookable(av, await takenSlots(), start)) throw httpError(409, "That time was just taken or is no longer available. Please pick another slot.");
      const end = new Date(Date.parse(start) + av.slotMinutes * 60000).toISOString();
      const token = crypto.randomBytes(16).toString("base64url");
      let id;
      try {
        id = (await db.run("INSERT INTO bookings(start_utc,end_utc,name,email,topic,note,token,created_at) VALUES(?,?,?,?,?,?,?,?)",
          [start, end, name, email, topic, note, token, new Date().toISOString()])).lastInsertRowid;
      } catch {
        throw httpError(409, "That time was just taken. Please pick another slot.");
      }
      const b = await db.get("SELECT * FROM bookings WHERE id = ?", [id]);
      await notifyOwner(b);
      return json(201, {
        id, start, end, timezone: av.timezone,
        ics: `/api/bookings/${id}/ics?t=${token}`,
        cancel: `/api/bookings/${id}/cancel?t=${token}`,
        meetingLink: (await getSetting("meetingLink", "")) || null,
      });
    }
    if ((mm = p.match(/^\/api\/bookings\/(\d+)\/(ics|cancel)$/))) {
      const b = await db.get("SELECT * FROM bookings WHERE id = ?", [+mm[1]]);
      if (!b || !safeEqual(b.token, url.searchParams.get("t") || "")) throw httpError(404, "Booking not found");
      if (mm[2] === "ics" && m === "GET") {
        return respond(200, icsCalendar([await icsEvent(b, { forOwner: false })], `Call with ${OWNER.name}`), {
          "Content-Type": "text/calendar; charset=utf-8",
          "Content-Disposition": `attachment; filename="call-with-jovana.ics"`,
        });
      }
      if (mm[2] === "cancel" && m === "POST") {
        await db.run("UPDATE bookings SET status = 'cancelled' WHERE id = ?", [b.id]);
        return json(200, { ok: true });
      }
    }

    // Owner calendar feed (subscribe in Google Calendar / Apple Calendar / Outlook)
    if (m === "GET" && (mm = p.match(/^\/api\/calendar\/([A-Za-z0-9_-]+)\.ics$/))) {
      if (!safeEqual(mm[1], await getSetting("calendarToken"))) throw httpError(404, "Not found");
      const rows = await db.all("SELECT * FROM bookings WHERE start_utc > ? ORDER BY start_utc", [new Date(Date.now() - 30 * 864e5).toISOString()]);
      const events = await Promise.all(rows.map((b) => icsEvent(b, { forOwner: true })));
      return respond(200, icsCalendar(events, "Portfolio bookings"), { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "no-store" });
    }

    // Auth
    if (m === "POST" && p === "/api/login") {
      rateLimit(`login:${ipOf(request)}`, 10, 15 * 60000);
      const { password } = await readJson(request);
      if (!ADMIN_PASSWORD || !safeEqual(password || "", ADMIN_PASSWORD)) throw httpError(401, "Wrong password");
      const token = crypto.randomBytes(32).toString("base64url");
      const maxAge = 14 * 86400;
      await db.run("DELETE FROM sessions WHERE expires_at < ?", [Date.now()]);
      await db.run("INSERT INTO sessions(token_hash, expires_at) VALUES(?,?)", [sha256(token), Date.now() + maxAge * 1000]);
      const secure = url.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https" ? "; Secure" : "";
      return json(200, { ok: true }, { "Set-Cookie": `jm_admin=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${secure}` });
    }
    if (m === "POST" && p === "/api/logout") {
      const t = cookies(request).jm_admin;
      if (t) await db.run("DELETE FROM sessions WHERE token_hash = ?", [sha256(t)]);
      return json(200, { ok: true }, { "Set-Cookie": "jm_admin=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0" });
    }

    // Admin
    if (p.startsWith("/api/admin/")) {
      if (!(await isAdmin(request))) throw httpError(401, "Not signed in");
      if (m !== "GET" && p !== "/api/admin/uploads" && !/application\/json/i.test(request.headers.get("content-type") || "")) throw httpError(415, "Expected JSON");

      if (m === "POST" && p === "/api/admin/uploads") {
        const buf = await readBody(request, MAX_UPLOAD, "Image is larger than 4 MB");
        const type = IMAGE_TYPES.find((t) => t.sig(buf));
        if (!type) throw httpError(415, "Only PNG, JPG, GIF or WebP images");
        const name = `${Date.now().toString(36)}-${crypto.randomBytes(6).toString("hex")}.${type.ext}`;
        await db.run("INSERT INTO uploads(name, mime, data, created_at) VALUES(?,?,?,?)", [name, type.mime, new Uint8Array(buf), new Date().toISOString()]);
        return json(201, { url: `/uploads/${name}` });
      }
      if (m === "GET" && p === "/api/admin/me") {
        return json(200, {
          ok: true,
          calendarFeed: `${SITE_URL}/api/calendar/${await getSetting("calendarToken")}.ics`,
          availability: await getSetting("availability"),
          meetingLink: await getSetting("meetingLink", ""),
        });
      }
      if (m === "GET" && p === "/api/admin/posts") {
        return json(200, await db.all("SELECT * FROM posts ORDER BY updated_at DESC"));
      }
      if (m === "POST" && p === "/api/admin/posts") {
        const b = await readJson(request);
        const title = str(b.title, 200, "Title", true);
        let slug = slugify(b.slug || title);
        while (await db.get("SELECT 1 AS x FROM posts WHERE slug = ?", [slug])) slug = `${slug}-${crypto.randomBytes(2).toString("hex")}`;
        const now = new Date().toISOString();
        const pub = b.published ? 1 : 0;
        const { lastInsertRowid } = await db.run(
          "INSERT INTO posts(slug,title,excerpt,content,tags,cover,published,published_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)",
          [slug, title, str(b.excerpt, 400, "Excerpt"), str(b.content, 200000, "Content"), str(b.tags, 200, "Tags"), validCover(b.cover), pub, pub ? now : null, now, now]
        );
        return json(201, await db.get("SELECT * FROM posts WHERE id = ?", [lastInsertRowid]));
      }
      if ((mm = p.match(/^\/api\/admin\/posts\/(\d+)$/))) {
        const id = +mm[1];
        const cur = await db.get("SELECT * FROM posts WHERE id = ?", [id]);
        if (!cur) throw httpError(404, "Post not found");
        if (m === "DELETE") { await db.run("DELETE FROM posts WHERE id = ?", [id]); return json(200, { ok: true }); }
        if (m === "PUT") {
          const b = await readJson(request);
          const title = str(b.title ?? cur.title, 200, "Title", true);
          const slug = slugify(b.slug ?? cur.slug);
          if (await db.get("SELECT 1 AS x FROM posts WHERE slug = ? AND id != ?", [slug, id])) throw httpError(409, "Another post already uses that URL slug");
          const pub = (b.published ?? cur.published) ? 1 : 0;
          const now = new Date().toISOString();
          await db.run(
            "UPDATE posts SET slug=?, title=?, excerpt=?, content=?, tags=?, cover=?, published=?, published_at=?, updated_at=? WHERE id=?",
            [slug, title, str(b.excerpt ?? cur.excerpt, 400, "Excerpt"), str(b.content ?? cur.content, 200000, "Content"),
              str(b.tags ?? cur.tags, 200, "Tags"), validCover(b.cover ?? cur.cover), pub, pub ? cur.published_at || now : null, now, id]
          );
          return json(200, await db.get("SELECT * FROM posts WHERE id = ?", [id]));
        }
      }
      if (m === "GET" && p === "/api/admin/bookings") {
        return json(200, await db.all("SELECT id,start_utc,end_utc,name,email,topic,note,status,created_at FROM bookings ORDER BY start_utc DESC LIMIT 500"));
      }
      if (m === "PATCH" && (mm = p.match(/^\/api\/admin\/bookings\/(\d+)$/))) {
        const b = await readJson(request);
        if (!["confirmed", "cancelled"].includes(b.status)) throw httpError(400, "Invalid status");
        try { await db.run("UPDATE bookings SET status = ? WHERE id = ?", [b.status, +mm[1]]); }
        catch { throw httpError(409, "Another booking already holds that slot"); }
        return json(200, { ok: true });
      }
      if (m === "PUT" && p === "/api/admin/settings") {
        const b = await readJson(request);
        if (b.availability) {
          const a = b.availability;
          try { new Intl.DateTimeFormat("en", { timeZone: a.timezone }); } catch { throw httpError(400, "Unknown time zone"); }
          const hm = /^([01]\d|2[0-3]):[0-5]\d$/;
          const days = {};
          for (const [k, wins] of Object.entries(a.days || {})) {
            if (!/^[0-6]$/.test(k) || !Array.isArray(wins)) throw httpError(400, "Invalid days");
            days[k] = wins.filter((w) => Array.isArray(w) && hm.test(w[0]) && hm.test(w[1]) && w[0] < w[1]);
          }
          await setSetting("availability", {
            timezone: a.timezone,
            slotMinutes: Math.min(240, Math.max(15, +a.slotMinutes || 30)),
            days,
            minNoticeHours: Math.min(720, Math.max(0, +a.minNoticeHours || 0)),
            horizonDays: Math.min(120, Math.max(1, +a.horizonDays || 30)),
            blockedDates: (a.blockedDates || []).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).slice(0, 365),
          });
        }
        if (typeof b.meetingLink === "string") {
          const link = b.meetingLink.trim();
          if (link && !/^https:\/\//i.test(link)) throw httpError(400, "Meeting link must start with https://");
          await setSetting("meetingLink", link.slice(0, 300));
        }
        if (b.rotateCalendarToken) await setSetting("calendarToken", crypto.randomBytes(18).toString("base64url"));
        return json(200, { ok: true });
      }
    }
    throw httpError(404, "Not found");
  }

  /** Handles a request, or returns null when the path isn't ours (e.g. a static file). */
  async function handle(request) {
    const url = new URL(request.url);
    SITE_URL = (env.SITE_URL || env.URL || url.origin).replace(/\/$/, "");
    const p = url.pathname;
    try {
      if (p === "/healthz") return respond(200, "ok", { "Content-Type": "text/plain" });
      const ours = p.startsWith("/api/") || p === "/blog" || p === "/blog/" || p.startsWith("/blog/") || p === "/rss.xml" || p.startsWith("/uploads/");
      if (!ours) return null;
      await init();
      if (p.startsWith("/api/")) return await api(request, url);
      if (request.method !== "GET" && request.method !== "HEAD") throw httpError(405, "Method not allowed");
      if (p === "/blog" || p === "/blog/") return await blogIndex();
      const pm = p.match(/^\/blog\/([a-z0-9-]+)\/?$/);
      if (pm) return await postPage(pm[1]);
      if (p === "/rss.xml") return await rss();
      const um = p.match(/^\/uploads\/([a-z0-9-]+\.(png|jpg|gif|webp))$/);
      if (um) return await upload(um[1]);
      return notFound();
    } catch (e) {
      const status = e.status || 500;
      if (status === 500) console.error(e);
      return json(status, { error: status === 500 ? "Something went wrong" : e.message });
    }
  }

  return { handle, init, db };
}
