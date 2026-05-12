const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcodeTerminal = require('qrcode-terminal');
const db = require('./db');

let latestQRCode = null;
let isReady = false;

// Initialize WhatsApp Client with Railway-friendly settings
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: process.env.CHROME_BIN || '/usr/bin/google-chrome-stable',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ],
        headless: true
    }
});

client.on('qr', (qr) => {
    latestQRCode = qr;
    console.log('QR Code received. Scan it in the web dashboard.');
    qrcodeTerminal.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('WhatsApp Bot is ready!');
    isReady = true;
    latestQRCode = null;
});

client.on('authenticated', () => {
    console.log('WhatsApp authenticated successfully');
});

client.on('auth_failure', (msg) => {
    console.error('WhatsApp authentication failure:', msg);
    isReady = false;
});

client.on('disconnected', (reason) => {
    console.log('WhatsApp disconnected:', reason);
    isReady = false;
    latestQRCode = null;
});

// Auto initialize
(async () => {
    try {
        await client.initialize();
    } catch (err) {
        console.error('Failed to initialize WhatsApp:', err.message);
    }
})();

const sendMessage = async (to, message) => {
    if (!isReady) {
        console.log('WhatsApp client not ready.');
        return false;
    }
    try {
        await client.sendMessage(to, message);
        console.log(`Message sent to ${to}`);
        return true;
    } catch (error) {
        console.error('Failed to send WhatsApp message:', error);
        return false;
    }
};

module.exports = {
    client,
    sendMessage,
    isReady: () => isReady,
    getQRCode: () => latestQRCode
};
