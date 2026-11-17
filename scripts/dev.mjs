// Starts the API server and the Vite dev server together (no extra dependencies).
//   npm run dev  →  site on http://localhost:5173 (API on :3001, proxied by Vite)
import { spawn } from "node:child_process";

const API_PORT = process.env.API_PORT || "3001";
const isWin = process.platform === "win32";
const env = { ...process.env, PORT: API_PORT, API_PORT, SITE_URL: process.env.SITE_URL || "http://localhost:5173" };

const procs = [
  spawn(process.execPath, ["--watch", "--disable-warning=ExperimentalWarning", "server/server.mjs"], { stdio: "inherit", env }),
  spawn(isWin ? "npx.cmd" : "npx", ["vite"], { stdio: "inherit", env, shell: isWin }),
];

const stop = () => { procs.forEach((p) => p.kill()); process.exit(); };
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
procs.forEach((p) => p.on("exit", (code) => { if (code) { console.error(`A dev process exited with code ${code}`); stop(); } }));
