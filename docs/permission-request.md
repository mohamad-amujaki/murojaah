# Draft Email Permintaan Izin — EQuran.id

Ditujukan ke: admin@equran.id
Terkait: Terms of Service EQuran.id ([https://equran.id/terms](https://equran.id/terms)), khususnya bagian 5 (Penggunaan API) dan 7 (Hak Kekayaan Intelektual).

Konteks: skrip [packages/db/scripts/import-quran.mjs](../packages/db/scripts/import-quran.mjs) sudah menarik seluruh 114 surah (6.236 ayat, termasuk terjemahan) dari API EQuran.id ke database MySQL milik aplikasi Murojaah untuk mendukung mode offline, dan service worker aplikasi meng-cache audio murottal dari CDN EQuran.id per-ayat setelah pertama diputar. Email ini meminta konfirmasi eksplisit bahwa penggunaan tersebut diperbolehkan, karena Terms of Service tidak secara eksplisit mengizinkan maupun melarang penyimpanan permanen/offline seperti ini.

---

**Subjek: Permintaan Izin Penggunaan API & Konten EQuran.id untuk Aplikasi Murojaah**

Assalamu'alaikum warahmatullahi wabarakatuh,

Perkenalkan, kami sedang mengembangkan **Murojaah**, aplikasi web (PWA) untuk membantu proses hafalan dan muraja'ah Al-Qur'an, yang menggunakan API EQuran.id sebagai sumber data ayat, terjemahan, dan audio murottal.

Sehubungan dengan Terms of Service EQuran.id yang kami baca di https://equran.id/terms, kami ingin memastikan dua hal berikut sudah sesuai ketentuan sebelum kami lanjutkan ke tahap produksi:

1. **Impor satu kali (one-time import) ke database kami sendiri.**
   Kami menjalankan skrip yang memanggil endpoint `GET /api/v2/surat/{id}` untuk seluruh 114 surah (total 6.236 ayat, termasuk teks Arab, transliterasi, dan terjemahan bahasa Indonesia), lalu menyimpannya secara permanen di database MySQL milik aplikasi kami. Tujuannya agar aplikasi tetap bisa menampilkan ayat & terjemahan saat pengguna sedang offline, tanpa bergantung pada ketersediaan API EQuran.id setiap saat. Proses ini dijalankan satu kali (bukan permintaan berulang saat runtime), dengan jeda antar-permintaan agar tidak membebani server.

2. **Cache audio murottal di perangkat pengguna.**
   Aplikasi kami menyimpan (cache) berkas audio dari CDN EQuran.id (`cdn.equran.id/audio-partial/...`) di perangkat pengguna melalui service worker, khusus untuk ayat yang sudah pernah diputar pengguna tersebut — bukan mengunduh seluruh koleksi audio sekaligus. Ini memungkinkan ayat yang sudah pernah dilatih tetap bisa didengarkan saat pengguna offline.

Kami ingin mengonfirmasi:

- Apakah penyimpanan permanen data ayat & terjemahan (poin 1) di database kami sendiri diperbolehkan, mengingat pasal 7 Terms of Service menyebutkan terjemahan dilindungi hak cipta?
- Apakah cache audio per-ayat di sisi klien (poin 2) untuk keperluan offline diperbolehkan?
- Apakah ada batasan rate limit resmi untuk proses impor satu kali seperti ini, agar kami bisa menyesuaikan jeda antar-permintaan skrip kami?
- Format atribusi seperti apa yang EQuran.id harapkan kami tampilkan di aplikasi? (Saat ini kami sudah mencantumkan "Sumber: EQuran.id" di beberapa bagian aplikasi.)

Aplikasi ini bersifat non-komersial pada tahap ini dan kami tidak menjual maupun memperjualbelikan data yang diperoleh. Kami sangat menghargai layanan gratis yang EQuran.id sediakan untuk umat, dan ingin memastikan penggunaan kami tetap sesuai syarat dan mendukung keberlangsungan layanan EQuran.id.

Mohon arahannya. Terima kasih banyak atas waktu dan layanannya.

Wassalamu'alaikum warahmatullahi wabarakatuh,

Jaki
No WA: +62 81315866766

---

## Catatan Tindak Lanjut

- **Sudah dikirim** — draft ini perlu direview dan dilengkapi identitas pengirim sebelum dikirim ke admin@equran.id.
- Jika EQuran.id meminta perubahan (mis. hapus data terjemahan tersimpan, batasi cache audio, atau format atribusi tertentu), sesuaikan [import-quran.mjs](../packages/db/scripts/import-quran.mjs), [sw.js](../apps/web/public/sw.js), dan teks atribusi di [App.tsx](../apps/web/src/App.tsx) / [Practice.tsx](../apps/web/src/pages/Practice.tsx).
- Simpan balasan resmi (jika ada) sebagai referensi hukum untuk proyek ini.
