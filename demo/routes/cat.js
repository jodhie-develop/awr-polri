const express = require('express');
const pool = require('../db/pool');
const { requireAuth, requireCsrf } = require('../middleware/auth');
const catAkademik = require('../data/catAkademik.json');
const catPsikologi = require('../data/catPsikologi.json');

const router = express.Router();

function getBank(jenis) {
  return jenis === 'akademik' ? catAkademik : jenis === 'psikologi' ? catPsikologi : null;
}

// Strip kunci jawaban ("ans") sebelum dikirim ke client — ini yang paling penting:
// di versi lama, jawaban benar ada di JS client sehingga bisa dibaca lewat DevTools.
function publicBank(bank) {
  return bank.map((subject) => ({
    subject: subject.subject,
    qs: subject.qs.map(({ q, opts }) => ({ q, opts })),
  }));
}

router.get('/:jenis/questions', requireAuth, (req, res) => {
  const bank = getBank(req.params.jenis);
  if (!bank) return res.status(400).json({ error: 'Jenis CAT tidak dikenal.' });
  res.json(publicBank(bank));
});

// Body: { jalur, jenis, answers: { "subjectIdx-qIdx": optionIndex, ... } }
router.post('/:jenis/submit', requireAuth, requireCsrf, async (req, res) => {
  const bank = getBank(req.params.jenis);
  if (!bank) return res.status(400).json({ error: 'Jenis CAT tidak dikenal.' });

  const { jalur, answers } = req.body;
  if (!jalur || typeof answers !== 'object' || answers === null) {
    return res.status(400).json({ error: 'Data jawaban tidak valid.' });
  }

  let correct = 0;
  let total = 0;
  const perSubject = bank.map((s) => ({ subject: s.subject, total: s.qs.length, correct: 0 }));

  bank.forEach((subject, si) => {
    subject.qs.forEach((q, qi) => {
      total++;
      const key = `${si}-${qi}`;
      if (answers[key] === q.ans) {
        correct++;
        perSubject[si].correct++;
      }
    });
  });

  const score = Math.round((correct / total) * 100);

  await pool.query(
    `INSERT INTO cat_results (user_id, jalur, jenis, score, detail_json) VALUES (?, ?, ?, ?, ?)`,
    [req.session.user.id, jalur, req.params.jenis, score, JSON.stringify(perSubject)]
  );

  res.json({ score, correct, total, perSubject, passed: score >= 60 });
});

module.exports = router;
