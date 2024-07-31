require('dotenv').config();
const core = require("../db/core.json");
const axios = require("axios");
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { RateLimiterMemory } = require('rate-limiter-flexible');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
const rateLimiter = new RateLimiterMemory({
    points: 2, // point
    duration: 15, // in second
});

async function msg(m, rinReply) {
    const processMsg = await messageProces(m);
    await chatlog(processMsg, rinReply, m);
}

async function chatlog(chat, rinReply, m) {
    if (!chat.text) return;

    console.log(`\t! New Chat !
        > Name \t\t: ${chat.name}
        > Number \t: ${chat.number}
        > On Group \t: ${chat.group}
        > Chat Type \t: ${chat.type}
        > Text \t\t: ${chat.text}\n`);

    if (chat.text.startsWith(core.identity.prefix)) {
        const prefix = chat.text.slice(core.identity.prefix.length).trim();
        const [query, ...args] = prefix.split(/\s+/);
        const argumen = args.join(" ");

        if (core.menu.includes(query)) {
            try {
                await rateLimiter.consume(query);
                await command(m, rinReply, query, argumen);
            } catch (rejRes) {
                console.error(`Rate limit exceeded for command: ${query}`);
                replyText(m, rinReply, `Cooldown 5 second!`);
            }
        } else {
            replyText(m, rinReply, core.reply.noCommand);
        }
    }
}

async function messageProces(m) {
    const getType = Object.keys(m.message)[0];

    const getText = getType === "conversation" ? m.message.conversation :
        getType === "extendedTextMessage" ? m.message.extendedTextMessage.text :
            getType === "imageMessage" ? m.message.imageMessage.caption :
                getType === "stickerMessage" ? "*Pesan Stiker*" : "";

    const getPhoneNumber = m.key.participant || m.key.remoteJid;
    const phoneNumber = getPhoneNumber.split('@')[0];
    const name = m.pushName;
    const target = m.key.remoteJid;
    const isOnGroup = m.key.participant !== undefined && m.key.participant !== "";

    return {
        type: getType,
        text: getText,
        number: phoneNumber,
        name: name,
        person: target,
        group: isOnGroup
    };
}

async function command(m, rinReply, query, argumen) {
    let text;
    let image;
    switch (query) {
        case core.menu[0]:
            text = core.reply.help;
            break;
        case core.menu[2]:
            text = core.reply.sourceCode;
            break;
        case core.menu[4]:
        case core.menu[5]:
            const region = query === core.menu[4] ? "id" : "en";
            text = await wiki(argumen, region);
            break;
        case core.menu[6]:
            text = await Gemini(argumen);
            break;
        default:
            text = core.reply.noCommand;
            break;
    }
    if (text) replyText(m, rinReply, text);
}
// ----------------------- command function
async function wiki(argumen, region) {
    if (!argumen) return text = `Please add argumen after query Ex: ".wikien anime"`;
    try {
        const response = await axios.get(`https://${region}.wikipedia.org/w/api.php`, {
            params: {
                format: 'json',
                action: 'query',
                list: 'search',
                srsearch: argumen,
                srprop: '',
                srlimit: 1,
                utf8: 1
            }
        });

        const searchResult = response.data.query.search;
        if (searchResult.length > 0) {
            const firstResult = searchResult[0];
            const title = firstResult.title;

            const articleResponse = await axios.get(`https://${region}.wikipedia.org/w/api.php`, {
                params: {
                    format: 'json',
                    action: 'query',
                    prop: 'extracts',
                    exintro: true,
                    explaintext: true,
                    redirects: 1,
                    titles: title
                }
            });

            const pages = articleResponse.data.query.pages;
            const pageIds = Object.keys(pages);
            if (pageIds.length > 0) {
                const extract = pages[pageIds[0]].extract;
                if (extract) {
                    return `Article: ${title}\n\n${extract}`;
                } else {
                    return `Sorry, article not found!`;
                }
            } else {
                return `Sorry, article not found!`;
            }
        } else {
            return `Sorry, result not found for : "${argumen}".`;
        }
    } catch (err) {
        console.error('Kesalahan saat mengambil data dari Wikipedia:', err);
        return `Error: ${err.message}`;
    }
}
async function Gemini(argumen) {
    try {
        const result = await model.generateContent([argumen]);
        if (typeof result.response.text === 'function') {
            return result.response.text();  // Panggil fungsi jika `text` adalah fungsi
        } else {
            return result.response.text;    // Cetak teks jika `text` adalah string
        }
    } catch (err) {
        return `Error: ${err}`
    }
}
// -------------------------
async function replyText(chat, rinReply, text) {
    const id = chat.key.remoteJid;
    await rinReply.sendMessage(id, { text: text }, { quoted: chat });
}

module.exports = { msg };