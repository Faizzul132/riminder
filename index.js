require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const flash = require('connect-flash');
const db = require('./db');
const importStudents = require('./import-excel');

const app = express();
const port = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public')); // For custom CSS/JS

// Setup Session & Flash
app.use(session({
    secret: 'kelas_secret_key_123',
    resave: false,
    saveUninitialized: false
}));
app.use(flash());

// Global variables for views
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.error = req.flash('error');
    res.locals.success = req.flash('success');
    next();
});

// Auth Middleware
const requireAuth = (req, res, next) => {
    if (!req.session.user) {
        req.flash('error', 'Silakan login terlebih dahulu');
        return res.redirect('/login');
    }
    next();
};

const requireAdmin = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        req.flash('error', 'Akses ditolak. Hanya untuk Admin.');
        return res.redirect('/dashboard');
    }
    next();
};

// Initialize features (Don't require them immediately if DB fails)
let featuresLoaded = false;
const initFeatures = () => {
    if (!featuresLoaded) {
        try {
            require('./whatsapp-service');
            require('./cron-jobs');
            importStudents();
            featuresLoaded = true;
        } catch (e) {
            console.error("Gagal memuat fitur background:", e);
        }
    }
};

// --- ROUTES ---

// Landing Page / Hero
app.get('/', (req, res) => {
    if (req.session.user) return res.redirect('/dashboard');
    res.render('hero');
});

