require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true,
  });
  console.log('Menjalankan schema.sql ...');
  await conn.query(sql);
  console.log('Selesai. Database & tabel siap dipakai.');
  await conn.end();
}

main().catch((err) => {
  console.error('MIGRATE_ERROR', err);
  process.exit(1);
});
