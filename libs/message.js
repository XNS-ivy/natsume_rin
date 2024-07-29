const core = require("../db/core.json");

async function msg(m, rinReply) {
    const processMsg = await messageProces(m);
    await chatlog(processMsg);
    // console.log(m)
};

async function chatlog(chat) {
    if (chat.text === "" || undefined) return null;
    console.log(`\t! New Message !
            > Name \t\t: ${chat.name}
            > Number \t\t: ${chat.number}
            > Text \t\t: ${chat.text}
            > Message Type \t: ${chat.type}
            > On Group \t\t: ${chat.group}\n`);
    
    if(chat.text.startsWith(core.identity.prefix)){
        const prefix = chat.text.slice(core.identity.prefix.length).trim();
        const [query, ...args] = prefix.split(/\s+/);
        const argumen = args.join(" ");

        if(core.menu.includes(query)){
            console.log("trigger command bot");
        }else{
            console.log("no command found");
        }
    }else{

    }
};

async function messageProces(m) {
    const getType = Object.keys(m.message)[0];

    const getText = getType === "conversation" ? m.message.conversation :
        getType === "extendedTextMessage" ? m.message.extendedTextMessage.text :
            getType === "imageMessage" ? m.message.imageMessage.caption :
                getType === "stickerMessage" ? "*Sticker Message*" :
                    undefined;

    const getPhoneNumber = m.key.participant === undefined ?
        m.key.remoteJid : m.key.participant
    const phoneNumber = await getPhoneNumber.split('@')[0];
    const name = m.pushName;
    const target = m.key.remoteJid;
    const isOnGroup = m.key.participant === undefined || "" ? false : true;
    return {
        type: getType,
        text: getText,
        number: phoneNumber,
        name: name,
        person: target,
        group: isOnGroup
    };
};
async function reply() {
    
}
module.exports = { msg };