import { asc } from "drizzle-orm";
import { getDb } from "@murojaah/db/client";
import { surahs } from "@murojaah/db";
import type { RouteHandler } from "../lib/http";
import { json } from "../lib/http";

const FALLBACK_SURAHS = [{ id: 112, latinName: "Al-Ikhlas", arabicName: "الإخلاص", meaning: "Ketulusan", ayahCount: 4 }];

export const handleHealth: RouteHandler = async (_request, url, env) => {
  if (url.pathname === "/api/health") return json({ ok: true, service: "Murojaah" }, 200, {}, "no-store");
  if (url.pathname === "/api/surahs") {
    if (env.DB) {
      const db = getDb({ DB: env.DB });
      const rows = await db.select().from(surahs).orderBy(asc(surahs.id));
      if (rows.length > 0) return json(rows, 200, {}, "public, max-age=3600");
    }
    return json(FALLBACK_SURAHS, 200, {}, "no-store");
  }
  return null;
};
