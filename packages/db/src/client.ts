import { drizzle } from "drizzle-orm/mysql2";
import type { Pool } from "mysql2/promise";
import * as schema from "./schema";

export { schema };

export interface CloudflareDatabaseEnv {
  DB: Pool;
}

export function getDb(env: CloudflareDatabaseEnv) {
  return drizzle(env.DB, { schema, mode: "default" });
}