// Login Pages
app.get('/login', (req, res) => {
    if (req.session.user) return res.redirect('/dashboard');
    res.render('login');
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        initFeatures(); // Attempt to init DB features
        
        const [users] = await db.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
        if (users.length > 0) {
            req.session.user = {
                id: users[0].id,
                username: users[0].username,
                nama: users[0].nama || 'Admin',
                role: users[0].role
            };
            res.redirect('/dashboard');
        } else {
            req.flash('error', 'Username/NISN atau Password salah!');
            res.redirect('/login');
        }
    } catch (error) {
        console.error(error);
        req.flash('error', 'Koneksi ke Database gagal. Pastikan MySQL menyala.');
        res.redirect('/login');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// Dashboard Route (Summary)
app.get('/dashboard', requireAuth, async (req, res) => {
    try {
        const [totalTugas] = await db.query('SELECT COUNT(*) as count FROM tugas WHERE status="pending"');
        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const currentDay = days[new Date().getDay()];
        const [piketHariIni] = await db.query('SELECT * FROM piket WHERE hari = ?', [currentDay]);
        
        // Data Jadwal Pelajaran
        const jadwalPelajaran = {
            'Senin': ['Jam Kosong', 'AQH (03)', 'MTK (43)', 'BAR (22)', 'SEJ (66)', 'BIG (56)'],
            'Selasa': ['BIG (56)', 'KIM (84)', 'AAK (08)', 'BIN (36)', 'SKI (19)', 'Jam Kosong'],
            'Rabu': ['BIO (74)', 'INF (99)', 'FQH (14)', 'BAR (22)', 'KTI (101)', 'Jam Kosong'],
            'Kamis': ['GEO (94)', 'MTK (43)', 'KKA (100)', 'FIS (81)', 'SOS (96)', 'Jam Kosong'],
            'Jumat': ['POK (60)', 'BIN (36)', 'PPC (27)', 'Jam Kosong', 'Jam Kosong', 'Jam Kosong'],
            'Sabtu': ['EKO', 'SBP', 'Jam Kosong', 'Jam Kosong', 'Jam Kosong', 'Jam Kosong']
        };
        const jadwalHariIni = jadwalPelajaran[currentDay] || [];

        res.render('pages/dashboard', {
            title: 'Dashboard Utama',
            active: 'dashboard',
            totalTugas: totalTugas[0].count,
            piketHariIni: piketHariIni,
            hari: currentDay,
            jadwalHariIni: jadwalHariIni
        });
    } catch (error) {
        res.send('Database Error');
    }
});

// Jadwal Pelajaran Route
app.get('/jadwal', requireAuth, (req, res) => {
    const jadwalPelajaran = {
        'Senin': ['Jam Kosong', 'AQH (03)', 'MTK (43)', 'BAR (22)', 'SEJ (66)', 'BIG (56)'],
        'Selasa': ['BIG (56)', 'KIM (84)', 'AAK (08)', 'BIN (36)', 'SKI (19)', 'Jam Kosong'],
        'Rabu': ['BIO (74)', 'INF (99)', 'FQH (14)', 'BAR (22)', 'KTI (101)', 'Jam Kosong'],
        'Kamis': ['GEO (94)', 'MTK (43)', 'KKA (100)', 'FIS (81)', 'SOS (96)', 'Jam Kosong'],
        'Jumat': ['POK (60)', 'BIN (36)', 'PPC (27)', 'Jam Kosong', 'Jam Kosong', 'Jam Kosong'],
        'Sabtu': ['EKO', 'SBP', 'Jam Kosong', 'Jam Kosong', 'Jam Kosong', 'Jam Kosong']
    };
    
    res.render('pages/jadwal', {
        title: 'Jadwal Pelajaran',
        active: 'jadwal',
        jadwal: jadwalPelajaran
    });
});

// Tugas Route
app.get('/tugas', requireAuth, async (req, res) => {
    try {
        const filterDate = req.query.date;
        let query = 'SELECT * FROM tugas ORDER BY deadline ASC';
        let params = [];
        
        if (filterDate) {
            query = 'SELECT * FROM tugas WHERE deadline = ? ORDER BY deadline ASC';
            params.push(filterDate);
        }
        
        const [tugas] = await db.query(query, params);
        
        // Data Jadwal Pelajaran (untuk dropdown tambah tugas)
        const jadwalPelajaran = {
            'Senin': ['AQH (03)', 'MTK (43)', 'BAR (22)', 'SEJ (66)', 'BIG (56)'],
            'Selasa': ['BIG (56)', 'KIM (84)', 'AAK (08)', 'BIN (36)', 'SKI (19)'],
            'Rabu': ['BIO (74)', 'INF (99)', 'FQH (14)', 'BAR (22)', 'KTI (101)'],
            'Kamis': ['GEO (94)', 'MTK (43)', 'KKA (100)', 'FIS (81)', 'SOS (96)'],
            'Jumat': ['POK (60)', 'BIN (36)', 'PPC (27)'],
            'Sabtu': ['EKO', 'SBP']
        };

        res.render('pages/tugas', {
            title: 'Manajemen Tugas',
            active: 'tugas',
            tugas,
            filterDate: filterDate || '',
            jadwal: JSON.stringify(jadwalPelajaran)
        });
    } catch (error) {
        res.send('Database Error');
    }
});

app.post('/tugas/add-bulk', requireAdmin, async (req, res) => {
    let { mapel, judul, deadline } = req.body;
    
    // Pastikan selalu array (jika hanya 1 mapel, express menjadikannya string)
    if (mapel && !Array.isArray(mapel)) {
        mapel = [mapel];
        judul = [judul];
    }
    
    if (mapel && judul && Array.isArray(mapel)) {
        for (let i = 0; i < mapel.length; i++) {
            const m = mapel[i];
            const j = (judul[i] || '').trim();
            
            // Hanya masukkan jika form tugas tidak kosong
            if (j !== "") {
                await db.query('INSERT INTO tugas (mapel, judul, deskripsi, deadline) VALUES (?, ?, ?, ?)', [m, j, '', deadline]);
            }
        }
    }
    
    req.flash('success', 'Tugas berhasil disimpan');
    res.redirect('/tugas');
});

app.post('/tugas/status/:id', requireAuth, async (req, res) => {
    const { status } = req.body;
    await db.query('UPDATE tugas SET status = ? WHERE id = ?', [status, req.params.id]);
    res.redirect('back');
});

app.get('/tugas/delete/:id', requireAdmin, async (req, res) => {
    await db.query('DELETE FROM tugas WHERE id = ?', [req.params.id]);
    req.flash('success', 'Tugas berhasil dihapus');
    res.redirect('/tugas');
});

// Piket Route
app.get('/piket', requireAuth, async (req, res) => {
    try {
        const [piket] = await db.query('SELECT * FROM piket ORDER BY FIELD(hari, "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu")');
        
        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const currentDay = days[new Date().getDay()];
        const piketHariIni = piket.filter(p => p.hari === currentDay);
        
        let absenHariIni = [];
        if (piketHariIni.length > 0) {
            const [absen] = await db.query('SELECT * FROM absen_piket WHERE tanggal = CURDATE()');
            if (absen.length === 0) {
                for (const p of piketHariIni) {
                    await db.query('INSERT INTO absen_piket (tanggal, nama_siswa, status) VALUES (CURDATE(), ?, "Belum")', [p.nama_siswa]);
                }
                const [absenBaru] = await db.query('SELECT * FROM absen_piket WHERE tanggal = CURDATE()');
                absenHariIni = absenBaru;
            } else {
                absenHariIni = absen;
            }
        }

        // Ambil penugasan manual yang sudah ada
        const [penugasan] = await db.query('SELECT * FROM piket_penugasan ORDER BY FIELD(hari, "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu")');
        
        // Ambil request dari siswa (hanya yg menunggu, untuk admin)
        const [requests] = await db.query('SELECT * FROM piket_request WHERE status = "menunggu" ORDER BY created_at DESC');

        // Cek apakah siswa sudah punya request aktif untuk piket mereka
        let myRequest = null;
        if (req.session.user && req.session.user.role === 'siswa') {
            const [myReqs] = await db.query(
                'SELECT * FROM piket_request WHERE nama_siswa = ? AND status = "menunggu"',
                [req.session.user.nama || req.session.user.username]
            );
            if (myReqs.length > 0) myRequest = myReqs[0];
        }

        res.render('pages/piket', {
            title: 'Jadwal Piket',
            active: 'piket',
            piket,
            hari: currentDay,
            absenHariIni,
            penugasan,
            requests,
            myRequest
        });
    } catch (error) {
        console.error(error);
        res.send('Database Error');
    }
});

app.post('/piket/absen/:id', requireAdmin, async (req, res) => {
    const { status } = req.body;
    await db.query('UPDATE absen_piket SET status = ? WHERE id = ?', [status, req.params.id]);
    res.redirect('/piket');
});

app.post('/piket/add', requireAdmin, async (req, res) => {
    const { hari, nama_siswa } = req.body;
    await db.query('INSERT INTO piket (hari, nama_siswa) VALUES (?, ?)', [hari, nama_siswa]);
    req.flash('success', 'Jadwal piket berhasil ditambahkan');
    res.redirect('/piket');
});

app.get('/piket/delete/:id', requireAdmin, async (req, res) => {
    await db.query('DELETE FROM piket WHERE id = ?', [req.params.id]);
    req.flash('success', 'Jadwal piket berhasil dihapus');
    res.redirect('/piket');
});

// Penugasan Manual Piket
app.post('/piket/penugasan', requireAdmin, async (req, res) => {
    const { hari, nama_siswa, tugas } = req.body;
    try {
        await db.query(
            'INSERT INTO piket_penugasan (hari, nama_siswa, tugas) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE tugas = VALUES(tugas)',
            [hari, nama_siswa, tugas]
        );
        req.flash('success', `Penugasan ${nama_siswa} untuk ${hari} berhasil disimpan!`);
    } catch (e) {
        req.flash('error', 'Gagal menyimpan penugasan.');
    }
    res.redirect('/piket');
});

app.get('/piket/penugasan/delete/:id', requireAdmin, async (req, res) => {
    await db.query('DELETE FROM piket_penugasan WHERE id = ?', [req.params.id]);
    req.flash('success', 'Penugasan berhasil dihapus.');
    res.redirect('/piket');
});

// Request Tugas Piket oleh Siswa
app.post('/piket/request', requireAuth, async (req, res) => {
    const { hari, tugas_diinginkan } = req.body;
    const nama = req.session.user.nama || req.session.user.username;
    try {
        await db.query(
            'INSERT INTO piket_request (nama_siswa, hari, tugas_diinginkan) VALUES (?, ?, ?)',
            [nama, hari, tugas_diinginkan]
        );
        req.flash('success', 'Request tugas piket berhasil dikirim! Tunggu persetujuan admin.');
    } catch (e) {
        req.flash('error', 'Gagal mengirim request.');
    }
    res.redirect('/piket');
});

// Admin setujui / tolak request
app.post('/piket/request/:id/approve', requireAdmin, async (req, res) => {
    const [rows] = await db.query('SELECT * FROM piket_request WHERE id = ?', [req.params.id]);
    if (rows.length > 0) {
        const r = rows[0];
        await db.query(
            'INSERT INTO piket_penugasan (hari, nama_siswa, tugas) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE tugas = VALUES(tugas)',
            [r.hari, r.nama_siswa, r.tugas_diinginkan]
        );
        await db.query('UPDATE piket_request SET status = "disetujui" WHERE id = ?', [req.params.id]);
        req.flash('success', `Request ${r.nama_siswa} disetujui!`);
    }
    res.redirect('/piket');
});

app.post('/piket/request/:id/reject', requireAdmin, async (req, res) => {
    await db.query('UPDATE piket_request SET status = "ditolak" WHERE id = ?', [req.params.id]);
    req.flash('success', 'Request ditolak.');
    res.redirect('/piket');
});

// Draft Preview Notifikasi Piket
app.get('/piket/draft', requireAdmin, async (req, res) => {
    try {
        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const besok = new Date();
        besok.setDate(besok.getDate() + 1);
        const besokDay = days[besok.getDay()];

        const [piket] = await db.query('SELECT * FROM piket WHERE hari = ?', [besokDay]);
        const [penugasan] = await db.query('SELECT * FROM piket_penugasan WHERE hari = ?', [besokDay]);

        // Buat draft pesan
        let draft = '';
        let role1 = '', role2 = [], role3 = [];

        if (penugasan.length > 0) {
            // Gunakan penugasan manual jika ada
            penugasan.forEach(p => {
                if (p.tugas === 'jurnal') role1 = p.nama_siswa;
                else if (p.tugas === 'sapu_pagi') role2.push(p.nama_siswa);
                else if (p.tugas === 'sapu_sore') role3.push(p.nama_siswa);
            });
        } else if (piket.length >= 6) {
            // Pakai random jika tidak ada penugasan manual
            let shuffled = [...piket];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            role1 = shuffled[0].nama_siswa;
            role2 = [shuffled[1].nama_siswa, shuffled[2].nama_siswa, shuffled[3].nama_siswa];
            role3 = [shuffled[4].nama_siswa, shuffled[5].nama_siswa];
        }

        if (role1 || role2.length > 0 || role3.length > 0) {
            draft = `WARNINGG♻️‼️\n\ntugas piket :\n\n`;
            draft += `1. ambil dan kembalikan jurnal + tata meja guru dan isi spidol yng habis + hapus papan apabila kotor :\n${role1 || '-'}\n\n`;
            draft += `2. Menyapu pagi :\n${role2.length > 0 ? role2.join('\n') : '-'}\n\n`;
            draft += `3. Menyapu sore :\n${role3.length > 0 ? role3.join('\n') : '-'}\n\n`;
            draft += `nb:\n\n1. jika papan tulis kotor segera d hapus,\n2. di harapkan berangkat lebih awal untuk piket,\n3. di harapkan menyapu dg bersih ya,\n4. setiap anak menaikkan kursinya di bangku masing' saat pulang sekolah\n\n\n"kebersihan sebagian dari iman"\n\nn good job for all😻🫵🏻`;
        } else {
            draft = `Belum ada data piket untuk hari ${besokDay}. Tambahkan jadwal piket terlebih dahulu.`;
        }

        res.render('pages/piket-draft', {
            title: 'Draft Notifikasi Piket',
            active: 'piket',
            besokDay,
            piket,
            penugasan,
            draft,
            role1, role2, role3
        });
    } catch (err) {
        console.error(err);
        res.send('Error');
    }
});


// Settings Route
app.get('/settings', requireAdmin, async (req, res) => {
    try {
        const [settings] = await db.query('SELECT * FROM settings_notifikasi');
        res.render('pages/settings', {
            title: 'Pengaturan',
            active: 'settings',
            settings,
            waGroupId: process.env.WA_GROUP_ID || ''
        });
    } catch (error) {
        res.send('Database Error');
    }
});

app.post('/settings/update/:id', requireAdmin, async (req, res) => {
    const { waktu_kirim, status } = req.body;
    await db.query('UPDATE settings_notifikasi SET waktu_kirim = ?, status = ? WHERE id = ?', [waktu_kirim, status, req.params.id]);
    req.flash('success', 'Pengaturan notifikasi disimpan');
    res.redirect('/settings');
});

// WA Group ID Route
app.post('/settings/wa', requireAdmin, (req, res) => {
    const { wa_group_id } = req.body;
    const fs = require('fs');
    const path = require('path');
    
    // Update memory
    process.env.WA_GROUP_ID = wa_group_id;

    // Update file .env
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, 'utf8');
        if (envContent.includes('WA_GROUP_ID=')) {
            envContent = envContent.replace(/WA_GROUP_ID=.*/, `WA_GROUP_ID=${wa_group_id}`);
        } else {
            envContent += `\nWA_GROUP_ID=${wa_group_id}\n`;
        }
        fs.writeFileSync(envPath, envContent);
    } else {
        fs.writeFileSync(envPath, `WA_GROUP_ID=${wa_group_id}\n`);
    }

    req.flash('success', 'WA Group ID berhasil diperbarui!');
    res.redirect('/settings');
});

