require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const path = require('path');

const pool = require('./db/pool');
const authRoutes = require('./routes/auth');
const animoRoutes = require('./routes/animo');
const laporanRoutes = require('./routes/laporan');
const catRoutes = require('./routes/cat');
const tkjRoutes = require('./routes/tkj');

const app = express();

// Percaya proxy di depan (nginx/load balancer) supaya cookie "secure" &
// rate-limit IP detection bekerja benar saat di-deploy di belakang reverse proxy.
app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", 'https://fonts.googleapis.com', "'unsafe-inline'"],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
    },
  },
}));

app.use(express.json({ limit: '100kb' }));

const sessionStore = new MySQLStore({}, pool);

app.use(session({
  key: 'connect.sid',
  secret: process.env.SESSION_SECRET,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === 'true', // WAJIB true kalau sudah di HTTPS
    maxAge: 1000 * 60 * 60 * 4, // 4 jam
  },
}));

// ---- API routes ----
app.use('/api/auth', authRoutes);
app.use('/api/animo', animoRoutes);
app.use('/api/laporan', laporanRoutes);
app.use('/api/cat', catRoutes);
app.use('/api/tkj', tkjRoutes);

// ---- Frontend statis ----
app.use(express.static(path.join(__dirname, 'public')));

// Fallback ke index.html untuk semua route non-API (single-page app)
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ---- Error handler terakhir ----
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error('UNHANDLED_ERROR', err);
  res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server jalan di http://localhost:${PORT} (${process.env.NODE_ENV || 'development'})`);
});
