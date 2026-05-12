const cron = require('node-cron');
const db = require('./db');
const { sendMessage } = require('./whatsapp-service');

// Cek jadwal notifikasi setiap menit
cron.schedule('* * * * *', async () => {
    try {
        if (!process.env.WA_GROUP_ID) {
            console.log('WA_GROUP_ID belum diset di pengaturan. Lewati notifikasi otomatis.');
            return;
        }

        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;

        // Ambil pengaturan notifikasi aktif
        const [settings] = await db.query('SELECT * FROM settings_notifikasi WHERE status = "aktif"');

        for (const setting of settings) {
            if (setting.waktu_kirim === currentTime) {
                if (setting.tipe === 'tugas') {
                    await sendTugasNotification();
                } else if (setting.tipe === 'piket') {
                    await sendPiketNotification();
                }
            }
        }
    } catch (error) {
        console.error('Error di Cron Job:', error);
    }
});

async function sendTugasNotification() {
    try {
        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        
        const besok = new Date();
        besok.setDate(besok.getDate() + 1);
        const dayName = days[besok.getDay()].toUpperCase();
        const formattedDate = `${besok.getDate()} ${months[besok.getMonth()].toUpperCase()} ${besok.getFullYear()}`;

        // Dapatkan jadwal pelajaran besok (hardcoded or from db)
        const jadwalPelajaran = {
            'SENIN': ['AQH', 'MTK', 'BAR', 'SEJ', 'BIG'],
            'SELASA': ['BIG', 'KIM', 'AAK', 'BIN', 'SKI'],
            'RABU': ['BIO', 'INF', 'FQH', 'BAR', 'KTI'],
            'KAMIS': ['GEO', 'MTK', 'KKA', 'FIS', 'SOS'],
            'JUMAT': ['POK', 'BIN', 'PPC'],
            'SABTU': ['EKO', 'SBP'],
            'MINGGU': []
        };
        const mapelBesok = jadwalPelajaran[dayName] || [];

        // Cek tugas yang mapelnya ada besok ATAU deadlinenya besok (status pending)
        const [allPendingTugas] = await db.query('SELECT * FROM tugas WHERE status = "pending"');
        
        // Filter di javascript agar bisa mendeteksi substring (misal DB: "BIG (56)" vs mapelBesok: "BIG")
        const pad = (n) => String(n).padStart(2, '0');
        const besokDateStr = `${besok.getFullYear()}-${pad(besok.getMonth() + 1)}-${pad(besok.getDate())}`;
        
        const tugas = allPendingTugas.filter(t => {
            // Cek apakah deadline besok
            const deadlineDate = new Date(t.deadline);
            const deadlineDateStr = `${deadlineDate.getFullYear()}-${pad(deadlineDate.getMonth() + 1)}-${pad(deadlineDate.getDate())}`;
            const isDeadlineBesok = deadlineDateStr === besokDateStr;
            
            // Cek apakah mapel tugas ada di jadwal besok
            const isMapelBesok = t.mapel && mapelBesok.some(mb => t.mapel.includes(mb));
            
            return isDeadlineBesok || isMapelBesok;
        });

        let message = `REMINDER BESOK ${dayName}, ${formattedDate}‼️\n\n`;

        message += '📌MAPEL:\n';
        if (mapelBesok.length === 0) {
            message += 'Libur / Tidak ada jadwal pelajaran.\n';
        } else {
            mapelBesok.forEach((m, i) => {
                message += `${i + 1}. ${m}\n`;
            });
        }

        message += '\n📋TUGAS :\n';
        if (tugas.length === 0) {
            message += 'Alhamdulillah, tidak ada PR/Tugas untuk besok! ✨\n';
        } else {
            tugas.forEach((t, i) => {
                const deskripsi = t.deskripsi ? ` - ${t.deskripsi}` : '';
                // Hapus kode guru, contoh "BIG (56)" -> "BIG"
                const mapelBersih = t.mapel ? t.mapel.replace(/\s*\(\d+\)$/, '') : 'UMUM';
                message += `${i + 1}. ${mapelBersih} : ${t.judul}${deskripsi}\n`;
            });
        }

        const groupId = process.env.WA_GROUP_ID;
        if (!groupId) {
            console.log('WA_GROUP_ID belum diset. Lewati pengiriman.');
            return;
        }
        await sendMessage(groupId, message);
    } catch (error) {
        console.error('Gagal mengirim notifikasi tugas', error);
    }
}

async function sendPiketNotification() {
    try {
        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        
        // Cek piket untuk BESOK
        const besok = new Date();
        besok.setDate(besok.getDate() + 1);
        const besokDay = days[besok.getDay()];

        const [piket] = await db.query('SELECT * FROM piket WHERE hari = ?', [besokDay]);
        if (piket.length < 6) {
            console.log('Data piket kurang dari 6 orang, notifikasi tidak dikirim.');
            return; // Harus ada 6 anak sesuai template
        }

        // Shuffle array piket (Fisher-Yates)
        let shuffled = [...piket];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        // Assign Roles
        const role1 = shuffled[0].nama_siswa; // 1 anak
        const role2 = [shuffled[1].nama_siswa, shuffled[2].nama_siswa, shuffled[3].nama_siswa]; // 3 anak
        const role3 = [shuffled[4].nama_siswa, shuffled[5].nama_siswa]; // 2 anak

        let message = `WARNINGG♻️‼️\n\ntugas piket :\n\n`;
        message += `1. ambil dan kembalikan jurnal + tata meja guru dan isi spidol yng habis + hapus papan apabila kotor :\n${role1}\n\n`;
        
        message += `2. Menyapu pagi :\n`;
        role2.forEach(n => message += `${n}\n`);
        
        message += `\n3. Menyapu sore :\n`;
        role3.forEach(n => message += `${n}\n`);

        message += `\nnb: \n\n`;
        message += `1. jika papan tulis kotor segera d hapus, \n`;
        message += `2. di harapkan berangkat lebih awal untuk piket, \n`;
        message += `3. di harapkan menyapu dg bersih ya,\n`;
        message += `4. setiap anak menaikkan kursinya di bangku masing' saat pulang sekolah\n\n\n`;
        message += `"kebersihan sebagian dari iman" \n\n`;
        message += `n good job for all😻🫵🏻`;

        const groupId = process.env.WA_GROUP_ID;
        if (!groupId) {
            console.log('WA_GROUP_ID belum diset. Lewati pengiriman.');
            return;
        }
        await sendMessage(groupId, message);
    } catch (error) {
        console.error('Gagal mengirim notifikasi piket', error);
    }
}

console.log('Cron Jobs initialized.');

module.exports = { sendTugasNotification, sendPiketNotification };
