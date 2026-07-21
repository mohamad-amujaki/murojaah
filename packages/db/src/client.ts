import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export { schema };

export interface CloudflareDatabaseEnv {
  DB: D1Database;
}

export function getDb(env: CloudflareDatabaseEnv) {
  return drizzle(env.DB, { schema });
}
