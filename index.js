require("./global-var.js");
const {
    default: rin_sock,
    useMultiFileAuthState,
    DisconnectReason,
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const {Boom} = require("@hapi/boom");
const { msg } = require("./libs/message.js");
const { loadCore } = require("./libs/utils.js");

async function sock() {
    loadCore();
    const { state, saveCreds } = await useMultiFileAuthState("session");
    const sockConfig = {
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
    };

    const rin = rin_sock(sockConfig);
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
sock().catch((err)=>{
    console.log("Failed to initialize socket: ",err);
});