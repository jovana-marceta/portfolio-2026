# Jovana Marčeta — Portfolio

Personal portfolio of a Fullstack Software Engineer: résumé sections, a **blog with an admin panel**, **meeting booking** that lands in your calendar, and a **light / dark theme**.

- **Frontend:** React 19 + Vite + TypeScript (no UI library — hand-written CSS per component)
- **Backend:** Node.js ≥ 22.13 with built-in `node:sqlite` — no runtime dependencies
- **Two pages:** the portfolio (`index.html`) and the admin panel (`admin.html`)

## Quick start

```bash
npm install
cp .env.example .env        # Windows: copy .env.example .env  — then set ADMIN_PASSWORD
npm run dev
```

| URL | What |
|---|---|
| http://localhost:5173 | Portfolio (Vite, hot reload) |
| http://localhost:5173/admin.html | Admin panel |
| http://localhost:5173/blog | Blog (server-rendered by the API) |

`npm run dev` starts two processes: the API server on **:3001** and Vite on **:5173**. Vite proxies `/api`, `/blog` and `/rss.xml` to the API. You can also run them separately with `npm run dev:api` and `npm run dev:web`.

### Production

```bash
npm run build     # → dist/
npm start         # API + built site on http://localhost:3000 (admin at /admin)
```

## Scripts

| Script | Does |
|---|---|
| `npm run dev` | API (:3001, restarts on change) + Vite (:5173) |
| `npm run build` | Builds the React app into `dist/` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm start` | Runs the server, which serves `dist/` and the API |
| `npm run preview` | Build, then start |

## Project structure

```
index.html, admin.html        Vite entry pages (inline script sets the theme before first paint)
vite.config.ts                Dev proxy + two-page build
src/
  main.tsx, App.tsx           Portfolio entry + section order
  data/profile.ts             ALL résumé content (single source of truth, typed)
  styles/                     tokens.css (light + dark), base.css, prose.css
  hooks/
    useScrollFrame.ts         One shared rAF-throttled scroll/resize listener
    useReveal.ts              Reveal-on-scroll for .rv / .rv-mask elements
    useInView.ts, useTheme.ts, usePrefersReducedMotion.ts
  lib/                        api.ts (fetch + types), format.ts, css.ts
  components/
    layout/                   Navigation, MobileMenu, ThemeToggle
    ui/                       SectionHeading, Icon
    sections/                 Hero, About (+ IdCard), Skills, Experience, Community, Blog, Contact
    booking/                  Booking, SlotPicker, BookingForm, BookingDone, useAvailability
  admin/                      AdminApp, Login, PostsPanel, BookingsPanel, SettingsPanel, feedback (toast + confirm)
shared/                       md.js (safe Markdown) and slots.js (availability → slots), used by server AND client
server/
  server.mjs                  HTTP server, REST API, SQLite, sessions, ICS calendar feed, SSR blog pages
  templates/post.html         Template for /blog pages
public/                       Images, CV, favicon, post.css + theme.js for the server-rendered blog pages
```

## Editing content

Everything from the CV lives in **`src/data/profile.ts`** — name, summary, skills, experience, milestones, quick facts. Change it there and every section updates.

## Writing blog posts

1. Open the admin panel and sign in with `ADMIN_PASSWORD`.
2. **+ New post** → title, short summary, tags, Markdown content (live preview).
3. **Publish** or **Save as draft** (`Ctrl/Cmd + S` also saves).

Posts appear in the Blog section (latest 3), at `/blog`, at `/blog/<slug>` (server-rendered for SEO) and in `/rss.xml`.

## Bookings & your calendar

- **Admin → Availability:** weekly hours, call length, minimum notice, days off, time zone, video call link.
- **Google Calendar sync:** copy the private calendar address from Admin → Availability, then in Google Calendar choose **Other calendars → + → From URL**. Works with Apple Calendar and Outlook too. (Subscribed calendars refresh every few hours.)
- Visitors get **Add to Google Calendar** and an **.ics** file right after booking.
- One confirmed booking per slot is enforced by a unique index in the database.
- Optional e-mail alert per booking: set `RESEND_API_KEY` + `NOTIFY_EMAIL` (resend.com).

## Light / dark theme

The toggle sits in the navigation. On a first visit the site follows the device setting; once a visitor picks a theme it is remembered (`localStorage`). Colours live in `src/styles/tokens.css` — `:root` for light, `:root[data-theme="dark"]` for dark.

## Deploy

The server needs a **persistent disk** (the SQLite file must survive restarts) — so use Render, Railway, Fly.io or a VPS, not Vercel/Netlify.

- **Render:** New → Blueprint → this repo. `render.yaml` builds the app and attaches a 1 GB disk. Set `ADMIN_PASSWORD` and `SITE_URL`.
- **Docker (Railway / Fly.io / VPS):** the `Dockerfile` builds the React app and runs the server. Mount a volume at `/data` and set `ADMIN_PASSWORD`, `SITE_URL`.

## API

| Method | Path | |
|---|---|---|
| GET | `/api/posts`, `/api/posts/:slug` | Published posts |
| GET | `/api/availability` | Free slots |
| POST | `/api/bookings` | Book `{ start, name, email, topic, note }` |
| GET | `/api/bookings/:id/ics?t=…` | Guest's invite |
| GET | `/api/calendar/<token>.ics` | Your private calendar feed |
| POST | `/api/login`, `/api/logout` | Admin session (HttpOnly cookie) |
| * | `/api/admin/*` | Posts, bookings, settings (signed-in only) |

Rate limits: 6 bookings / hour / IP, 10 login attempts / 15 min / IP.
