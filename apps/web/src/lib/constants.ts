import { BookOpen, GraduationCap, Users } from "lucide-react";
import type { UserRole } from "@murojaah/shared";

export const ROLE_LABEL: Record<string, string> = {
  student: "Murid", teacher: "Guru", parent: "Orang Tua", admin: "Admin",
};

export const ROLE_OPTIONS: { value: Exclude<UserRole, "admin">; label: string }[] = [
  { value: "student", label: "Murid" },
  { value: "teacher", label: "Guru" },
  { value: "parent", label: "Orang Tua" },
];

export const ROLE_CARDS: { value: Exclude<UserRole, "admin">; label: string; desc: string; icon: typeof BookOpen }[] = [
  { value: "student", label: "Murid", desc: "Menghafal & mengulang ayat", icon: BookOpen },
  { value: "teacher", label: "Guru", desc: "Memantau kelas & murid", icon: GraduationCap },
  { value: "parent", label: "Orang Tua", desc: "Mendampingi hafalan anak", icon: Users },
];

export const ROLE_OPTIONS_ALL: { value: UserRole; label: string }[] = [
  { value: "student", label: "Murid" },
  { value: "teacher", label: "Guru" },
  { value: "parent", label: "Orang Tua" },
  { value: "admin", label: "Admin" },
];

export const initials = (name: string) =>
  name.split(" ").map(part => part[0]).join("").slice(0, 2).toUpperCase();
