const {
    default: rin_sock,
    useMultiFileAuthState,
    DisconnectReason,
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const { RateLimiterMemory } = require('rate-limiter-flexible');
const {Boom} = require("@hapi/boom");
const { msg } = require("./libs/message.js");
const { loadCore } = require("./libs/utils.js");
global.fs = require("fs").promises;
global.core = {};
global.corePath = "./db/core.json";
global.rateLimiter = new RateLimiterMemory({
    points: 2,
    duration: 120,
});
global.stopLimit = new RateLimiterMemory({
    points: 1,
    duration: 120,
});

async function sock() {
    loadCore();
    const { state, saveCreds } = await useMultiFileAuthState("session");
    const rin = rin_sock({
        printQRInTerminal: true,
        browser: ["Natsume_Rin", "Chrome", "1.0.0"],
        auth: state,
        logger: pino({ level: "silent" }),
        syncFullHistory: true,
        generateHighQualityLinkPreview: true,
        connectTimeoutMs: 10000,
        emitOwnEvents: false,
        shouldSyncHistoryMessage: true,
        markOnlineOnConnect: true,
    });
    rin.ev.on("creds.update", saveCreds);
    rin.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if(connection === 'close') {
            const shouldReconnect = (lastDisconnect.error = Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('connection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect);
            if(shouldReconnect) {
                sock();
            }
        } else if(connection === 'open') {
            console.log('opened connection');
        }
    });
    rin.ev.on("messages.upsert", async (m) => {
        if (!m.messages) return;
        const bodyMessage = m.messages[0];
        try {
            await msg(bodyMessage, rin);
        } catch (err) {
            console.error(err)
        }
    });
}
sock();