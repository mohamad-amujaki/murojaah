import { useCallback, useEffect, useRef, useState } from "react";
import { Award, BookOpen, ChevronRight, GraduationCap, Pencil, Repeat2, Search, Target, Trash2, Trophy, Users, X } from "lucide-react";
import type { PublicUser } from "@murojaah/shared";
import { PageTitle } from "../components/PageTitle";
import { Modal } from "../components/Modal";
import { Stat } from "../components/Stat";
import { EditProfileModal } from "../components/EditProfileModal";
import { deleteAdminUsers, getAdminClasses, getAdminStats, getAdminUsers, getClassMembers, updateAdminUser } from "../lib/api";
import type { AdminClassResponse, AdminStatsResponse, ClassMember } from "../lib/api";
import { useToast } from "../lib/toast-context";
import { ROLE_LABEL } from "../lib/constants";

const PAGE_SIZE = 25;

const ROLE_COLORS: Record<string, string> = {
  student: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300",
  teacher: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
  parent: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
  admin: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300",
};

function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "ellipsis")[] = [1];
  const rangeStart = Math.max(2, current - 1);
  const rangeEnd = Math.min(total - 1, current + 1);
  if (rangeStart > 2) pages.push("ellipsis");
  for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);
  if (rangeEnd < total - 1) pages.push("ellipsis");
  if (total > 1) pages.push(total);
  return pages;
}

