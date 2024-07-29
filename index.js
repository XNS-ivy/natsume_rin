const {default: rin_sock, useMultiFileAuthState} = require("@whiskeysockets/baileys");
const pino = require("pino");

async function sock() {
    const {state,saveCreds} = await useMultiFileAuthState("session");
    const rin = rin_sock({
        printQRInTerminal: true,
        browser: ["Natsume_Rin","Chrome","1.0.0"],
        auth: state,
        logger: pino({level: "silent"}),
        syncFullHistory: false
    });
    rin.ev.on("creds.update", saveCreds);
    rin.ev.on("connection.update", async ({connection}) =>{
        if (connection === "open") {
            console.log("opened connection");
        }else if (connection === "close") {
            console.log("Reconnect....");
            try{
                await sock();
            }catch (err){
                console.error(err);
            }
        }
    });
    rin.ev.on("messages.upsert", async (m) =>{
    if(!m.messages) return;
    const bodyMessage = m.messages[0];
    const { msg } = require("./libs/message.js");
    try {
        await msg(bodyMessage,rin);
    } catch (err) {
        console.error(err)
    }
    });
}
sock();