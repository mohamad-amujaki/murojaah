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
