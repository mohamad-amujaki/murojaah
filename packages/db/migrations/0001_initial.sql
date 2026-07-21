PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  daily_target INTEGER NOT NULL DEFAULT 10,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS surahs (
  id INTEGER PRIMARY KEY,
  latin_name TEXT NOT NULL,
  arabic_name TEXT NOT NULL,
  meaning TEXT NOT NULL,
  ayah_count INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS ayahs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  surah_id INTEGER NOT NULL REFERENCES surahs(id),
  number INTEGER NOT NULL,
  arabic TEXT NOT NULL,
  transliteration TEXT,
  translation TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  UNIQUE(surah_id, number)
);

CREATE TABLE IF NOT EXISTS classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  teacher_id INTEGER NOT NULL REFERENCES users(id),
  join_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS class_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  class_id INTEGER NOT NULL REFERENCES classes(id),
  student_id INTEGER NOT NULL REFERENCES users(id),
  UNIQUE(class_id, student_id)
);

CREATE TABLE IF NOT EXISTS parent_children (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id INTEGER NOT NULL REFERENCES users(id),
  child_id INTEGER NOT NULL REFERENCES users(id),
  UNIQUE(parent_id, child_id)
);

CREATE TABLE IF NOT EXISTS assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  creator_id INTEGER NOT NULL REFERENCES users(id),
  class_id INTEGER REFERENCES classes(id),
  student_id INTEGER REFERENCES users(id),
  surah_id INTEGER NOT NULL REFERENCES surahs(id),
  start_ayah INTEGER NOT NULL,
  end_ayah INTEGER NOT NULL,
  target_loops INTEGER NOT NULL,
  due_at TEXT,
  status TEXT NOT NULL DEFAULT 'active'
);

CREATE TABLE IF NOT EXISTS practice_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  surah_id INTEGER NOT NULL REFERENCES surahs(id),
  start_ayah INTEGER NOT NULL,
  end_ayah INTEGER NOT NULL,
  loops INTEGER NOT NULL,
  duration INTEGER NOT NULL,
  status TEXT NOT NULL,
  completed_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS session_user_date ON practice_sessions(user_id, completed_at);

CREATE TABLE IF NOT EXISTS ayah_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  ayah_id INTEGER NOT NULL REFERENCES ayahs(id),
  mastery TEXT NOT NULL,
  repetitions INTEGER NOT NULL DEFAULT 0,
  last_practiced_at TEXT,
  UNIQUE(user_id, ayah_id)
);

CREATE TABLE IF NOT EXISTS badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  badge_id INTEGER NOT NULL REFERENCES badges(id),
  earned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, badge_id)
);

CREATE TABLE IF NOT EXISTS xp_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  source TEXT NOT NULL UNIQUE,
  amount INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS encouragements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id INTEGER NOT NULL REFERENCES users(id),
  child_id INTEGER NOT NULL REFERENCES users(id),
  message TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO users (id, display_name, role, status, daily_target)
VALUES
  (1, 'Ahmad Hafiz', 'student', 'active', 10),
  (2, 'Ustazah Aisyah', 'teacher', 'active', 10),
  (3, 'Bunda Sarah', 'parent', 'active', 10),
  (4, 'Admin HafizAyat', 'admin', 'active', 10);

INSERT OR IGNORE INTO surahs (id, latin_name, arabic_name, meaning, ayah_count)
VALUES
  (112, 'Al-Ikhlas', 'الإخلاص', 'Ketulusan', 4),
  (113, 'Al-Falaq', 'الفلق', 'Waktu Subuh', 5),
  (114, 'An-Nas', 'الناس', 'Manusia', 6);

INSERT OR IGNORE INTO ayahs (surah_id, number, arabic, transliteration, translation, audio_url)
VALUES
  (112, 1, 'قُلْ هُوَ ٱللَّهُ أَحَدٌ', 'Qul huwallāhu aḥad', 'Katakanlah (Muhammad), Dialah Allah, Yang Maha Esa.', 'https://cdn.equran.id/audio-partial/Misyari-Rasyid-Al-Afasi/112001.mp3'),
  (112, 2, 'ٱللَّهُ ٱلصَّمَدُ', 'Allāhuṣ-ṣamad', 'Allah tempat meminta segala sesuatu.', 'https://cdn.equran.id/audio-partial/Misyari-Rasyid-Al-Afasi/112002.mp3'),
  (112, 3, 'لَمْ يَلِدْ وَلَمْ يُولَدْ', 'Lam yalid wa lam yūlad', '(Allah) tidak beranak dan tidak pula diperanakkan.', 'https://cdn.equran.id/audio-partial/Misyari-Rasyid-Al-Afasi/112003.mp3'),
  (112, 4, 'وَلَمْ يَكُن لَّهُۥ كُفُوًا أَحَدٌۢ', 'Wa lam yakul lahū kufuwan aḥad', 'Dan tidak ada sesuatu yang setara dengan Dia.', 'https://cdn.equran.id/audio-partial/Misyari-Rasyid-Al-Afasi/112004.mp3');
