import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// pg-pool emittiert 'error' wenn eine idle Verbindung vom DB-Server getrennt
// wird (z.B. Wartung, Timeout). Ohne diesen Handler wuerde Node.js den
// unhandled Error als fatalen Crash behandeln. pg-pool baut die Verbindung
// automatisch neu auf — wir muessen nur verhindern, dass der Prozess stirbt.
pool.on("error", (err) => {
  console.error("[DB] pg-pool idle-client error (non-fatal, reconnect automatic):", err.message);
});

export const db = drizzle(pool, { schema });

export * from "./schema";
