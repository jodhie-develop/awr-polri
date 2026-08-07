/**
 * Membuat akun pertama dengan role 'polri'.
 * Sengaja TIDAK lewat form Sign Up publik, karena role 'polri' (panitia/anggota)
 * tidak boleh bisa dibuat sendiri oleh siapa pun yang mendaftar dari internet.
 *
 * Pemakaian:
 *   node scripts/seed-admin.js <username> <nik16digit> <email> <password>
 */
require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('../db/pool');
const { encryptNik, hashNik } = require('../lib/crypto');

async function main() {
  const [username, nik, email, password] = process.argv.slice(2);
  if (!username || !nik || !email || !password) {
    console.error('Pemakaian: node scripts/seed-admin.js <username> <nik16digit> <email> <password>');
    process.exit(1);
  }
  if (!/^\d{16}$/.test(nik)) {
    console.error('NIK harus 16 digit angka.');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const nikEncrypted = encryptNik(nik);
  const nikHash = hashNik(nik);

  await pool.query(
    `INSERT INTO users (username, nik_encrypted, nik_hash, email, password_hash, role)
     VALUES (?, ?, ?, ?, ?, 'polri')`,
    [username, nikEncrypted, nikHash, email, passwordHash]
  );

  console.log(`Akun polri "${username}" berhasil dibuat.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('SEED_ERROR', err);
  process.exit(1);
});
