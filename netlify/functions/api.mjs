// Netlify Function: runs the portfolio backend (server/app.mjs) on Netlify, with the database on Turso.
// Needs these environment variables in Netlify: TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, ADMIN_PASSWORD.

import { openDb } from "../../server/db.mjs";
import { createApp } from "../../server/app.mjs";

let appPromise;

export default async (request) => {
  appPromise ??= openDb().then((db) => createApp({ db }));
  try {
    const app = await appPromise;
    return (await app.handle(request)) ?? new Response("Not found", { status: 404 });
  } catch (e) {
    appPromise = undefined; // retry the connection on the next request
    console.error(e);
    return new Response(JSON.stringify({ error: "Something went wrong" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const config = {
  path: ["/api/*", "/blog", "/blog/*", "/rss.xml", "/uploads/*", "/healthz"],
};
