import { BookOpen, Home, LayoutDashboard, Trophy, UserRound, Users } from "lucide-react";

export type Page = "home" | "practice" | "achievements" | "dashboard" | "children" | "profile";
export type Role = "Murid" | "Guru" | "Orang Tua" | "Admin";
export type Mastery = "Belum hafal" | "Perlu latihan" | "Sudah hafal";

export const fallbackAyahs = [
  { no: 1, arabic: "قُلْ هُوَ ٱللَّهُ أَحَدٌ", latin: "Qul huwallāhu aḥad", meaning: "Katakanlah (Muhammad), Dialah Allah, Yang Maha Esa.", audio: "/api/quran/audio/112/1" },
  { no: 2, arabic: "ٱللَّهُ ٱلصَّمَدُ", latin: "Allāhuṣ-ṣamad", meaning: "Allah tempat meminta segala sesuatu.", audio: "/api/quran/audio/112/2" },
  { no: 3, arabic: "لَمْ يَلِدْ وَلَمْ يُولَدْ", latin: "Lam yalid wa lam yūlad", meaning: "(Allah) tidak beranak dan tidak pula diperanakkan.", audio: "/api/quran/audio/112/3" },
  { no: 4, arabic: "وَلَمْ يَكُن لَّهُۥ كُفُوًا أَحَدٌۢ", latin: "Wa lam yakul lahū kufuwan aḥad", meaning: "Dan tidak ada sesuatu yang setara dengan Dia.", audio: "/api/quran/audio/112/4" },
];

export type Ayah = typeof fallbackAyahs[number];

export const surahs = [
  [112, "Al-Ikhlas", "4 ayat", "Ketulusan"], [113, "Al-Falaq", "5 ayat", "Waktu Subuh"],
  [114, "An-Nas", "6 ayat", "Manusia"], [111, "Al-Lahab", "5 ayat", "Gejolak Api"],
  [110, "An-Nasr", "3 ayat", "Pertolongan"], [109, "Al-Kafirun", "6 ayat", "Orang Kafir"]
];

export const nav: { id: Page; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Beranda", icon: Home }, { id: "practice", label: "Latihan", icon: BookOpen },
  { id: "achievements", label: "Pencapaian", icon: Trophy }, { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "children", label: "Kelola Profil", icon: Users },
  { id: "profile", label: "Profil", icon: UserRound }
];

export const validPages: Page[] = ["home", "practice", "achievements", "dashboard", "children", "profile"];
export const pageFromHash = (): Page => {
  const value = location.hash.slice(1) as Page;
  return validPages.includes(value) ? value : "home";
};
