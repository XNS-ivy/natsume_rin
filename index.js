require("./global-var.js");

const {
    default: makeWASocket,
    useMultiFileAuthState,
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const { msg } = require("./libs/message.js");
const { loadCore, setOwner } = require("./libs/utils.js");

async function sock() {
    const { state, saveCreds } = await useMultiFileAuthState("./session");
    const sockConfig = {
        printQRInTerminal: true,
        browser: ["Natsume_Rin", "Chrome", "1.0.0"],
        auth: state,
        logger: pino({ level: "silent" }),
        generateHighQualityLinkPreview: true,
        connectTimeoutMs: 10000,
        emitOwnEvents: false,
    };

    const rin = makeWASocket(sockConfig);
    rin.ev.on("creds.update", async () => {
        try {
            await saveCreds();
        } catch (error) {
            console.error('Failed to save credentials:', error);
        }
    });
    rin.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            try {
                setTimeout(async() => {
                    console.error(`Disconnected due :${lastDisconnect.error.message}\n Time :${lastDisconnect.date}\n`);
                    await sock();
                }, 5000);
            } catch (err) {
                console.error("Error Reconnect : ", err);
            }
        } else if (connection === 'open') {
            const number = rin.user.id.split(":")[0];
            const connect = `Connection is open\n` +
                `Number: ${number}\n` +
                `Name: ${rin.user.name}\n\n`;
            console.log(connect.yellow);
            try {
                console.log("Adding owner number...".red);
                await setOwner(number);
            } catch (error) {
                console.error("Error adding owner number: ", error);
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
loadCore().catch((err) => {
    console.log("Failed to initialize core: ", err)
});
sock().catch((err) => {
    console.log("Failed to initialize socket: ", err);
});

process.on('uncaughtException', (err) => {
    console.error('An unhandled exception occurred:', err.message);
    console.error(err.stack);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('An unhandled promise rejection occurred:', reason);
    process.exit(1);
});

process.on('SIGINT', () => {
    console.log('Rin will terminated are you sure?'.yellow);
    process.exit(0);
});

process.on('warning', (warning) => {
    console.warn(`Warning: ${warning.name} - ${warning.message}`);
    console.warn(warning.stack);
});