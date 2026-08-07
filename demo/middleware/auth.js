function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Belum login. Silakan masuk terlebih dahulu.' });
  }
  next();
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: 'Belum login.' });
    }
    if (req.session.user.role !== role) {
      return res.status(403).json({ error: 'Anda tidak memiliki akses ke resource ini.' });
    }
    next();
  };
}

// Proteksi CSRF sederhana (double-submit token) untuk request yang mengubah data.
// Token disimpan di session saat login/ambil captcha, dan wajib dikirim balik
// lewat header X-CSRF-Token oleh frontend.
function requireCsrf(req, res, next) {
  const tokenFromHeader = req.get('X-CSRF-Token');
  if (!req.session.csrfToken || tokenFromHeader !== req.session.csrfToken) {
    return res.status(403).json({ error: 'CSRF token tidak valid atau hilang.' });
  }
  next();
}

module.exports = { requireAuth, requireRole, requireCsrf };
