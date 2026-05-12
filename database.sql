-- Membuat Database
CREATE DATABASE IF NOT EXISTS kelas_db;
USE kelas_db;

-- Tabel Users (Untuk login Admin & Siswa)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    nama VARCHAR(255) DEFAULT NULL,
    role ENUM('admin', 'siswa') DEFAULT 'siswa'
);

-- Insert Default Admin (Password: admin123)
-- Pastikan password di-hash dalam produksi!
INSERT INTO users (username, password, role) VALUES ('admin', 'admin123', 'admin');

-- Tabel Tugas
CREATE TABLE IF NOT EXISTS tugas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mapel VARCHAR(50) DEFAULT NULL,
    judul VARCHAR(255) NOT NULL,
    deskripsi TEXT,
    deadline DATE NOT NULL,
    status ENUM('pending', 'selesai') DEFAULT 'pending'
);

-- Tabel Piket
CREATE TABLE IF NOT EXISTS piket (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hari ENUM('Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu') NOT NULL,
    nama_siswa VARCHAR(255) NOT NULL
);

INSERT INTO piket (hari, nama_siswa) VALUES 
('Senin', 'Udin'), ('Senin', 'Natan'), ('Senin', 'Ahnaf'), ('Senin', 'Anet'), ('Senin', 'Aileen'), ('Senin', 'Rika'),
('Selasa', 'Fikri'), ('Selasa', 'Faiz'), ('Selasa', 'Yardan'), ('Selasa', 'Keysha'), ('Selasa', 'Nida'), ('Selasa', 'Kartika'),
('Rabu', 'Jibril'), ('Rabu', 'Sabil'), ('Rabu', 'Nana'), ('Rabu', 'Nisa'), ('Rabu', 'Ling Ling'), ('Rabu', 'Reva'),
('Kamis', 'Faris'), ('Kamis', 'Ravi'), ('Kamis', 'Alifa'), ('Kamis', 'Iza'), ('Kamis', 'Alin'), ('Kamis', 'Mia'),
('Jumat', 'Razan'), ('Jumat', 'Ardan'), ('Jumat', 'Clorin'), ('Jumat', 'Gendis'), ('Jumat', 'Jihan'), ('Jumat', 'Salsa'),
('Sabtu', 'Adit'), ('Sabtu', 'Kafka'), ('Sabtu', 'Eska'), ('Sabtu', 'Naila'), ('Sabtu', 'Narima'), ('Sabtu', 'Fahima');

-- Tabel Pengaturan Notifikasi
CREATE TABLE IF NOT EXISTS settings_notifikasi (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tipe ENUM('tugas', 'piket') NOT NULL,
    waktu_kirim TIME NOT NULL,
    status ENUM('aktif', 'nonaktif') DEFAULT 'aktif'
);

-- Insert Default Waktu Notifikasi
INSERT INTO settings_notifikasi (tipe, waktu_kirim, status) VALUES 
('tugas', '19:00:00', 'aktif'),
('piket', '06:00:00', 'aktif');

-- Tabel Absen Piket
CREATE TABLE IF NOT EXISTS absen_piket (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tanggal DATE NOT NULL,
    nama_siswa VARCHAR(255) NOT NULL,
    status ENUM('Belum', 'Hadir', 'Tidak Hadir', 'Izin') DEFAULT 'Belum'
);

-- Tabel Penugasan Piket Manual (Admin assign tugas per hari)
CREATE TABLE IF NOT EXISTS piket_penugasan (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hari ENUM('Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu') NOT NULL,
    nama_siswa VARCHAR(255) NOT NULL,
    tugas ENUM('jurnal', 'sapu_pagi', 'sapu_sore') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_penugasan (hari, nama_siswa)
);

-- Tabel Request Tugas Piket dari Siswa
CREATE TABLE IF NOT EXISTS piket_request (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama_siswa VARCHAR(255) NOT NULL,
    hari ENUM('Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu') NOT NULL,
    tugas_diinginkan ENUM('jurnal', 'sapu_pagi', 'sapu_sore') NOT NULL,
    status ENUM('menunggu', 'disetujui', 'ditolak') DEFAULT 'menunggu',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
