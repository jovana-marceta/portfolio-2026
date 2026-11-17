import { useState, type FormEvent } from "react";
import { api } from "../lib/api";

export function Login({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api("/api/login", "POST", { password });
      setPassword("");
      onSuccess();
    } catch (ex) {
      setError((ex as Error).message);
    }
  }

  return (
    <section className="login card">
      <p className="tag mono">Admin</p>
      <h1>Welcome back, <em className="serif">Jovana.</em></h1>
      <form className="form" onSubmit={submit}>
        <div className="field">
          <label htmlFor="pw">Password</label>
          <input id="pw" type="password" autoComplete="current-password" required autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <p className="form-err" role="alert">{error}</p>
        <button className="btn btn-primary" style={{ justifyContent: "center" }}>Sign in</button>
      </form>
    </section>
  );
}
