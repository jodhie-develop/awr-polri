const express = require('express');
const pool = require('../db/pool');
const { requireRole, requireCsrf } = require('../middleware/auth');
const { animoLimiter } = require('../middleware/rateLimiter');

const router = express.Router();
const VALID_JALUR = new Set(['SIPSS', 'AKPOL', 'BINTARA', 'TAMTAMA']);

// Publik: siapa pun (termasuk Tamu) boleh menambah klik minat saat memilih jalur.
router.post('/:jalur/click', animoLimiter, requireCsrf, async (req, res) => {
  const jalur = req.params.jalur;
  if (!VALID_JALUR.has(jalur)) {
    return res.status(400).json({ error: 'Jalur tidak dikenal.' });
  }
  await pool.query('UPDATE animo SET count = count + 1 WHERE jalur = ?', [jalur]);
  const [rows] = await pool.query('SELECT count FROM animo WHERE jalur = ?', [jalur]);
  res.json({ jalur, count: rows[0].count });
});

// Hanya role 'polri' yang boleh melihat rekap lengkap.
router.get('/', requireRole('polri'), async (req, res) => {
  const [rows] = await pool.query('SELECT jalur, count FROM animo');
  const result = {};
  rows.forEach((r) => { result[r.jalur] = r.count; });
  res.json(result);
});

module.exports = router;
