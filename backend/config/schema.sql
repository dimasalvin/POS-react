-- ============================================
-- APOTEK MORO MARI - Database Schema
-- MySQL 5.7+ / MariaDB 10.3+
-- ============================================

CREATE DATABASE IF NOT EXISTS apotek_moro_mari;
USE apotek_moro_mari;

-- ==================== USERS ====================
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  nama VARCHAR(100) NOT NULL,
  role ENUM('apoteker', 'apoteker_pendamping', 'admin', 'asisten_apoteker') NOT NULL DEFAULT 'asisten_apoteker',
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ==================== KELAS TERAPI ====================
CREATE TABLE IF NOT EXISTS kelas_terapi (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(100) NOT NULL UNIQUE,
  keterangan TEXT
) ENGINE=InnoDB;

-- ==================== BARANG ====================
CREATE TABLE IF NOT EXISTS barang (
  id INT AUTO_INCREMENT PRIMARY KEY,
  kode VARCHAR(30) NOT NULL UNIQUE,
  nama_barang VARCHAR(200) NOT NULL,
  satuan VARCHAR(30) NOT NULL,
  pabrik VARCHAR(100),
  grup ENUM('hijau', 'merah', 'biru') NOT NULL DEFAULT 'hijau',
  kelas_terapi_id INT,
  stock_saat_ini INT DEFAULT 0,
  stock_minimum INT DEFAULT 0,
  harga_beli DECIMAL(12,2) DEFAULT 0,
  harga_jual DECIMAL(12,2) DEFAULT 0,
  harga_hv DECIMAL(12,2) DEFAULT 0,
  harga_resep DECIMAL(12,2) DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (kelas_terapi_id) REFERENCES kelas_terapi(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ==================== SUPPLIER ====================
CREATE TABLE IF NOT EXISTS supplier (
  id INT AUTO_INCREMENT PRIMARY KEY,
  kode VARCHAR(30) NOT NULL UNIQUE,
  nama_pbf VARCHAR(150) NOT NULL,
  alamat TEXT,
  kota VARCHAR(50),
  no_telp VARCHAR(20),
  jatuh_tempo INT DEFAULT 30,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ==================== PELANGGAN ====================
CREATE TABLE IF NOT EXISTS pelanggan (
  id INT AUTO_INCREMENT PRIMARY KEY,
  kode VARCHAR(30) NOT NULL UNIQUE,
  nama VARCHAR(100) NOT NULL,
  no_hp VARCHAR(20),
  alamat TEXT,
  tipe VARCHAR(20) DEFAULT 'umum',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ==================== PEMBELIAN ====================
CREATE TABLE IF NOT EXISTS pembelian (
  id INT AUTO_INCREMENT PRIMARY KEY,
  no_faktur VARCHAR(50) NOT NULL UNIQUE,
  tanggal DATE NOT NULL,
  supplier_id INT,
  total DECIMAL(14,2) DEFAULT 0,
  user_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES supplier(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pembelian_detail (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pembelian_id INT NOT NULL,
  barang_id INT NOT NULL,
  jumlah INT NOT NULL,
  harga_hna DECIMAL(12,2) NOT NULL,
  diskon_persen DECIMAL(5,2) DEFAULT 0,
  diskon_nominal DECIMAL(12,2) DEFAULT 0,
  harga_netto DECIMAL(12,2) NOT NULL,
  jumlah_harga DECIMAL(14,2) NOT NULL,
  FOREIGN KEY (pembelian_id) REFERENCES pembelian(id) ON DELETE CASCADE,
  FOREIGN KEY (barang_id) REFERENCES barang(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ==================== RETUR PEMBELIAN ====================
CREATE TABLE IF NOT EXISTS retur_pembelian (
  id INT AUTO_INCREMENT PRIMARY KEY,
  no_retur VARCHAR(50) NOT NULL UNIQUE,
  tanggal DATE NOT NULL,
  supplier_id INT,
  total DECIMAL(14,2) DEFAULT 0,
  keterangan TEXT,
  user_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES supplier(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS retur_pembelian_detail (
  id INT AUTO_INCREMENT PRIMARY KEY,
  retur_pembelian_id INT NOT NULL,
  barang_id INT NOT NULL,
  jumlah INT NOT NULL,
  harga_satuan DECIMAL(12,2) NOT NULL,
  jumlah_harga DECIMAL(14,2) NOT NULL,
  FOREIGN KEY (retur_pembelian_id) REFERENCES retur_pembelian(id) ON DELETE CASCADE,
  FOREIGN KEY (barang_id) REFERENCES barang(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ==================== PENJUALAN ====================
CREATE TABLE IF NOT EXISTS penjualan (
  id INT AUTO_INCREMENT PRIMARY KEY,
  no_nota VARCHAR(30) NOT NULL UNIQUE,
  tanggal DATE NOT NULL,
  shift ENUM('pagi', 'siang') NOT NULL,
  tipe ENUM('hv', 'resep') NOT NULL,
  pelanggan_id INT,
  total DECIMAL(14,2) DEFAULT 0,
  tunai DECIMAL(14,2) DEFAULT 0,
  non_tunai DECIMAL(14,2) DEFAULT 0,
  kembalian DECIMAL(14,2) DEFAULT 0,
  status ENUM('draft', 'confirmed', 'void') DEFAULT 'draft',
  stock_minus TINYINT(1) DEFAULT 0,
  user_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pelanggan_id) REFERENCES pelanggan(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS penjualan_detail (
  id INT AUTO_INCREMENT PRIMARY KEY,
  penjualan_id INT NOT NULL,
  barang_id INT NOT NULL,
  jumlah INT NOT NULL,
  harga_satuan DECIMAL(12,2) NOT NULL,
  subtotal DECIMAL(14,2) NOT NULL,
  FOREIGN KEY (penjualan_id) REFERENCES penjualan(id) ON DELETE CASCADE,
  FOREIGN KEY (barang_id) REFERENCES barang(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- ==================== STOCK OPNAME ====================
CREATE TABLE IF NOT EXISTS stock_opname (
  id INT AUTO_INCREMENT PRIMARY KEY,
  barang_id INT NOT NULL,
  periode VARCHAR(20) NOT NULL,
  tanggal DATE NOT NULL,
  stock_sistem INT NOT NULL,
  stock_fisik INT NOT NULL,
  selisih INT NOT NULL,
  keterangan TEXT,
  user_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (barang_id) REFERENCES barang(id) ON DELETE RESTRICT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ==================== KAS APOTEK ====================
CREATE TABLE IF NOT EXISTS kas_apotek (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tanggal DATE,
  keterangan VARCHAR(255) NOT NULL,
  jenis ENUM('debit', 'kredit') NOT NULL,
  nominal DECIMAL(14,2) NOT NULL,
  tanggal_transaksi DATE NOT NULL,
  user_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ==================== CLOSING KASIR ====================
CREATE TABLE IF NOT EXISTS closing_kasir (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tanggal DATE NOT NULL,
  shift ENUM('pagi', 'siang') NOT NULL,
  total_hv DECIMAL(14,2) DEFAULT 0,
  total_resep DECIMAL(14,2) DEFAULT 0,
  total_tunai DECIMAL(14,2) DEFAULT 0,
  total_non_tunai DECIMAL(14,2) DEFAULT 0,
  grand_total DECIMAL(14,2) DEFAULT 0,
  user_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ==================== SEED DATA ====================

-- Default kelas terapi
INSERT INTO kelas_terapi (nama) VALUES
('Analgesik & Antipiretik'),
('Antibiotik'),
('Antidiabetes'),
('Antihipertensi'),
('Antihistamin'),
('Antijamur'),
('Antiinflamasi'),
('Gastrointestinal'),
('Kardiovaskular'),
('Vitamin & Suplemen');

-- Default users (password: 1234)
INSERT INTO users (username, password, nama, role) VALUES
('admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Administrator', 'admin'),
('dyah', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Dyah Erna Kumalasari', 'apoteker');

-- Sample supplier
INSERT INTO supplier (kode, nama_pbf, alamat, kota, no_telp, jatuh_tempo) VALUES
('PBF001', 'PT Kimia Farma', 'Jl. Veteran No. 9', 'Semarang', '024-8311234', 30),
('PBF002', 'PT Enseval Putera', 'Jl. Industri Raya No. 5', 'Semarang', '024-7612345', 45),
('PBF003', 'PT Anugrah Argon Medica', 'Jl. Gatot Subroto No. 12', 'Semarang', '024-7654321', 30);

-- Sample barang
INSERT INTO barang (kode, nama_barang, satuan, pabrik, grup, kelas_terapi_id, stock_saat_ini, stock_minimum, harga_beli, harga_jual, harga_hv, harga_resep) VALUES
('OB001', 'Paracetamol 500mg', 'Tablet', 'Kimia Farma', 'hijau', 1, 500, 50, 500, 550, 605, 653),
('OB002', 'Amoxicillin 500mg', 'Kapsul', 'Sanbe Farma', 'merah', 2, 200, 30, 1200, 1320, 1452, 1568),
('OB003', 'Omeprazole 20mg', 'Kapsul', 'Dexa Medica', 'merah', 8, 100, 20, 2500, 2750, 3025, 3267),
('OB004', 'Cetirizine 10mg', 'Tablet', 'Hexpharm Jaya', 'hijau', 5, 300, 40, 800, 880, 968, 1045),
('OB005', 'Metformin 500mg', 'Tablet', 'Dexa Medica', 'merah', 3, 150, 25, 600, 660, 726, 784);
