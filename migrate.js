require('dotenv').config();
const db = require('./db');

async function migrate() {
    try {
        console.log('🚀 Memulai migrasi database...');

        // 1. Tabel Users
        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(50) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                nama VARCHAR(255) DEFAULT NULL,
                role ENUM('admin', 'siswa') DEFAULT 'siswa'
            )
        `);
        console.log('✅ Tabel users siap.');

        // Insert Default Admin jika belum ada
        const [admins] = await db.query('SELECT * FROM users WHERE username = "admin"');
        if (admins.length === 0) {
            await db.query('INSERT INTO users (username, password, role) VALUES ("admin", "admin123", "admin")');
            console.log('✅ Admin default (admin/admin123) berhasil dibuat.');
        }

        // 2. Tabel Tugas
        await db.query(`
            CREATE TABLE IF NOT EXISTS tugas (
                id INT AUTO_INCREMENT PRIMARY KEY,
                mapel VARCHAR(50) DEFAULT NULL,
                judul VARCHAR(255) NOT NULL,
                deskripsi TEXT,
                deadline DATE NOT NULL,
                status ENUM('pending', 'selesai') DEFAULT 'pending'
            )
        `);
        console.log('✅ Tabel tugas siap.');

        // 3. Tabel Piket
        await db.query(`
            CREATE TABLE IF NOT EXISTS piket (
                id INT AUTO_INCREMENT PRIMARY KEY,
                hari ENUM('Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu') NOT NULL,
                nama_siswa VARCHAR(255) NOT NULL
            )
        `);
        console.log('✅ Tabel piket siap.');

        // 4. Tabel Settings Notifikasi
        await db.query(`
            CREATE TABLE IF NOT EXISTS settings_notifikasi (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tipe ENUM('tugas', 'piket') NOT NULL,
                waktu_kirim TIME NOT NULL,
                status ENUM('aktif', 'nonaktif') DEFAULT 'aktif'
            )
        `);
        console.log('✅ Tabel settings_notifikasi siap.');

        // Insert Default Settings jika belum ada
        const [settings] = await db.query('SELECT * FROM settings_notifikasi');
        if (settings.length === 0) {
            await db.query(`
                INSERT INTO settings_notifikasi (tipe, waktu_kirim, status) VALUES 
                ('tugas', '19:00:00', 'aktif'),
                ('piket', '06:00:00', 'aktif')
            `);
            console.log('✅ Pengaturan notifikasi default siap.');
        }

        // 5. Tabel Absen Piket
        await db.query(`
            CREATE TABLE IF NOT EXISTS absen_piket (
                id INT AUTO_INCREMENT PRIMARY KEY,
                tanggal DATE NOT NULL,
                nama_siswa VARCHAR(255) NOT NULL,
                status ENUM('Belum', 'Hadir', 'Tidak Hadir', 'Izin') DEFAULT 'Belum'
            )
        `);
        console.log('✅ Tabel absen_piket siap.');

        // 6. Tabel Penugasan Piket Manual
        await db.query(`
            CREATE TABLE IF NOT EXISTS piket_penugasan (
                id INT AUTO_INCREMENT PRIMARY KEY,
                hari ENUM('Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu') NOT NULL,
                nama_siswa VARCHAR(255) NOT NULL,
                tugas ENUM('jurnal', 'sapu_pagi', 'sapu_sore') NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_penugasan (hari, nama_siswa)
            )
        `);
        console.log('✅ Tabel piket_penugasan siap.');

        // 7. Tabel Request Tugas Piket
        await db.query(`
            CREATE TABLE IF NOT EXISTS piket_request (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nama_siswa VARCHAR(255) NOT NULL,
                hari ENUM('Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu') NOT NULL,
                tugas_diinginkan ENUM('jurnal', 'sapu_pagi', 'sapu_sore') NOT NULL,
                status ENUM('menunggu', 'disetujui', 'ditolak') DEFAULT 'menunggu',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Tabel piket_request siap.');

        console.log('✨ Migrasi database selesai dengan sukses!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration gagal:', err);
        process.exit(1);
    }
}

migrate();