// Manual trigger send WA
app.post('/api/send-reminder/:type', requireAdmin, async (req, res) => {
    try {
        const cronJobs = require('./cron-jobs');
        if (req.params.type === 'tugas') {
            await cronJobs.sendTugasNotification();
            req.flash('success', 'Notifikasi Tugas berhasil dikirim ke WhatsApp!');
        } else {
            await cronJobs.sendPiketNotification();
            req.flash('success', 'Notifikasi Piket berhasil dikirim ke WhatsApp!');
        }
        res.redirect('/settings');
    } catch (error) {
        req.flash('error', 'Gagal mengirim notifikasi.');
        res.redirect('/settings');
    }
});

// WhatsApp Status & QR Route
app.get('/admin/whatsapp', requireAdmin, async (req, res) => {
    const waService = require('./whatsapp-service');
    const QRCode = require('qrcode');
    
    const qrRaw = waService.getQRCode();
    let qrImage = null;
    
    if (qrRaw) {
        try {
            qrImage = await QRCode.toDataURL(qrRaw);
        } catch (err) {
            console.error('Failed to generate QR Image:', err);
        }
    }
    
    res.render('pages/whatsapp', {
        title: 'Koneksi WhatsApp',
        active: 'whatsapp',
        qrImage: qrImage,
        isReady: waService.isReady(),
        lastError: waService.getLastError(),
        isInitializing: waService.isInitializing()
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    // Coba inisialisasi awal
    initFeatures();
});
