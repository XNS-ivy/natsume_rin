require('dotenv').config();
const fs = require("fs").promises;
const axios = require("axios");
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { RateLimiterMemory } = require('rate-limiter-flexible');
const corePath = "./db/core.json";
let WA_DEFAULT_EPHEMERAL = false;
let willban;

let core = {};
async function loadCore() {
    try {
        const data = await fs.readFile(corePath, 'utf8');
        core = JSON.parse(data);
    } catch (err) {
        console.error('Error reading core.json:', err);
    }
}
loadCore();

const rateLimiter = new RateLimiterMemory({
    points: 1, // point
    duration: 30, // in second
});
const stopLimit = new RateLimiterMemory({
    points: 1,
    duration: 120,
});

async function msg(m, rinReply) {
    loadCore();
    const processMsg = await messageProces(m);
    await chatlog(processMsg, rinReply, m);
}

async function chatlog(chat, rinReply, m) {
    if (!core.bans || !Array.isArray(core.bans)) {
        console.log("loading core....");
        return;
    }
    if (core.bans.includes(chat.number)) {
        return;
    }
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
                await command(m, rinReply, query, argumen, chat.number);
            } catch (rejRes) {
                console.error(`Rate limit exceeded for command: ${query}`);
                try {
                    await stopLimit.consume(1);
                    await replyText(m, rinReply, core.reply.cooldown);
                } catch (stopLimitError) {
                    await bans(m, rinReply, chat.number);
                }
            }
        } else {
            try {
                await rateLimiter.consume('noCommand');
                await replyText(m, rinReply, core.reply.noCommand);
            } catch (rateLimitError) {
                try {
                    await stopLimit.consume(1);
                    await replyText(m, rinReply, core.reply.cooldown);
                } catch (stopLimitError) {
                    await bans(m, rinReply, chat.number);
                }
            }
        }
    }
}

async function messageProces(m) {
    if (!m.message || typeof m.message !== 'object') {
        return {};
    }
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
    if (getType === "extendedTextMessage") {
        WA_DEFAULT_EPHEMERAL = 604800;
    }
    return {
        type: getType,
        text: getText,
        number: phoneNumber,
        name: name,
        person: target,
        group: isOnGroup
    };
}

async function command(m, rinReply, query, argumen, number) {
    let text;
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
        case core.menu[7]:
            text = await weather(argumen);
            console.log("trigger weather");
            break;
        case core.menu[8]:
            if (!core.admins.includes(number)) {
                text = "youre not admin";
            } else {
                willban = true;
                text = await banning(m, rinReply, argumen, willban);
            }
            break;
        case core.menu[9]:
            if (!core.admins.includes(number)) {
                text = "youre not admin";
            } else {
                willban = false;
                text = await banning(m, rinReply, argumen, willban);
            }
            break;
        default:
            text = core.reply.noCommand;
            break;
    }
    if (text) replyText(m, rinReply, text);
}
function isPhoneNumber(value) {
    const phonePattern = /^[0-9]{10,15}$/;
    return phonePattern.test(value);
}
async function banning(m, rinReply, number, willban) {
    const phone = number.startsWith('@') ? number.slice(1) : number;

    if (isPhoneNumber(phone)) {
        if (willban === true) {
            await bans(m, rinReply, phone);
            return "You are BANNED!";
        } else if (willban === false) {
            await unban(m, rinReply, phone);
            return "Youre no longer banned";
        }
    } else {
        return "Not a phone number";
    }
}
async function bans(m, rinReply, number) {
    try {
        const data = await fs.readFile(corePath, 'utf8');
        const jsonData = JSON.parse(data);

        if (!jsonData.bans.includes(number)) {
            jsonData.bans.push(number);
            await fs.writeFile(corePath, JSON.stringify(jsonData, null, 2), 'utf8');
            await replyText(m, rinReply, core.reply.ban);
        }
    } catch (err) {
        console.error('Error processing bans:', err);
        await replyText(m, rinReply, 'An error occurred while processing the ban.');
    }
}
async function unban(m, rinReply, number) {
    try {
        const data = await fs.readFile(corePath, 'utf8');
        const jsonData = JSON.parse(data);
        const index = jsonData.bans.indexOf(number);
        if (index !== -1) {
            jsonData.bans.splice(index, 1);
            await fs.writeFile(corePath, JSON.stringify(jsonData, null, 2), 'utf8');
            await replyText(m, rinReply, 'The number has been unbanned.');
        } else {
            await replyText(m, rinReply, 'Number is not banned.');
        }
    } catch (err) {
        console.error('Error processing unban:', err);
        await replyText(m, rinReply, 'An error occurred while processing the unban.');
    }
}
async function wiki(argumen, region) {
    if (!argumen) return `Please add argument after query Ex: ".wikien anime"`;
    try {
        const url = `https://${region}.wikipedia.org/w/api.php`;
        const responseUrl = await axios.get(url, {
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

        const searchResult = responseUrl.data.query.search;
        if (searchResult.length > 0) {
            const firstResult = searchResult[0];
            const title = firstResult.title;
            const articleResponse = await axios.get(url, {
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
        const apiKey = process.env.GEMINI_API;
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent([argumen]);
        return result.response.text;
    } catch (err) {
        return `Error: ${err}`;
    }
}

async function weather(city) {
    try {
        const apiKey = process.env.WHEATER;
        const url = `http://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric`;

        const responseUrl = await axios.get(url);
        const data = responseUrl.data;
        const weatherDescription = data.weather[0].description;
        const temperature = data.main.temp;
        const feelsLike = data.main.feels_like;
        const humidity = data.main.humidity;
        const windSpeed = data.wind.speed;

        return `
        Weather in ${city}:
        - Description: ${weatherDescription}
        - Temperature: ${temperature}°C
        - Feels Like: ${feelsLike}°C
        - Humidity: ${humidity}%
        - Wind Speed: ${windSpeed} m/s
        `;
    } catch (err) {
        console.error('Error fetching the weather data:', err);
        return `Error: ${err.message}`;
    }
}

async function replyText(m, rinReply, text) {
    const id = m.key.remoteJid;
    await rinReply.sendMessage(id,
        { text: text }, {
        quoted: m,
        ephemeralExpiration: WA_DEFAULT_EPHEMERAL
    });
}

module.exports = { msg };
