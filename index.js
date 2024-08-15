const { default: rin_sock, useMultiFileAuthState, BufferJSON } = require("@whiskeysockets/baileys");
const pino = require("pino");
const { RateLimiterMemory } = require('rate-limiter-flexible');

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
    rin.ev.on("connection.update", async ({ connection }) => {
        if (connection === "open") {
            console.log("opened connection");
        } else if (connection === "close") {
            console.log("Reconnect....");
            try {
                await sock();
            } catch (err) {
                console.error(err);
            }
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
loadCore();
sock();