export function Admin() {
  const [stats, setStats] = useState<AdminStatsResponse | null>(null);
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [total, setTotal] = useState(0);
  const [roleFilter, setRoleFilter] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [editing, setEditing] = useState<PublicUser | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [adminClasses, setAdminClasses] = useState<AdminClassResponse[]>([]);
  const [expandedClassId, setExpandedClassId] = useState<number | null>(null);
  const [classMembers, setClassMembers] = useState<ClassMember[]>([]);
  const [classSearch, setClassSearch] = useState("");
  const notify = useToast();

  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer.current);
  }, [search]);

  useEffect(() => { getAdminStats().then(setStats).catch(() => { setStats(null); notify("Gagal memuat statistik."); }); }, []);
  useEffect(() => { getAdminClasses().then(r => setAdminClasses(r.classes)).catch(() => { setAdminClasses([]); notify("Gagal memuat daftar kelas."); }); }, []);

  const loadUsers = useCallback(async () => {
    try {
      const res = await getAdminUsers({ role: roleFilter || undefined, q: debouncedSearch || undefined, offset, limit: PAGE_SIZE });
      setUsers(res.users);
      setTotal(res.total);
    } catch { setUsers([]); }
  }, [roleFilter, debouncedSearch, offset]);

  useEffect(() => { loadUsers(); }, [loadUsers]);
  useEffect(() => { setOffset(0); }, [roleFilter, debouncedSearch]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  const selectAll = selected.size === users.length && users.length > 0;

  const handleSelectAll = () => {
    if (selectAll) setSelected(new Set());
    else setSelected(new Set(users.map(u => u.id)));
  };

  const handleSelect = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const handleToggleClass = async (classId: number) => {
    if (expandedClassId === classId) { setExpandedClassId(null); return; }
    setExpandedClassId(classId);
    try {
      const res = await getClassMembers(classId);
      setClassMembers(res.members);
    } catch { setClassMembers([]); }
  };

  const selectedTeachers = users.filter(u => selected.has(u.id) && u.role === "teacher");

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteAdminUsers([...selected]);
      setSelected(new Set());
      setConfirmDelete(false);
      notify("Pengguna berhasil dihapus.");
      await loadUsers();
      const s = await getAdminStats();
      setStats(s);
    } catch {
      notify("Gagal menghapus pengguna.");
    }
    setDeleting(false);
  };

  return <>
    <PageTitle eyebrow="ADMIN AREA" title="Pusat kendali admin" desc="Pantau pertumbuhan pengguna dan kelola akun dalam satu tempat." />

    <div className="section-title"><div><h2>Ringkasan pengguna</h2></div></div>
    <div className="stat-grid">
      <Stat icon={Users} value={String(stats?.totalUsers ?? 0)} label="Total pengguna" />
      <Stat icon={BookOpen} value={String(stats?.totalStudents ?? 0)} label="Murid" />
      <Stat icon={Target} value={String(stats?.totalTeachers ?? 0)} label="Guru" />
      <Stat icon={Award} value={String(stats?.totalParents ?? 0)} label="Orang tua" />
    </div>

    <div className="section-title"><div><h2>Aktivitas platform</h2></div></div>
    <div className="stat-grid stat-grid-3">
      <Stat icon={Repeat2} value={String(stats?.totalPracticeSessions ?? 0)} label="Total sesi latihan" />
      <Stat icon={Trophy} value={String(stats?.totalXpAwarded ?? 0)} label="Total XP diberikan" />
      <Stat icon={Users} value={String(stats?.totalClasses ?? 0)} label="Total kelas" />
    </div>

    <section className="card table-card">
      <div className="flex flex-wrap items-center gap-3 p-[14px_14px_10px] border-b border-line">
        <div className="flex-1 min-w-0">
          <h3 className="m-0 text-sm font-bold">Semua Pengguna</h3>
          <p className="m-0 text-xs text-muted">{total} pengguna{roleFilter ? ` (${ROLE_LABEL[roleFilter]})` : ""}</p>
        </div>

        <div className="relative w-full sm:w-auto sm:min-w-[200px] order-last sm:order-none">
          <Search size={14} className="absolute left-[10px] top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input className="w-full h-9 rounded-[8px] border border-line bg-transparent pl-[30px] pr-[30px] text-xs text-ink placeholder:text-muted outline-none focus:border-[var(--accent)] transition-colors" type="text" placeholder="Cari pengguna..." value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button className="absolute right-[8px] top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors cursor-pointer" onClick={() => setSearch("")}><X size={14} /></button>}
        </div>

        <select className="h-9 rounded-[8px] border border-line bg-transparent px-[10px] text-xs text-ink outline-none cursor-pointer focus:border-[var(--accent)] transition-colors" value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setSelected(new Set()); }}>
          <option value="">Semua peran</option>
          <option value="student">Murid</option>
          <option value="teacher">Guru</option>
          <option value="parent">Orang Tua</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-[14px] py-[10px] border-b border-line bg-[#fff8e1] dark:bg-[#2a1f00] text-xs font-semibold">
          <span>{selected.size} dipilih</span>
          <button className="inline-flex items-center gap-[6px] h-9 px-[14px] rounded-[8px] border border-red-500 text-red-500 bg-transparent font-semibold text-xs cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" type="button" onClick={() => setConfirmDelete(true)}>
            <Trash2 size={14} /> Hapus
          </button>
        </div>
      )}

      {users.length === 0 && (
        <p className="flex flex-col items-center text-xs text-muted py-[48px] m-0 leading-[2]">
          <Users size={28} className="opacity-20 mb-[6px]" />
          Tidak ada pengguna.
        </p>
      )}

      {users.length > 0 && (
        <div>
          <div className="grid grid-cols-[20px_1fr_1fr_70px_70px_auto] items-center gap-3 px-[14px] py-[7px_14px] text-[11px] font-semibold text-muted border-b border-line bg-[#fafafa] dark:bg-[#111]">
            <span><input type="checkbox" checked={selectAll} onChange={handleSelectAll} className="w-4 h-4 cursor-pointer accent-[var(--accent)]" /></span>
            <span>PENGGUNA</span>
            <span>PERAN</span>
            <span>STATUS</span>
            <span>TARGET</span>
            <span></span>
          </div>
          {users.map(u => (
            <div className="grid grid-cols-[20px_1fr_1fr_70px_70px_auto] items-center gap-3 px-[14px] py-[10px] text-xs border-b border-line last:border-0 hover:bg-[#f7f7f7] dark:hover:bg-[#181818] transition-colors" key={u.id}>
              <span><input type="checkbox" checked={selected.has(u.id)} onChange={() => handleSelect(u.id)} className="w-4 h-4 cursor-pointer accent-[var(--accent)]" /></span>
              <span className="font-semibold truncate">{u.displayName}</span>
              <span><span className={`inline-block rounded-full text-[10px] font-semibold px-[8px] py-[2px] ${ROLE_COLORS[u.role]}`}>{ROLE_LABEL[u.role]}</span></span>
              <span className="flex items-center gap-[5px]">
                <span className={`w-[7px] h-[7px] rounded-full ${u.status === "active" ? "bg-green-500" : "bg-red-400"}`} />
                <span className="text-muted">{u.status === "active" ? "Aktif" : "Nonaktif"}</span>
              </span>
              <span className="text-muted">{u.dailyTarget} mnt</span>
              <span><button className="inline-flex items-center gap-[5px] h-8 px-[10px] rounded-[8px] border border-line bg-transparent text-ink font-semibold text-[11px] cursor-pointer hover:bg-[#f0f0f0] dark:hover:bg-[#222] whitespace-nowrap transition-colors" type="button" onClick={() => setEditing(u)}><Pencil size={12} /> Ubah</button></span>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-[6px] px-[14px] py-[12px] border-t border-line">
          <button className="inline-flex items-center justify-center h-8 min-w-[32px] px-[8px] rounded-[8px] border border-line bg-transparent text-xs text-ink font-semibold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#f0f0f0] dark:hover:bg-[#222] transition-colors" disabled={currentPage <= 1} onClick={() => setOffset(prev => prev - PAGE_SIZE)}>Sebelumnya</button>
          {getPageNumbers(currentPage, totalPages).map((p, i) =>
            p === "ellipsis"
              ? <span key={`e${i}`} className="text-xs text-muted select-none">...</span>
              : <button key={p} className={`inline-flex items-center justify-center h-8 min-w-[32px] px-[8px] rounded-[8px] text-xs font-semibold cursor-pointer transition-colors ${p === currentPage ? "bg-[var(--accent)] text-white" : "border border-line bg-transparent text-ink hover:bg-[#f0f0f0] dark:hover:bg-[#222]"}`} onClick={() => setOffset((p - 1) * PAGE_SIZE)}>{p}</button>
          )}
          <button className="inline-flex items-center justify-center h-8 min-w-[32px] px-[8px] rounded-[8px] border border-line bg-transparent text-xs text-ink font-semibold cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#f0f0f0] dark:hover:bg-[#222] transition-colors" disabled={currentPage >= totalPages} onClick={() => setOffset(prev => prev + PAGE_SIZE)}>Selanjutnya</button>
        </div>
      )}
    </section>

    <section className="card table-card mt-4">
      <div className="flex flex-wrap items-center gap-3 p-[14px_14px_10px] border-b border-line">
        <div className="flex-1 min-w-0">
          <h3 className="m-0 text-sm font-bold">Daftar Kelas</h3>
          <p className="m-0 text-xs text-muted">{adminClasses.length} kelas terdaftar</p>
        </div>
        <div className="relative w-full sm:w-auto sm:min-w-[200px] order-last sm:order-none">
          <Search size={14} className="absolute left-[10px] top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input className="w-full h-9 rounded-[8px] border border-line bg-transparent pl-[30px] pr-[10px] text-xs text-ink placeholder:text-muted outline-none focus:border-[var(--accent)] transition-colors" type="text" placeholder="Cari kelas..." value={classSearch} onChange={e => setClassSearch(e.target.value)} />
        </div>
      </div>

      {adminClasses.length === 0 && (
        <p className="flex flex-col items-center text-xs text-muted py-[48px] m-0 leading-[2]">
          <GraduationCap size={28} className="opacity-20 mb-[6px]" />
          Belum ada kelas.
        </p>
      )}

      {adminClasses
        .filter(c => !classSearch || c.name.toLowerCase().includes(classSearch.toLowerCase()))
        .map(c => (
          <div key={c.id}>
            <button className="flex items-center gap-3 w-full px-[14px] py-[10px] text-xs border-b border-line last:border-0 hover:bg-[#f7f7f7] dark:hover:bg-[#181818] transition-colors text-left cursor-pointer" onClick={() => handleToggleClass(c.id)}>
              <GraduationCap size={14} className="text-muted flex-none" />
              <div className="flex-1 min-w-0">
                <span className="font-semibold">{c.name}</span>
                {c.teacherName
                  ? <span className="text-muted ml-2">{c.teacherName}</span>
                  : <span className="text-amber-600 dark:text-amber-400 ml-2">Yatim</span>}
              </div>
              <span className={`w-[6px] h-[6px] rounded-full ${c.status === "active" ? "bg-green-500" : "bg-red-400"}`} />
              <span className="text-muted tabular-nums min-w-[40px] text-center">{c.memberCount}</span>
              <ChevronRight size={14} className={`text-muted transition-transform duration-200 ${expandedClassId === c.id ? "rotate-90" : ""}`} />
            </button>

            {expandedClassId === c.id && (
              <div className="bg-[#fafafa] dark:bg-[#111] border-b border-line overflow-hidden">
                {classMembers.length === 0 && <p className="text-xs text-muted text-center py-[24px] m-0">Belum ada murid di kelas ini.</p>}
                {classMembers.length > 0 && (
                  <div>
                    <div className="grid grid-cols-[1fr_60px_80px_60px] items-center gap-3 px-[14px] py-[6px_10px] text-[10px] font-semibold text-muted border-b border-line">
                      <span>MURID</span>
                      <span className="text-center">STREAK</span>
                      <span className="text-center">AYAT</span>
                      <span className="text-right">XP</span>
                    </div>
                    {classMembers.map(m => (
                      <div className="grid grid-cols-[1fr_60px_80px_60px] items-center gap-3 px-[14px] py-[8px_10px] text-xs border-b border-line last:border-0" key={m.id}>
                        <span className="font-semibold truncate">{m.displayName}</span>
                        <span className="text-muted text-center tabular-nums">{m.streak} hr</span>
                        <span className="text-muted text-center tabular-nums">{m.ayahsMastered}</span>
                        <span className="text-muted text-right tabular-nums">{m.totalXp.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
    </section>

    {editing && <EditProfileModal user={editing} allowRoleEdit onClose={() => setEditing(null)} onSave={async updates => {
      await updateAdminUser(editing.id, updates);
      await loadUsers();
    }} />}

    {confirmDelete && (
      <Modal onClose={() => !deleting && setConfirmDelete(false)}>
        <div className="card auth-card" style={{ maxWidth: 400 }}>
          <h3 className="m-0 text-sm font-bold">Hapus pengguna</h3>
          <p className="m-0 text-xs text-muted leading-[1.6]">Kamu akan menghapus {selected.size} pengguna. Tindakan ini tidak bisa dibatalkan.</p>
          {selectedTeachers.length > 0 && (
            <p className="m-0 text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 rounded-[10px] p-[10px_12px] leading-[1.5]">
              {selectedTeachers.length} guru akan dipisahkan dari kelasnya. Kelas akan tetap ada tanpa guru pengampu dan bisa diassign ulang oleh admin.
            </p>
          )}
          <div className="text-xs bg-[#fafafa] dark:bg-[#111] rounded-[12px] p-[12px_14px] -mx-1">
            {[...selected].slice(0, 5).map(id => {
              const u = users.find(u => u.id === id);
              return <div key={id} className="py-[3px] flex items-center gap-2"><span className="w-[6px] h-[6px] rounded-full bg-red-300 flex-none" />{u?.displayName ?? `#${id}`}</div>;
            })}
            {selected.size > 5 && <div className="text-muted mt-[6px] pt-[6px] border-t border-line text-[11px]">...dan {selected.size - 5} lainnya</div>}
          </div>
          <div className="flex items-center gap-[8px] justify-end pt-1">
            <button className="inline-flex items-center gap-[6px] h-9 px-[14px] rounded-[8px] border border-line bg-transparent text-ink font-semibold text-xs cursor-pointer hover:bg-[#f0f0f0] dark:hover:bg-[#222] transition-colors" type="button" onClick={() => setConfirmDelete(false)} disabled={deleting}>Batal</button>
            <button className="inline-flex items-center gap-[6px] h-10 px-[18px] rounded-[10px] border-0 bg-red-600 text-white font-bold text-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-700 transition-colors" type="button" onClick={handleDelete} disabled={deleting}>
              <Trash2 size={14} />{deleting ? "Menghapus..." : "Ya, hapus"}
            </button>
          </div>
        </div>
      </Modal>
    )}
  </>;
}