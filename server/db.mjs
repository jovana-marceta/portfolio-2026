// Database adapter with one small async API used by app.mjs:
//   all(sql, args) → rows · get(sql, args) → row | undefined · run(sql, args) → { changes, lastInsertRowid } · exec(sql)
//
// Production (Netlify): Turso, a hosted SQLite database, when TURSO_DATABASE_URL is set.
// Development: a local SQLite file (data/portfolio.db) through Node's built-in node:sqlite.

const normalize = (v) => {
  if (typeof v === "bigint") return Number(v);
  if (v instanceof ArrayBuffer) return new Uint8Array(v);
  return v;
};

export async function openDb({ dataDir } = {}) {
  const url = process.env.TURSO_DATABASE_URL;

  if (url) {
    // The "web" build talks to Turso over HTTPS and has no native parts, so it bundles cleanly into a function.
    const { createClient } = await import("@libsql/client/web");
    const client = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
    const rowsOf = (rs) => rs.rows.map((r) => Object.fromEntries(rs.columns.map((c, i) => [c, normalize(r[i])])));
    const all = async (sql, args = []) => rowsOf(await client.execute({ sql, args }));
    return {
      remote: true,
      all,
      get: async (sql, args = []) => (await all(sql, args))[0],
      run: async (sql, args = []) => {
        const rs = await client.execute({ sql, args });
        return { changes: rs.rowsAffected, lastInsertRowid: Number(rs.lastInsertRowid ?? 0) };
      },
      exec: async (sql) => { await client.executeMultiple(sql); },
    };
  }

  const { DatabaseSync } = await import("node:sqlite");
  const { mkdir } = await import("node:fs/promises");
  const path = await import("node:path");
  const dir = dataDir || process.env.DATA_DIR || "./data";
  await mkdir(dir, { recursive: true });
  const db = new DatabaseSync(path.join(dir, "portfolio.db"));
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
  const fix = (row) => row && Object.fromEntries(Object.entries(row).map(([k, v]) => [k, normalize(v)]));
  return {
    remote: false,
    all: async (sql, args = []) => db.prepare(sql).all(...args).map(fix),
    get: async (sql, args = []) => fix(db.prepare(sql).get(...args)),
    run: async (sql, args = []) => {
      const r = db.prepare(sql).run(...args);
      return { changes: Number(r.changes), lastInsertRowid: Number(r.lastInsertRowid) };
    },
    exec: async (sql) => { db.exec(sql); },
  };
}
