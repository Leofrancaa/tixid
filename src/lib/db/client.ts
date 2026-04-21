import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type DbInstance = ReturnType<typeof drizzle>;

const g = globalThis as { _tixidDb?: DbInstance; _tixidPg?: ReturnType<typeof postgres> };

function getDb(): DbInstance {
  if (g._tixidDb) return g._tixidDb;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  g._tixidPg = postgres(url, { prepare: false, max: 1 });
  g._tixidDb = drizzle(g._tixidPg, { schema });
  return g._tixidDb;
}

export const db = new Proxy({} as DbInstance, {
  get(_target, prop) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getDb() as any)[prop];
  },
});

export { schema };
