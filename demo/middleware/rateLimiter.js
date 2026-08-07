const rateLimit = require('express-rate-limit');

// Login: batasi percobaan brute-force per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak percobaan login. Coba lagi beberapa menit lagi.' },
});

// Signup / kirim OTP: cegah spam pembuatan akun & spam OTP
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 jam
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak permintaan pendaftaran/OTP. Coba lagi nanti.' },
});

const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak percobaan verifikasi OTP. Coba lagi beberapa menit lagi.' },
});

// Klik animo: publik, tapi tetap dibatasi supaya tidak bisa dispam script
const animoLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Terlalu banyak permintaan. Coba lagi sesaat lagi.' },
});

module.exports = { loginLimiter, signupLimiter, otpVerifyLimiter, animoLimiter };
