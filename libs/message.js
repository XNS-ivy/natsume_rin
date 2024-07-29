async function msg(m) {
    const processMsg = await messageProces(m);
    await chatlog(processMsg);
};

async function chatlog(chat) {
    console.log(`\tName : ${chat.object}
        Number : ${chat.number}
        Text : ${chat.text}
        Message Type : ${chat.type}\n`);
};

async function messageProces(m) {
    const getType = Object.keys(m.message)[0];

    const getText = getType === "conversation" ? m.message.conversation :
        getType === "extendedTextMessage" ? m.message.extendedTextMessage.text :
        getType === "imageMessage" ? m.message.imageMessage.caption : undefined;
    
    const getPhoneNumber = m.key.participant === undefined ?
    m.key.remoteJid : m.key.participant
    const phoneNumber = await getPhoneNumber.split('@')[0];
    const name = m.pushName || undefined;
    return {
        type: getType,
        text: getText,
        number: phoneNumber,
        name: name
    };
};

module.exports = { msg };