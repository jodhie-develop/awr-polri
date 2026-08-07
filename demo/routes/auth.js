const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const pool = require('../db/pool');
const { encryptNik, decryptNik, hashNik, hashOtp, generateOtp } = require('../lib/crypto');
const { requireCsrf, requireAuth } = require('../middleware/auth');
const { loginLimiter, signupLimiter, otpVerifyLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

const NIK_REGEX = /^\d{16}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BCRYPT_ROUNDS = 12;
// Hash "dummy" dipakai saat username tidak ditemukan, supaya waktu respons
// login tetap konsisten (mencegah user enumeration lewat timing attack).
const DUMMY_HASH = '$2b$12$C6UzMDM.H6dfI/f/IKcEeOFULY4LlpsIVQjBLOR2Ii1c3G4qJmuFq';

// ---- CSRF token: frontend ambil ini dulu sebelum kirim form ----
router.get('/csrf-token', (req, res) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(24).toString('hex');
  }
  res.json({ csrfToken: req.session.csrfToken });
});

// ---- Captcha sederhana (soal hitung), jawaban disimpan di session ----
router.get('/captcha', (req, res) => {
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  req.session.captchaAnswer = a + b;
  res.json({ question: `${a} + ${b} = ?` });
});

// ---- Cek sesi aktif ----
router.get('/me', (req, res) => {
  if (!req.session.user) return res.json({ loggedIn: false });
  res.json({ loggedIn: true, user: req.session.user });
});

// ---- LOGIN ----
router.post('/login', loginLimiter, requireCsrf, async (req, res) => {
  try {
    const { username, password, captcha } = req.body;

    if (parseInt(captcha, 10) !== req.session.captchaAnswer) {
      return res.status(400).json({ error: 'Jawaban verifikasi captcha belum tepat.' });
    }
    req.session.captchaAnswer = null; // captcha sekali pakai

    if (!username || !password) {
      return res.status(400).json({ error: 'User Name dan Kata Sandi wajib diisi.' });
    }

    const [rows] = await pool.query(
      'SELECT id, username, password_hash, role FROM users WHERE username = ? LIMIT 1',
      [username]
    );

    const user = rows[0];
    const hashToCheck = user ? user.password_hash : DUMMY_HASH;
    const passwordOk = await bcrypt.compare(password, hashToCheck);

    if (!user || !passwordOk) {
      return res.status(401).json({ error: 'User Name atau Kata Sandi salah.' });
    }

    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ error: 'Gagal membuat sesi.' });
      req.session.user = { id: user.id, username: user.username, role: user.role };
      req.session.csrfToken = crypto.randomBytes(24).toString('hex'); // rotate token setelah login
      res.json({ loggedIn: true, user: req.session.user, csrfToken: req.session.csrfToken });
    });
  } catch (err) {
    console.error('LOGIN_ERROR', err);
    res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
});

// ---- LOGOUT ----
router.post('/logout', requireCsrf, (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ loggedIn: false });
  });
});

// ---- SIGNUP tahap 1: validasi data + kirim OTP ----
router.post('/signup/start', signupLimiter, requireCsrf, async (req, res) => {
  try {
    const { username, nik, email, password } = req.body;

    if (!username || !nik || !email || !password) {
      return res.status(400).json({ error: 'Lengkapi User Name, NIK, Email, dan Kata Sandi.' });
    }
    if (!NIK_REGEX.test(nik)) {
      return res.status(400).json({ error: 'NIK harus 16 digit angka.' });
    }
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: 'Masukkan email yang valid.' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Kata sandi minimal 8 karakter.' });
    }

    const nikHash = hashNik(nik);
    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ? OR nik_hash = ? LIMIT 1',
      [email, nikHash]
    );
    if (existing.length > 0) {
      // Pesan digeneralisir supaya tidak membocorkan email/NIK mana yang sudah terdaftar
      return res.status(409).json({ error: 'Email atau NIK sudah terdaftar.' });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const nikEncrypted = encryptNik(nik).toString('base64');

    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 menit

    await pool.query('DELETE FROM otp_codes WHERE email = ? AND purpose = ?', [email, 'signup']);
    await pool.query(
      `INSERT INTO otp_codes (email, otp_hash, purpose, pending_user_json, expires_at)
       VALUES (?, ?, 'signup', ?, ?)`,
      [
        email,
        otpHash,
        JSON.stringify({ username, nikEncrypted, email, passwordHash }),
        expiresAt,
      ]
    );

    // TODO: sambungkan ke layanan email sungguhan (mis. nodemailer + SMTP resmi instansi).
    console.log(`[DEV] OTP untuk ${email}: ${otp}`);

    const payload = { message: 'Kode OTP telah dikirim ke email Anda.' };
    if (process.env.DEV_EXPOSE_OTP === 'true') payload.devOtp = otp; // HANYA development
    res.json(payload);
  } catch (err) {
    console.error('SIGNUP_START_ERROR', err);
    res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
});

// ---- SIGNUP tahap 2: verifikasi OTP -> buat akun ----
router.post('/signup/verify', otpVerifyLimiter, requireCsrf, async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email dan kode OTP wajib diisi.' });
    }

    const [rows] = await conn.query(
      `SELECT * FROM otp_codes WHERE email = ? AND purpose='signup' AND consumed = 0
       ORDER BY id DESC LIMIT 1`,
      [email]
    );
    const record = rows[0];
    if (!record || new Date(record.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Kode OTP tidak ditemukan atau sudah kedaluwarsa. Kirim ulang OTP.' });
    }
    if (record.attempt_count >= 5) {
      return res.status(429).json({ error: 'Terlalu banyak percobaan. Kirim ulang OTP.' });
    }
    if (hashOtp(otp) !== record.otp_hash) {
      await conn.query('UPDATE otp_codes SET attempt_count = attempt_count + 1 WHERE id = ?', [record.id]);
      return res.status(400).json({ error: 'Kode OTP tidak sesuai.' });
    }

    const pending = record.pending_user_json; // driver otomatis parse JSON
    const nikEncryptedBuf = Buffer.from(pending.nikEncrypted, 'base64');
    const nikPlain = decryptNik(nikEncryptedBuf);
    const nikHash = hashNik(nikPlain);

    await conn.beginTransaction();
    const [result] = await conn.query(
      `INSERT INTO users (username, nik_encrypted, nik_hash, email, password_hash, role)
       VALUES (?, ?, ?, ?, ?, 'pendaftar')`,
      [pending.username, nikEncryptedBuf, nikHash, pending.email, pending.passwordHash]
    );
    await conn.query('UPDATE otp_codes SET consumed = 1 WHERE id = ?', [record.id]);
    await conn.commit();

    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ error: 'Gagal membuat sesi.' });
      req.session.user = { id: result.insertId, username: pending.username, role: 'pendaftar' };
      req.session.csrfToken = crypto.randomBytes(24).toString('hex');
      res.json({ loggedIn: true, user: req.session.user, csrfToken: req.session.csrfToken });
    });
  } catch (err) {
    await conn.rollback();
    console.error('SIGNUP_VERIFY_ERROR', err);
    res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  } finally {
    conn.release();
  }
});

module.exports = router;
