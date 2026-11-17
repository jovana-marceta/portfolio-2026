import { useCallback, useEffect, useState } from "react";
import type { Availability } from "../../shared/slots.js";
import { ThemeToggle } from "../components/layout/ThemeToggle";
import { api } from "../lib/api";
import { BookingsPanel } from "./BookingsPanel";
import { FeedbackProvider } from "./feedback";
import { Login } from "./Login";
import { PostsPanel } from "./PostsPanel";
import { SettingsPanel } from "./SettingsPanel";

export interface AdminMe { ok: true; calendarFeed: string; availability: Availability; meetingLink: string }

const TABS = [
  { id: "posts", label: "Blog posts" },
  { id: "bookings", label: "Bookings" },
  { id: "settings", label: "Availability" },
] as const;
type Tab = (typeof TABS)[number]["id"];

export function AdminApp() {
  const [me, setMe] = useState<AdminMe | null | "anon">(null);
  const [tab, setTab] = useState<Tab>("posts");

  const loadMe = useCallback(async () => {
    try { setMe(await api<AdminMe>("/api/admin/me")); }
    catch { setMe("anon"); }
  }, []);
  useEffect(() => { loadMe(); }, [loadMe]);

  const logout = async () => { await api("/api/logout", "POST", {}); setMe("anon"); };

  return (
    <FeedbackProvider>
      <div className="adm">
        {me === "anon" && <Login onSuccess={loadMe} />}
        {me && me !== "anon" && (
          <>
            <header className="adm-top">
              <a className="mark" href="/"><span className="mark-dot">JM</span><span className="mark-name">Admin</span></a>
              <div className="tabs" role="tablist">
                {TABS.map((t) => (
                  <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}>{t.label}</button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <ThemeToggle />
                <a className="btn btn-ghost btn-sm" href="/" target="_blank" rel="noopener">View site ↗</a>
                <button className="btn btn-dark btn-sm" onClick={logout}>Sign out</button>
              </div>
            </header>
            {tab === "posts" && <PostsPanel />}
            {tab === "bookings" && <BookingsPanel timezone={me.availability.timezone} />}
            {tab === "settings" && <SettingsPanel me={me} onSaved={loadMe} />}
          </>
        )}
      </div>
    </FeedbackProvider>
  );
}
