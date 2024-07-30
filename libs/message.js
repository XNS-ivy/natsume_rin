const core = require("../db/core.json");

async function msg(m, rinReply) {
    const processMsg = await messageProces(m);
    await chatlog(processMsg, rinReply, m);
    // console.log(m)
};

async function chatlog(chat, rinReply, m) {
    if (chat.text === "" || undefined) return null;
    console.log(`\t! New Message !
            > Name \t\t: ${chat.name}
            > Number \t\t: ${chat.number}
            > Text \t\t: ${chat.text}
            > Message Type \t: ${chat.type}
            > On Group \t\t: ${chat.group}\n`);

    if (chat.text.startsWith(core.identity.prefix)) {
        const prefix = chat.text.slice(core.identity.prefix.length).trim();
        const [query, ...args] = prefix.split(/\s+/);
        const argumen = args.join(" ");

        if (core.menu.includes(query)) {
            await command(m, rinReply, query, argumen);
        } else {
            replyText(m, rinReply, core.reply.noCommand);
        }
    } else {
        // do nothing 
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
async function command(m, rinReply, query, argumen) {
    let text;
    switch (query) {
        case core.menu[0]:
            text = core.reply.help;
            replyText(m, rinReply, text);
            break;
        case core.menu[2]:
            text = core.reply.sourceCode;
            replyText(m,rinReply,text);
            break;
        default:
            break;
    }
}

async function replyText(chat, rinReply, text) {
    const id = chat.key.remoteJid;
    await rinReply.sendMessage(id, { text: text }, { quoted: chat });
}
module.exports = { msg };