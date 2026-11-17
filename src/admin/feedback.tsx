import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

interface Feedback {
  toast: (msg: string) => void;
  confirm: (text: string) => Promise<boolean>;
}
const Ctx = createContext<Feedback>({ toast: () => {}, confirm: async () => false });
export const useFeedback = () => useContext(Ctx);

/** Toast messages and an in-page confirm dialog (window.confirm is blocked in some embeds). */
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState("");
  const [shown, setShown] = useState(false);
  const [ask, setAsk] = useState<{ text: string; resolve: (v: boolean) => void } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const toast = useCallback((m: string) => {
    setMsg(m); setShown(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setShown(false), 2400);
  }, []);

  const confirm = useCallback((text: string) => new Promise<boolean>((resolve) => setAsk({ text, resolve })), []);
  const answer = (v: boolean) => { ask?.resolve(v); setAsk(null); };

  return (
    <Ctx.Provider value={{ toast, confirm }}>
      {children}
      <div className={`confirm${ask ? " on" : ""}`} role="dialog" aria-modal="true" aria-hidden={!ask}>
        <div className="card">
          <p style={{ marginTop: 0, fontWeight: 600 }}>{ask?.text}</p>
          <div className="actions">
            <button className="btn btn-dark" onClick={() => answer(true)}>Yes</button>
            <button className="btn btn-ghost" onClick={() => answer(false)}>Cancel</button>
          </div>
        </div>
      </div>
      <div className={`toast${shown ? " on" : ""}`} role="status">{msg}</div>
    </Ctx.Provider>
  );
}
