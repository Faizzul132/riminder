const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const db = require('./db');

// Initialize WhatsApp Client
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox']
    }
});

let isReady = false;

client.on('qr', (qr) => {
    // Generate and scan this code with your phone
    console.log('SCAN QR CODE BELOW DENGAN WHATSAPP:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('WhatsApp Bot is ready!');
    isReady = true;
});

client.on('message', async msg => {
    // Ini hanya untuk mendapatkan Group ID jika diperlukan
    if (msg.body === '!ping') {
        msg.reply('pong');
    }
    if (msg.body === '!groupid') {
        const chat = await msg.getChat();
        if (chat.isGroup) {
            msg.reply(`ID Group ini adalah: ${chat.id._serialized}`);
            console.log(`Group ID: ${chat.id._serialized}`);
        } else {
            msg.reply('Ini bukan grup.');
        }
    }
});

client.on('disconnected', (reason) => {
    console.log('WhatsApp Bot disconnected:', reason);
    isReady = false;
});

client.on('auth_failure', msg => {
    console.error('WA Auth Failure:', msg);
    isReady = false;
});

// Initialize with error handling to prevent server crash on session conflict
(async () => {
    try {
        await client.initialize();
    } catch (err) {
        if (err.message && err.message.includes('already running')) {
            console.warn('⚠️  WhatsApp session sudah berjalan. Menunggu 10 detik lalu coba lagi...');
            setTimeout(async () => {
                try {
                    await client.initialize();
                } catch (e2) {
                    console.error('Gagal inisialisasi WhatsApp (retry):', e2.message);
                }
            }, 10000);
        } else {
            console.error('Gagal inisialisasi WhatsApp:', err.message);
        }
    }
})();

/**
 * Fungsi untuk mengirim pesan ke nomor/grup
 */
const sendMessage = async (to, message) => {
    if (!isReady) {
        console.log('WhatsApp client belum siap.');
        return false;
    }
    try {
        await client.sendMessage(to, message);
        console.log(`Pesan terkirim ke ${to}`);
        return true;
    } catch (error) {
        console.error('Gagal mengirim pesan WhatsApp:', error);
        return false;
    }
};

module.exports = {
    client,
    sendMessage,
    isReady: () => isReady
};

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: '/usr/bin/google-chrome-stable', // Lokasi default di Linux/Railway
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ],
        headless: true
    }
});
