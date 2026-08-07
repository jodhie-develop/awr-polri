# Aplikasi Web Rekrutmen Polri — Backend (Node.js + Express + MySQL)

Backend untuk versi live-internal dari prototipe frontend `index.html`.
Menggantikan seluruh state mock di JS client dengan API sungguhan.

## Repo ini PUBLIK — bank soal & kunci jawaban CAT

`data/catAkademik.json` dan `data/catPsikologi.json` **sengaja tidak ikut
di-commit** (lihat `.gitignore`) karena berisi kunci jawaban (`ans`). Kalau
file itu ikut ke repo publik, kunci jawaban tetap kebaca siapa saja lewat
GitHub — sama saja percuma dipindah dari client ke server.

Sebagai gantinya, repo ini menyertakan `data/catAkademik.example.json` dan
`data/catPsikologi.example.json` (isi contoh saja) supaya struktur datanya
terlihat oleh siapa pun yang mengecek kode.

**Cara pasang bank soal sungguhan di server:**
1. Siapkan `data/catAkademik.json` dan `data/catPsikologi.json` versi
   lengkap di komputer kamu (boleh minta saya generate ulang dari bank
   soal lama, atau tulis sendiri sesuai contoh di atas).
2. Upload langsung ke server lewat `scp`/SFTP, **bukan lewat git**:
   ```bash
   scp data/catAkademik.json data/catPsikologi.json user@server:/path/ke/app/data/
   ```
   atau simpan di secret manager / private storage lain lalu tarik saat
   proses deploy (mis. GitHub Actions secret, tidak sebagai file di repo).
3. Pastikan permission file itu tidak bisa diakses publik lewat web server
   (folder `data/` tidak di-serve sebagai static — sudah begitu di
   `server.js`, yang di-serve statis cuma `public/`).

## Cek sebelum push pertama kali (repo publik)

- [ ] `git status` — pastikan tidak ada `.env` ikut ter-*stage*
- [ ] `git status` — pastikan `data/catAkademik.json` & `data/catPsikologi.json` **tidak** muncul (harus di-ignore)
- [ ] `.env.example` cuma berisi placeholder, bukan kredensial sungguhan (sudah dicek — aman)
- [ ] Ganti `SESSION_SECRET` & `NIK_ENCRYPTION_KEY` di server production dengan nilai baru hasil `openssl rand -hex 32` sendiri — jangan pernah pakai nilai contoh dari README/`.env.example`

## Apa yang berubah dari versi prototipe

| Sebelumnya (client-only) | Sekarang (server) |
|---|---|
| Login menerima username/password apa saja | Password di-hash (bcrypt), dicek ke MySQL |
| Kunci jawaban CAT ada di JS client (bisa dibaca lewat DevTools) | Bank soal & kunci jawaban hanya di server; client cuma terima soal+opsi |
| NIK/animo/laporan hanya di variabel JS (hilang saat refresh) | Tersimpan permanen di MySQL |
| Tidak ada proteksi CSRF/rate-limit | Ada CSRF token (double-submit) + rate limiting di endpoint sensitif |
| NIK tidak dienkripsi (karena tidak disimpan sama sekali) | NIK dienkripsi AES-256-GCM saat disimpan |

## 1. Persiapan

```bash
npm install
cp .env.example .env
```

Isi `.env`, minimal:
- `DB_USER`, `DB_PASSWORD`, `DB_NAME` — kredensial MySQL kamu
- `SESSION_SECRET` — generate: `openssl rand -hex 32`
- `NIK_ENCRYPTION_KEY` — generate: `openssl rand -hex 32` (harus persis 64 karakter hex)
- `DEV_EXPOSE_OTP=true` hanya untuk development (supaya kode OTP ikut muncul di UI seperti prototipe lama). **Wajib `false` saat live**, karena OTP harus dikirim lewat email sungguhan, bukan ditampilkan ke browser.

## 2. Buat database & tabel

```bash
npm run migrate
```

Ini menjalankan `db/schema.sql` (bisa juga dijalankan manual lewat `mysql` client kalau mau).

## 3. Buat akun pertama untuk role "polri"

Sign Up publik di frontend hanya membuat akun role `pendaftar` (sengaja — supaya
akses ke Panel Anggota/laporan/rekap animo tidak bisa dibuat sendiri oleh
sembarang pendaftar dari luar). Buat akun panitia/anggota lewat script:

```bash
node scripts/seed-admin.js budi.polri 1234567890123456 budi@polda-kalteng.go.id "passwordKuatSekali123"
```

## 4. Jalankan

```bash
npm start
# atau untuk auto-reload saat development:
npm run dev
```

Buka `http://localhost:3000` — frontend disajikan langsung oleh server ini
(dari folder `public/`), jadi tidak perlu server frontend terpisah.

## Catatan keamanan sebelum benar-benar live (walau internal)

1. **HTTPS**: kalau nanti diakses lewat jaringan (bukan cuma localhost),
   pasang reverse proxy (nginx/Caddy) dengan TLS, lalu set `COOKIE_SECURE=true`
   di `.env` — supaya cookie sesi tidak bisa disadap di jaringan.
2. **Email OTP sungguhan**: saat ini OTP hanya di-`console.log` di server
   (dan dikirim balik ke response jika `DEV_EXPOSE_OTP=true`). Sebelum
   dipakai orang lain, sambungkan ke SMTP resmi (mis. pakai `nodemailer`)
   di `routes/auth.js` fungsi `signup/start`.
3. **Backup `.env`**: jangan commit `.env` ke git (sudah ada pola di
   `.gitignore` yang disarankan di bawah). `SESSION_SECRET` dan
   `NIK_ENCRYPTION_KEY` itu rahasia — kalau bocor, sesi & data NIK ikut
   berisiko.
4. **Least privilege MySQL**: buat user MySQL (`DB_USER`) yang haknya
   dibatasi hanya ke database `polri_rekrutmen`, jangan pakai user `root`.
5. **Role `polri` hanya lewat `seed-admin.js`**: jangan tambahkan endpoint
   publik yang bisa membuat akun `polri` sendiri.
6. Endpoint laporan & rekap animo sudah dibatasi server-side lewat
   `requireRole('polri')` — jadi meskipun UI di-manipulasi lewat DevTools,
   data tetap tidak bisa diakses akun `pendaftar`.

## Struktur folder

```
server.js            # entry point, security middleware, mount routes
db/schema.sql         # skema MySQL
db/pool.js             # koneksi mysql2 pool
lib/crypto.js          # enkripsi NIK (AES-256-GCM) + hashing OTP/NIK
middleware/auth.js      # requireAuth, requireRole, requireCsrf
middleware/rateLimiter.js
routes/auth.js          # captcha, csrf-token, signup+OTP, login, logout, me
routes/animo.js         # klik minat per jalur + rekap (role polri)
routes/laporan.js       # CRUD laporan giat (role polri)
routes/cat.js           # soal CAT (tanpa kunci jawaban) + submit & skor
routes/tkj.js           # kalkulator TKJ (dihitung & dicatat di server)
data/catAkademik.json   # bank soal (dipindah dari index.html lama)
data/catPsikologi.json
scripts/migrate.js      # jalankan schema.sql
scripts/seed-admin.js   # buat akun role 'polri' pertama
public/index.html       # frontend (sudah disambungkan ke API di atas)
```

## .gitignore yang disarankan

```
node_modules/
.env
```
