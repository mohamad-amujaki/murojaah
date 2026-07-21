# Rekomendasi UX — Landing Page Murojaah

Konteks: saat ini `index.html` langsung boot ke form login/daftar ([apps/web/src/pages/Auth.tsx](../apps/web/src/pages/Auth.tsx)) — pengunjung baru tidak pernah melihat apa itu Murojaah sebelum diminta bikin akun. Ini rekomendasi untuk halaman marketing terpisah di `/` yang tampil sebelum auth, memakai token desain yang sudah ada di [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) (hijau `#106b55`, emas `#e7aa33`, krem `#f8f7f2`, font Manrope + Noto Naskh Arabic).

## 1. Tujuan Halaman
Satu tujuan konversi: **dapatkan pengunjung untuk mendaftar** (murid mandiri, atau orang tua yang akan membuat profil anak). Semua elemen di halaman harus mendukung tujuan itu — bukan galeri fitur tanpa arah.

## 2. Struktur & Urutan Section

### 2.1 Navbar tipis
- Logo Murojaah (kiri) — reuse `.brand`/`.brandmark` yang sudah ada.
- Kanan: tombol "Masuk" (teks/outline) + tombol "Daftar Gratis" (`.primary`, solid hijau) — dua CTA level rendah vs tinggi, standar SaaS.
- Sticky tipis dengan `backdrop-filter: blur` saat scroll, transparan di atas hero.

### 2.2 Hero
- Headline pendek berbasis manfaat, bukan fitur: **"Muraja'ah Al-Qur'an, sedikit demi sedikit, setiap hari."** (echo dari copy sidebar-tip yang sudah ada — konsisten dengan nada aplikasi).
- Sub-headline 1 kalimat: siapa produk ini untuk (murid, keluarga, guru tahfiz).
- CTA ganda: **"Mulai Gratis"** (→ Daftar) sebagai primer, **"Sudah punya akun? Masuk"** sebagai teks link sekunder — jangan taruh dua tombol berbobot sama, itu memecah perhatian.
- Visual kanan: reuse elemen dekoratif `.hero-art` (mushaf/moon/star) yang sudah ada di kartu hero dashboard — jaga konsistensi visual brand, bukan ilustrasi generik baru dari stock/AI.
- Di bawah CTA: baris kepercayaan kecil, mis. "Dipakai untuk hafalan pribadi & kelas tahfiz" — jangan pakai angka palsu ("10.000+ pengguna") kalau belum benar ada datanya.

### 2.3 Social proof / kepercayaan (opsional, taruh tipis)
- Karena produk masih baru, jangan paksakan testimoni palsu. Ganti dengan **badge kepercayaan yang jujur**: "Data ayat & audio dari EQuran.id", "Progres tersimpan aman", "Bisa dipakai offline". Ini juga sekaligus memenuhi kewajiban atribusi EQuran.id (lihat [permission-request.md](permission-request.md)).

### 2.4 Fitur utama (3–4 kartu, bukan 10)
Pilih yang paling membedakan, map ke fitur yang **sudah nyata jalan**, jangan janji fitur yang belum ada:
1. **Latihan terstruktur** — pilih surah, atur pengulangan & kecepatan audio, sembunyikan teks untuk uji hafalan.
2. **Progres & pencapaian** — XP, streak, lencana otomatis.
3. **Sekeluarga bisa pantau** — satu akun orang tua, banyak profil anak, kirim dukungan langsung ke anak.
4. **Bisa offline** — sesi latihan tetap tersimpan tanpa koneksi, tersinkron otomatis.

Format kartu: ikon (reuse lucide-react set yang sudah dipakai: `BookOpen`, `Trophy`, `Users`, `WifiOff`) + judul singkat + 1 kalimat penjelasan. Reuse `.card` styling, jangan bikin komponen kartu baru dari nol.

### 2.5 Cara kerja (3 langkah)
Visual angka 1–2–3 sederhana (reuse pola `<span>1</span>` yang sudah dipakai di `.picker h3`/`.settings-card h3`):
1. Daftar (email atau Google) — pilih peran: murid, guru, atau orang tua.
2. Pilih surah & atur sesi latihanmu.
3. Latihan konsisten, pantau progres, dapat XP & lencana.

### 2.6 CTA penutup
Section pendek, latar gradient hijau (reuse `.hero-card` gradient `linear-gradient(120deg,#0c735b,#08503f)`), satu headline + satu tombol besar "Daftar Gratis". Pengulangan CTA di akhir halaman scroll adalah pola konversi standar — jangan lewati.

### 2.7 Footer minimal
Logo kecil, link Masuk/Daftar, atribusi EQuran.id, tahun. Tidak perlu footer 5 kolom ala korporat besar — produk ini masih tahap awal, footer gemuk hanya menambah beban tanpa manfaat konversi.

## 3. Prinsip Desain
- **Konsisten dengan token yang ada** — jangan perkenalkan palet warna atau font baru. Landing harus terasa seperti pintu masuk ke aplikasi yang sama, bukan microsite terpisah.
- **Copy berbahasa Indonesia, nada hangat** — samakan dengan nada aplikasi saat ini ("MasyaAllah", "Sedikit demi sedikit"), jangan tiba-tiba jadi corporate-speak di landing.
- **Above the fold harus menjawab 3 pertanyaan dalam 3 detik**: apa ini, untuk siapa, apa yang saya lakukan sekarang (klik apa).
- **Satu CTA primer per section** — dua tombol setara berdampingan menurunkan conversion rate (paradox of choice); selalu ada 1 tombol solid + maksimal 1 link teks sekunder.
- **Mobile-first** — mayoritas trafik landing page produk konsumer datang dari mobile; hero, kartu fitur, dan CTA harus dites di lebar 375px dulu, desktop menyusul (pola breakpoint yang sudah ada di [styles.css](../apps/web/src/styles.css) sudah mobile-first, lanjutkan pola itu).
- **Kecepatan muat** — tidak ada gambar besar/video di atas fold; pakai elemen dekoratif CSS/SVG yang sudah ada (`.hero-art`), bukan foto stok berat.
- **Aksesibilitas** — kontras teks di atas gradient hijau harus tetap ≥4.5:1 (putih di atas `#0c735b` sudah aman, sudah dipakai di `.hero-card`), semua tombol CTA harus punya target sentuh ≥44px (pola `.primary` yang ada sudah `min-height:44px`, pertahankan).

## 4. Struktur Routing yang Direkomendasikan
- `/` (tanpa sesi login) → `LandingPage` baru.
- CTA "Masuk"/"Daftar" di landing → set state lokal (bukan route terpisah, cukup toggle in-memory) untuk menampilkan `AuthPage` yang sudah ada, dengan tab yang sesuai (masuk vs daftar) sudah aktif.
- `/` (dengan sesi login aktif) → langsung ke aplikasi (`AuthenticatedApp`), skip landing — pengguna yang sudah login tidak boleh diganggu halaman marketing setiap buka app (penting untuk PWA yang dibuka dari homescreen).
- Setelah logout, kembali ke `LandingPage`, bukan langsung ke form login — beri jalan keluar yang lengkap, bukan dead-end form.

## 5. Yang Sengaja Tidak Direkomendasikan (untuk versi pertama)
- Video hero / animasi Lottie berat — tidak sepadan dengan waktu build vs dampak konversi di tahap ini.
- Blog/resource center — bukan prioritas sebelum core product-market fit tervalidasi.
- Live chat widget pihak ketiga — tambahan dependency & privacy surface yang belum perlu.
- Comparison table vs kompetitor — belum ada kompetitor yang perlu dibandingkan secara eksplisit di copy publik.
