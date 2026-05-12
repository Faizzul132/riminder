require('dotenv').config();
const db = require('./db');

async function migrate() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS piket_penugasan (
                id INT AUTO_INCREMENT PRIMARY KEY,
                hari ENUM('Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu') NOT NULL,
                nama_siswa VARCHAR(255) NOT NULL,
                tugas ENUM('jurnal','sapu_pagi','sapu_sore') NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_penugasan (hari, nama_siswa)
            )
        `);
        console.log('✅ Tabel piket_penugasan berhasil dibuat.');

        await db.query(`
            CREATE TABLE IF NOT EXISTS piket_request (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nama_siswa VARCHAR(255) NOT NULL,
                hari ENUM('Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu') NOT NULL,
                tugas_diinginkan ENUM('jurnal','sapu_pagi','sapu_sore') NOT NULL,
                status ENUM('menunggu','disetujui','ditolak') DEFAULT 'menunggu',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ Tabel piket_request berhasil dibuat.');

        console.log('Migration selesai!');
        process.exit(0);
    } catch (err) {
        console.error('Migration gagal:', err);
        process.exit(1);
    }
}

migrate();
