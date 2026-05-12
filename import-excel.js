const xlsx = require('xlsx');
const fs = require('fs');
const db = require('./db');
const path = require('path');

async function importStudents() {
    try {
        const filePath = 'C:/Users/HP/Downloads/Data Siswa X-5.xlsx';
        
        if (!fs.existsSync(filePath)) {
            console.log(`File excel tidak ditemukan di ${filePath}`);
            return;
        }

        const wb = xlsx.readFile(filePath);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = xlsx.utils.sheet_to_json(ws, {header:1});
        
        // Cek apakah data siswa sudah ada di database
        const [existing] = await db.query('SELECT count(*) as count FROM users WHERE role = "siswa"');
        if (existing[0].count > 0) {
            console.log('Data siswa sudah ada di database. Skip import.');
            return;
        }

        console.log('Mulai import data siswa dari Excel...');
        let count = 0;
        
        // Data dimulai dari baris ke-2 (index 1)
        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length < 6) continue;
            
            const nisn = row[3];
            const password = row[4];
            const nama = row[5];
            
            if (nisn && password && nama) {
                // Gunakan INSERT IGNORE untuk menghindari duplicate jika dijalankan ulang
                await db.query(
                    'INSERT IGNORE INTO users (username, password, nama, role) VALUES (?, ?, ?, "siswa")', 
                    [nisn.toString().trim(), password.toString().trim(), nama.toString().trim()]
                );
                count++;
            }
        }
        
        console.log(`Berhasil import ${count} data siswa!`);

    } catch (error) {
        console.error('Error saat import excel:', error);
    }
}

module.exports = importStudents;
