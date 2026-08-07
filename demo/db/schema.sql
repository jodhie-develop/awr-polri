-- ============================================================
-- Skema database: Aplikasi Web Rekrutmen Polri - Polda Kalteng
-- ============================================================

CREATE DATABASE IF NOT EXISTS polri_rekrutmen
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE polri_rekrutmen;

-- ---- Users ----
-- NIK disimpan terenkripsi (AES-256-GCM, lihat lib/crypto.js) + hash SHA-256
-- untuk keperluan cek duplikasi tanpa perlu dekripsi.
CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(100) NOT NULL,
  nik_encrypted VARBINARY(512) NOT NULL,
  nik_hash      CHAR(64) NOT NULL,
  email         VARCHAR(190) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('pendaftar','polri') NOT NULL DEFAULT 'pendaftar',
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_nik_hash (nik_hash)
) ENGINE=InnoDB;

-- ---- OTP untuk verifikasi Sign Up ----
-- Data pendaftar disimpan sementara di pending_user_json sampai OTP diverifikasi,
-- baru dipindah permanen ke tabel users.
CREATE TABLE IF NOT EXISTS otp_codes (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  email             VARCHAR(190) NOT NULL,
  otp_hash          CHAR(64) NOT NULL,
  purpose           VARCHAR(30) NOT NULL DEFAULT 'signup',
  pending_user_json JSON NOT NULL,
  attempt_count     TINYINT NOT NULL DEFAULT 0,
  expires_at        TIMESTAMP NOT NULL,
  consumed          TINYINT(1) NOT NULL DEFAULT 0,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_otp_email (email)
) ENGINE=InnoDB;

-- ---- Animo (minat per jalur) ----
CREATE TABLE IF NOT EXISTS animo (
  jalur VARCHAR(20) PRIMARY KEY,
  count INT NOT NULL DEFAULT 0
) ENGINE=InnoDB;

INSERT IGNORE INTO animo (jalur, count) VALUES
  ('SIPSS', 0), ('AKPOL', 0), ('BINTARA', 0), ('TAMTAMA', 0);

-- ---- Laporan Kegiatan Sosialisasi (hanya role polri) ----
CREATE TABLE IF NOT EXISTS laporan_giat (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  judul       VARCHAR(255) NOT NULL,
  deskripsi   TEXT,
  tanggal     DATE NOT NULL,
  created_by  INT NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

-- ---- Hasil CAT (kunci jawaban tidak pernah dikirim ke client) ----
CREATE TABLE IF NOT EXISTS cat_results (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL,
  jalur        VARCHAR(20) NOT NULL,
  jenis        ENUM('akademik','psikologi') NOT NULL,
  score        INT NOT NULL,
  detail_json  JSON,
  created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- ---- Simulasi TKJ (opsional, untuk rekam jejak) ----
CREATE TABLE IF NOT EXISTS tkj_simulasi (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  nilai_a     DECIMAL(5,2) NOT NULL,
  nilai_b1    DECIMAL(5,2) NOT NULL,
  nilai_b2    DECIMAL(5,2) NOT NULL,
  nilai_b3    DECIMAL(5,2) NOT NULL,
  nilai_b4    DECIMAL(5,2) NOT NULL,
  nilai_renang DECIMAL(5,2) NOT NULL,
  nilai_akhir DECIMAL(5,2) NOT NULL,
  lulus       TINYINT(1) NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- ---- Session store (dipakai otomatis oleh express-mysql-session) ----
CREATE TABLE IF NOT EXISTS sessions (
  session_id VARCHAR(128) COLLATE utf8mb4_bin NOT NULL,
  expires    INT(11) UNSIGNED NOT NULL,
  data       MEDIUMTEXT COLLATE utf8mb4_bin,
  PRIMARY KEY (session_id)
) ENGINE=InnoDB;
