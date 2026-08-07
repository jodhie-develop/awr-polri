const express = require('express');
const pool = require('../db/pool');
const { requireAuth, requireCsrf } = require('../middleware/auth');

const router = express.Router();
const NBL = 41;

function clamp(v) {
  const n = parseFloat(v);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

router.post('/hitung', requireAuth, requireCsrf, async (req, res) => {
  const a = clamp(req.body.a);
  const b1 = clamp(req.body.b1);
  const b2 = clamp(req.body.b2);
  const b3 = clamp(req.body.b3);
  const b4 = clamp(req.body.b4);
  const renang = clamp(req.body.renang);

  const nilaiSamaptaB = (b1 + b2 + b3 + b4) / 4;
  const nilaiKesamaptaan = (a + nilaiSamaptaB) / 2;
  const nilaiAkhir = nilaiKesamaptaan * 0.7 + renang * 0.3;
  const posKosong = [a, b1, b2, b3, b4, renang].some((v) => v <= 0);
  const lulus = nilaiAkhir >= NBL && !posKosong;

  await pool.query(
    `INSERT INTO tkj_simulasi (user_id, nilai_a, nilai_b1, nilai_b2, nilai_b3, nilai_b4, nilai_renang, nilai_akhir, lulus)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.session.user.id, a, b1, b2, b3, b4, renang, nilaiAkhir, lulus ? 1 : 0]
  );

  res.json({
    nilaiSamaptaB: Number(nilaiSamaptaB.toFixed(2)),
    nilaiKesamaptaan: Number(nilaiKesamaptaan.toFixed(2)),
    nilaiRenang: renang,
    nilaiAkhir: Number(nilaiAkhir.toFixed(2)),
    lulus,
    posKosong,
    nbl: NBL,
  });
});

module.exports = router;
