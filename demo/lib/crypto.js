const crypto = require('crypto');

const ALGO = 'aes-256-gcm';

function getKey() {
  const hex = process.env.NIK_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      'NIK_ENCRYPTION_KEY belum diset dengan benar (harus 64 karakter hex / 32 byte). ' +
      'Generate dengan: openssl rand -hex 32'
    );
  }
  return Buffer.from(hex, 'hex');
}

// NIK disimpan terenkripsi di kolom nik_encrypted (bukan plaintext),
// supaya kalau database bocor, NIK tidak langsung terbaca.
function encryptNik(plainNik) {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plainNik), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // simpan iv + authTag + ciphertext jadi satu buffer
  return Buffer.concat([iv, authTag, encrypted]);
}

function decryptNik(buffer) {
  const key = getKey();
  const iv = buffer.subarray(0, 12);
  const authTag = buffer.subarray(12, 28);
  const encrypted = buffer.subarray(28);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

// Hash satu-arah (bukan untuk dekripsi) — dipakai untuk cek NIK duplikat
// tanpa perlu mendekripsi seluruh tabel.
function hashNik(plainNik) {
  return crypto.createHash('sha256').update(String(plainNik)).digest('hex');
}

function hashOtp(otp) {
  return crypto.createHash('sha256').update(String(otp)).digest('hex');
}

function generateOtp() {
  return String(crypto.randomInt(100000, 1000000)); // 6 digit
}

module.exports = { encryptNik, decryptNik, hashNik, hashOtp, generateOtp };
