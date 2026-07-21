# Entity Relationship Document (ERD) — HafizAyat

Sumber kebenaran skema: [src/db/schema.ts](../src/db/schema.ts) (Drizzle ORM) dan [migrations/0001_initial.sql](../migrations/0001_initial.sql) (SQLite/D1). Kedua file ini harus tetap sinkron secara manual (skema Drizzle tidak auto-generate migration di repo ini — gunakan `npm run db:generate`).

## Diagram Relasi

```
users ──< class_members >── classes ──(teacher_id)── users
users ──< parent_children >── users (parent ⇄ child, self-referencing)
users ──< assignments >── classes / users / surahs
users ──< practice_sessions >── surahs
users ──< ayah_progress >── ayahs ──(surah_id)── surahs
users ──< user_badges >── badges
users ──< xp_ledger
users ──< encouragements >── users (parent → child)
surahs ──< ayahs
```

## Entitas

### users
Pengguna aplikasi lintas peran (murid, guru, orang tua, admin).
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | INTEGER PK AI | |
| display_name | TEXT NOT NULL | |
| role | TEXT NOT NULL | enum: `student`, `teacher`, `parent`, `admin` |
| status | TEXT NOT NULL | default `active` |
| daily_target | INTEGER NOT NULL | default `10` (menit) |
| created_at | TEXT NOT NULL | default `CURRENT_TIMESTAMP` |

### surahs
Master data 114 surah Al-Qur'an (di-seed sebagian: 112, 113, 114).
| Kolom | Tipe |
|---|---|
| id | INTEGER PK (nomor surah 1–114) |
| latin_name | TEXT NOT NULL |
| arabic_name | TEXT NOT NULL |
| meaning | TEXT NOT NULL |
| ayah_count | INTEGER NOT NULL |

### ayahs
Master data ayat per surah (cache lokal; sumber utama runtime tetap EQuran.id via API).
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | INTEGER PK AI | |
| surah_id | INTEGER NOT NULL → surahs.id | |
| number | INTEGER NOT NULL | nomor ayat dalam surah |
| arabic | TEXT NOT NULL | |
| transliteration | TEXT | nullable |
| translation | TEXT NOT NULL | |
| audio_url | TEXT NOT NULL | |
| — | UNIQUE(surah_id, number) | index `ayah_surah_number` |

### classes
Kelas tahfiz yang dikelola guru.
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | INTEGER PK AI | |
| name | TEXT NOT NULL | |
| teacher_id | INTEGER NOT NULL → users.id | |
| join_code | TEXT NOT NULL UNIQUE | kode gabung kelas |
| status | TEXT NOT NULL | default `active` |

### class_members
Keanggotaan murid dalam kelas (many-to-many users↔classes).
| Kolom | Tipe |
|---|---|
| id | INTEGER PK AI |
| class_id | INTEGER NOT NULL → classes.id |
| student_id | INTEGER NOT NULL → users.id |
| — | UNIQUE(class_id, student_id) index `class_student` |

### parent_children
Relasi orang tua–anak (self-referencing pada `users`).
| Kolom | Tipe |
|---|---|
| id | INTEGER PK AI |
| parent_id | INTEGER NOT NULL → users.id |
| child_id | INTEGER NOT NULL → users.id |
| — | UNIQUE(parent_id, child_id) index `parent_child` |

### assignments
Tugas hafalan/muraja'ah yang diberikan guru ke kelas atau murid tertentu.
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | INTEGER PK AI | |
| creator_id | INTEGER NOT NULL → users.id | guru pembuat |
| class_id | INTEGER → classes.id | nullable, target kelas |
| student_id | INTEGER → users.id | nullable, target murid individual |
| surah_id | INTEGER NOT NULL → surahs.id | |
| start_ayah | INTEGER NOT NULL | |
| end_ayah | INTEGER NOT NULL | |
| target_loops | INTEGER NOT NULL | |
| due_at | TEXT | nullable, deadline |
| status | TEXT NOT NULL | default `active` |

### practice_sessions
Sesi latihan yang diselesaikan pengguna (ditulis oleh `POST /api/practice/complete`).
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | INTEGER PK AI | |
| user_id | INTEGER NOT NULL → users.id | |
| surah_id | INTEGER NOT NULL → surahs.id | |
| start_ayah | INTEGER NOT NULL | |
| end_ayah | INTEGER NOT NULL | |
| loops | INTEGER NOT NULL | |
| duration | INTEGER NOT NULL | detik |
| status | TEXT NOT NULL | mis. `completed` |
| completed_at | TEXT | default `CURRENT_TIMESTAMP` |
| — | index `session_user_date` on (user_id, completed_at) | |

### ayah_progress
Status penguasaan per ayat per pengguna (belum ditulis oleh API saat ini — lihat [PRD.md](PRD.md) §4).
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | INTEGER PK AI | |
| user_id | INTEGER NOT NULL → users.id | |
| ayah_id | INTEGER NOT NULL → ayahs.id | |
| mastery | TEXT NOT NULL | mis. "Belum hafal" / "Perlu latihan" / "Sudah hafal" |
| repetitions | INTEGER NOT NULL | default 0 |
| last_practiced_at | TEXT | nullable |
| — | UNIQUE(user_id, ayah_id) index `progress_user_ayah` | |

### badges
Master data lencana pencapaian.
| Kolom | Tipe |
|---|---|
| id | INTEGER PK AI |
| code | TEXT NOT NULL UNIQUE |
| name | TEXT NOT NULL |
| description | TEXT NOT NULL |
| icon | TEXT NOT NULL |

### user_badges
Badge yang diperoleh pengguna.
| Kolom | Tipe |
|---|---|
| id | INTEGER PK AI |
| user_id | INTEGER NOT NULL → users.id |
| badge_id | INTEGER NOT NULL → badges.id |
| earned_at | TEXT NOT NULL default CURRENT_TIMESTAMP |
| — | UNIQUE(user_id, badge_id) index `user_badge` |

### xp_ledger
Catatan perolehan XP (ledger, satu baris per event XP).
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | INTEGER PK AI | |
| user_id | INTEGER NOT NULL → users.id | |
| source | TEXT NOT NULL UNIQUE | pengenal sumber XP, mis. `practice:{sessionId}` — **unik**, mencegah duplikasi XP untuk event yang sama |
| amount | INTEGER NOT NULL | |
| created_at | TEXT NOT NULL default CURRENT_TIMESTAMP | |

### encouragements
Pesan dukungan dari orang tua ke anak.
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | INTEGER PK AI | |
| parent_id | INTEGER NOT NULL → users.id | |
| child_id | INTEGER NOT NULL → users.id | |
| message | TEXT NOT NULL | |
| is_read | INTEGER (boolean) NOT NULL | default false |
| created_at | TEXT NOT NULL default CURRENT_TIMESTAMP | |

## Catatan
- Semua FK bersifat implisit secara referensial di Drizzle/SQLite (`PRAGMA foreign_keys = ON` diaktifkan di migrasi) tetapi **tidak ada `ON DELETE CASCADE`** — penghapusan user/surah harus ditangani secara eksplisit di level aplikasi.
- Saat ini hanya `practice_sessions` dan `xp_ledger` yang benar-benar ditulis oleh kode aplikasi (`worker/index.ts`); tabel lain sudah ter-migrasi dan sebagian ter-seed ([seeds/local.sql](../seeds/local.sql)) tapi belum punya jalur tulis dari API.
