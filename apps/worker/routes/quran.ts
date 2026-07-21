import { asc, eq } from "drizzle-orm";
import { getDb } from "@murojaah/db/client";
import { ayahs } from "@murojaah/db";
import type { RouteHandler } from "../lib/http";
import { json } from "../lib/http";

interface EquranAyah {
  nomorAyat: number;
  teksArab: string;
  teksLatin: string;
  teksIndonesia: string;
  audio: Record<string, string>;
}
interface EquranResponse { data?: { ayat?: EquranAyah[] } }

const EQURAN_BASE = "https://equran.id/api/v2";

export const handleQuranSurah: RouteHandler = async (request, url, env) => {
  const surahMatch = url.pathname.match(/^\/api\/quran\/surah\/(\d{1,3})$/);
  if (!surahMatch || request.method !== "GET") return null;

  const surahId = Number(surahMatch[1]);
  if (surahId < 1 || surahId > 114) return json({ error: "Nomor surah tidak valid." }, 400, {}, "no-store");

  if (env.DB) {
    const db = getDb({ DB: env.DB });
    const rows = await db.select().from(ayahs).where(eq(ayahs.surahId, surahId)).orderBy(asc(ayahs.number));
    if (rows.length > 0) {
      const cached = rows.map(row => ({
        no: row.number, arabic: row.arabic, latin: row.transliteration ?? "", meaning: row.translation,
        audio: `/api/quran/audio/${surahId}/${row.number}`,
      }));
      return json({ source: "D1", ayahs: cached }, 200, {}, "public, max-age=3600, stale-while-revalidate=86400");
    }
  }

  try {
    const response = await fetch(`${EQURAN_BASE}/surat/${surahId}`, { headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(`EQuran merespons ${response.status}`);
    const result = await response.json() as EquranResponse;
    const ayahList = result.data?.ayat?.map(ayah => ({
      no: ayah.nomorAyat,
      arabic: ayah.teksArab,
      latin: ayah.teksLatin,
      meaning: ayah.teksIndonesia,
      audio: `/api/quran/audio/${surahId}/${ayah.nomorAyat}`,
    }));
    if (!ayahList?.length) throw new Error("Data ayat kosong");
    return json({ source: "EQuran.id", ayahs: ayahList }, 200, {}, "public, max-age=3600, stale-while-revalidate=86400");
  } catch (error) {
    console.error("Gagal mengambil data EQuran", error);
    return json({ error: "Data Al-Qur'an sedang tidak tersedia." }, 503, {}, "no-store");
  }
};

export const handleQuranAudio: RouteHandler = async (request, url) => {
  const audioMatch = url.pathname.match(/^\/api\/quran\/audio\/(\d{1,3})\/(\d{1,3})$/);
  if (!audioMatch || request.method !== "GET") return null;

  const surahId = Number(audioMatch[1]);
  const ayahId = Number(audioMatch[2]);
  if (surahId < 1 || surahId > 114 || ayahId < 1 || ayahId > 286) return json({ error: "Audio ayat tidak valid." }, 400, {}, "no-store");
  const audioId = `${String(surahId).padStart(3, "0")}${String(ayahId).padStart(3, "0")}.mp3`;
  return Response.redirect(`https://cdn.equran.id/audio-partial/Misyari-Rasyid-Al-Afasi/${audioId}`, 302);
};
