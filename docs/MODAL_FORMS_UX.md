# Rekomendasi UX — Form Modal (Pengganti `window.prompt()`)

Konteks: 4 aksi saat ini memakai `window.prompt()` berantai — Buat kelas & Buat tugas (guru, [Dashboard.tsx](../apps/web/src/pages/Dashboard.tsx)), Tambah profil anak & Kirim dukungan (orang tua, [App.tsx](../apps/web/src/App.tsx) dan Dashboard.tsx). Dokumen ini merekomendasikan modal pengganti, memakai pola yang **sudah terbukti jalan**: `AuthDialog` ([Auth.tsx](../apps/web/src/pages/Auth.tsx)) sudah membangun shell modal (backdrop blur, kartu tengah, tombol X, tutup via Escape/klik-luar, animasi masuk) — jangan bangun ulang, cukup pakai ulang classnya (`.auth-modal-backdrop`, `.auth-modal`, `.auth-card`) untuk keempat form baru ini.

## Prinsip Umum
- **Satu shell modal, dipakai ulang untuk keempatnya** — bukan 4 komponen modal terpisah dari nol. Buat satu komponen generik `<Modal onClose>` yang membungkus backdrop+card+tombol-X (ekstrak dari `AuthDialog` yang sudah ada), lalu tiap form jadi children-nya.
- **Reuse elemen form yang sudah ada**, jangan desain input baru: `label > input/select` dari `.auth-card`/`.preferences`, segmented control dari Practice page (`.segmented`) untuk pilihan singkat (mis. jumlah pengulangan), pencarian surah (`.search` + `.surah-list`) dari Practice page untuk memilih surah di form tugas — komponen ini sudah ada dan teruji.
- **Validasi inline**, bukan `alert()`: pesan error di bawah field yang salah (pola `.auth-error` sudah ada), tombol submit disabled saat `busy` dengan teks berubah ("Menyimpan...") — pola yang sama persis dengan `AuthDialog`.
- **State sukses di dalam modal, bukan cuma toast** — untuk data yang perlu diingat pengguna (terutama kode gabung kelas), modal harus menampilkan hasilnya sebelum tertutup, bukan sekadar toast yang hilang dalam 3 detik.

## 1. Buat Kelas (Guru)
**Saat ini**: 1 `prompt()` untuk nama, hasil kode gabung cuma muncul di toast sekilas — kode itu penting (dipakai murid untuk join) dan gampang terlewat.

**Rekomendasi**:
- Modal 2 tahap dalam satu komponen (bukan reload/navigasi):
  1. **Form**: satu field "Nama kelas" (`autoFocus`), tombol primer "Buat Kelas".
  2. **Setelah submit sukses → tampilan berubah jadi konfirmasi** di modal yang sama: kode gabung ditampilkan besar & jelas (mis. font mono, ukuran besar, dengan tombol "Salin kode" yang copy ke clipboard + ganti label sebentar jadi "Tersalin!"), plus tombol "Selesai" untuk menutup.
- Ini menghindari kondisi paling buruk: guru buat kelas, toast kode gabung sudah hilang sebelum sempat dicatat, dan tidak ada cara melihatnya lagi tanpa buka lagi lewat API.

## 2. Buat Tugas (Guru)
**Saat ini**: 4 `prompt()` berurutan (nomor surah manual diketik, mulai ayat, sampai ayat, jumlah pengulangan) — rawan salah ketik nomor surah, tidak ada validasi rentang ayat, tidak ada pilihan tenggat.

**Rekomendasi** — form satu layar (bukan wizard multi-step, karena cuma 5 field):
- **Surah**: reuse komponen pencarian dari Practice page (`.search` + daftar surah dari `getSurahs()`) — ketik nama, klik pilih, bukan ketik nomor manual. Tampilkan surah terpilih dengan cara yang sama seperti `.selected-surah` di Practice page.
- **Rentang ayat**: dua `<select>` "Mulai ayat"/"Sampai ayat" yang otomatis terisi sesuai `ayahCount` surah terpilih (pola sudah ada di Practice page — `end` select filter `a.no>=start`).
- **Jumlah pengulangan**: segmented control `["1","3","5","10"]` (reuse `.segmented`), bukan ketik bebas — mencegah nilai aneh seperti "-5" atau teks.
- **Tenggat (opsional)**: `<input type="date">` native — jangan bikin date-picker custom, browser sudah sediakan gratis (sesuai prinsip pakai fitur native dulu).
- **Target**: karena guru mungkin pegang >1 kelas, tambahkan `<select>` kelas di atas form (default: kelas yang sedang dipilih di dashboard).
- Tombol submit: "Buat Tugas untuk {nama kelas}" — sebutkan kelasnya eksplisit di label tombol supaya guru tidak salah kirim ke kelas yang salah.

## 3. Tambah Profil Anak (Orang Tua)
**Saat ini**: 1 `prompt()` untuk nama — sudah paling sederhana dari keempatnya.

**Rekomendasi**: modal ringan, 1 field ("Nama anak"), tombol "Tambah Profil". Ini kandidat termudah untuk dikerjakan duluan karena paling mirip alur `AuthDialog` yang sudah ada (form 1 field + submit). Tidak perlu tahap konfirmasi seperti kelas — hasilnya langsung terlihat di daftar profil setelah modal tertutup.

## 4. Kirim Dukungan (Orang Tua)
**Saat ini**: 2 `prompt()` berantai — pilih anak (ketik nama persis dari teks yang ditampilkan di prompt, rawan typo) lalu ketik pesan.

**Rekomendasi**:
- **Pilih anak**: `<select>` berisi nama-nama anak (bukan ketik manual) — kalau cuma 1 anak, field ini disembunyikan otomatis (skip langsung ke pesan, tidak perlu pilih dari satu opsi).
- **Pesan**: `<textarea>` bukan `<input>` — pesan dukungan biasanya lebih dari satu baris, dan `prompt()` browser tidak mendukung multi-baris sama sekali.
- Tampilkan preview singkat sebelum kirim opsional, tapi tidak wajib — untuk pesan singkat seperti ini, langsung kirim dengan tombol "Kirim Dukungan" sudah cukup.

## Prioritas Pengerjaan
Kalau dikerjakan bertahap, urutan yang paling masuk akal berdasarkan effort vs dampak:
1. **Tambah Profil Anak** — paling sederhana, langsung reuse pola `AuthDialog` apa adanya.
2. **Kirim Dukungan** — sedikit lebih kompleks (textarea + select kondisional), dampak UX tinggi (mencegah typo nama anak).
3. **Buat Kelas** — perlu tahap konfirmasi kode gabung, tapi masih 1 field input.
4. **Buat Tugas** — paling kompleks (5 field, reuse komponen pencarian surah), kerjakan terakhir setelah pola modal generik sudah stabil dari 3 form sebelumnya.

## Yang Sengaja Tidak Direkomendasikan
- Wizard multi-langkah untuk "Buat Tugas" — 5 field masih muat nyaman dalam satu layar scroll, memecah jadi beberapa langkah cuma menambah klik tanpa manfaat.
- Date-picker kalender custom untuk tenggat tugas — `<input type="date">` native sudah cukup dan otomatis mengikuti locale perangkat.
- Toast konfirmasi terpisah setelah modal tertutup — cukup satu sumber kebenaran (isi modal itu sendiri), jangan duplikasi pesan sukses di dua tempat.
