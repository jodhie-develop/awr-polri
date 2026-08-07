const express = require('express');
const pool = require('../db/pool');
const { requireRole, requireCsrf } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireRole('polri'), async (req, res) => {
  const [rows] = await pool.query(
    `SELECT lg.id, lg.judul, lg.deskripsi, lg.tanggal, u.username AS oleh
     FROM laporan_giat lg JOIN users u ON u.id = lg.created_by
     ORDER BY lg.tanggal DESC, lg.id DESC LIMIT 100`
  );
  res.json(rows);
});

router.post('/', requireRole('polri'), requireCsrf, async (req, res) => {
  const { judul, deskripsi, tanggal } = req.body;
  if (!judul || !tanggal) {
    return res.status(400).json({ error: 'Judul dan tanggal wajib diisi.' });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
    return res.status(400).json({ error: 'Format tanggal tidak valid (YYYY-MM-DD).' });
  }
  const [result] = await pool.query(
    'INSERT INTO laporan_giat (judul, deskripsi, tanggal, created_by) VALUES (?, ?, ?, ?)',
    [String(judul).slice(0, 255), deskripsi ? String(deskripsi).slice(0, 5000) : null, tanggal, req.session.user.id]
  );
  res.status(201).json({ id: result.insertId });
});

module.exports = router;
