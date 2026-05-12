const { 
    default: makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    fetchLatestBaileysVersion, 
    makeCacheableSignalKeyStore 
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const path = require("path");
const fs = require("fs");

let sock = null;
let latestQRCode = null;
let isReady = false;
let lastError = null;

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, "auth_info_baileys"));
    const { version, isLatest } = await fetchLatestBaileysVersion();
    
    console.log(`Using WA version v${version.join(".")}, isLatest: ${isLatest}`);

    sock = makeWASocket({
        version,
        printQRInTerminal: true,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
        },
        logger: pino({ level: "silent" }),
        browser: ["KelasApp", "Safari", "1.0.0"],
    });

    sock.ev.on("connection.update", (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            latestQRCode = qr;
            isReady = false;
            console.log("QR Code received. Please scan via Web Dashboard.");
        }

        if (connection === "close") {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log("Connection closed due to", lastDisconnect?.error, ", reconnecting:", shouldReconnect);
            isReady = false;
            latestQRCode = null;
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        } else if (connection === "open") {
            console.log("WhatsApp connection opened successfully!");
            isReady = true;
            latestQRCode = null;
            lastError = null;
        }
    });

    sock.ev.on("creds.update", saveCreds);

    // Handle messages (optional, if needed for commands)
    sock.ev.on("messages.upsert", async ({ messages, type }) => {
        if (type === "notify") {
            for (const msg of messages) {
                if (!msg.key.fromMe && msg.message) {
                    const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || "").toLowerCase();
                    const from = msg.key.remoteJid;

                    if (text === "!ping") {
                        await sock.sendMessage(from, { text: "pong" });
                    }

                    if (text === "!groupid") {
                        await sock.sendMessage(from, { text: `ID Grup ini adalah: ${from}` });
                        console.log(`Group ID requested: ${from}`);
                    }
                }
            }
        }
    });
}

// Start connection
connectToWhatsApp().catch(err => {
    console.error("Critical error in WA connection:", err);
    lastError = err.message;
});

const sendMessage = async (to, message) => {
    if (!isReady || !sock) {
        console.log("WhatsApp client not ready.");
        return false;
    }
    try {
        // Formating JID (Ensure it ends with @s.whatsapp.net or @g.us)
        let jid = to;
        if (!jid.includes("@")) {
            jid = jid.replace(/\D/g, "") + "@s.whatsapp.net";
        }
        
        await sock.sendMessage(jid, { text: message });
        console.log(`Message sent to ${jid}`);
        return true;
    } catch (error) {
        console.error("Failed to send WhatsApp message:", error);
        return false;
    }
};

module.exports = {
    sendMessage,
    isReady: () => isReady,
    getQRCode: () => latestQRCode,
    getLastError: () => lastError,
    isInitializing: () => !isReady && !latestQRCode && !lastError,
    retry: connectToWhatsApp
};
