import { eq } from "drizzle-orm";
import type { AnyMySqlColumn, MySqlTable } from "drizzle-orm/mysql-core";

// ponytail: MySQL has no RETURNING clause — insert/update then re-select by id.
// Every table these helpers touch has a plain auto-increment `id` column.
type DbLike = { insert: Function; update: Function; select: Function };

export async function insertReturning<T extends MySqlTable & { id: AnyMySqlColumn }>(
  db: DbLike, table: T, values: T["$inferInsert"],
): Promise<T["$inferSelect"]> {
  const [result] = await db.insert(table).values(values) as [{ insertId: number }];
  const [row] = await db.select().from(table).where(eq(table.id, result.insertId));
  return row;
}

export async function updateReturning<T extends MySqlTable & { id: AnyMySqlColumn }>(
  db: DbLike, table: T, values: Partial<T["$inferInsert"]>, id: number,
): Promise<T["$inferSelect"]> {
  await db.update(table).set(values).where(eq(table.id, id));
  const [row] = await db.select().from(table).where(eq(table.id, id));
  return row;
}
