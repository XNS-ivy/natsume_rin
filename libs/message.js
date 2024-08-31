const { wiki, weather, Gemini, randomWaifu, handleAnimeRequest, menu, rinAi } = require("./external-func");
const { toggleNSFW, loadCore } = require("./utils");
const { infoPlayer, registerToGuild, enterDungeon, checkBackpackItems } = require("./rin-rpg/rpg");

let WA_DEFAULT_EPHEMERAL = false;
let willban;

async function msg(m, rinReply) {
    if (!m.message) return;
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
    const text = chat.text.toLowerCase();

    for (const prefix of core.identity.prefix) {
        if (text.startsWith(prefix)) {
            const suffix = chat.text.slice(prefix.length).trim();
            let query, argumen;

            if (prefix === 'rin') {
                query = "rin";
                argumen = suffix;
            } else {
                const [firstWord, ...args] = suffix.split(/\s+/);
                query = firstWord;
                argumen = args.join(" ");
            }
            try {
                await global.rateLimiter.consume(m.key.remoteJid);

                if (core.menu.includes(query) || core.rpg.includes(query)) {
                    await command(m, rinReply, query, argumen, chat.number, chat.name);
                } else {
                    try {
                        await global.rateLimiter.consume(`${m.key.remoteJid}-noCommand`);
                        await replyText(m, rinReply, core.reply.noCommand);
                    } catch (rateLimitError) {
                        console.error(`Rate limit exceeded for noCommand in group: ${m.key.remoteJid}`);
                        try {
                            await global.stopLimit.consume(m.key.remoteJid);
                            await replyText(m, rinReply, core.reply.cooldown);
                        } catch (stopLimitError) {
                            await bans(m, rinReply, chat.number);
                        }
                    }
                }
            } catch (rejRes) {
                console.error(`Rate limit exceeded for group: ${m.key.remoteJid}`);
                try {
                    await global.stopLimit.consume(m.key.remoteJid);
                    await replyText(m, rinReply, core.reply.cooldown);
                } catch (stopLimitError) {
                    await bans(m, rinReply, chat.number);
                }
            }
            return;
        }
    }
}





async function messageProces(m) {
    if (!m.message || typeof m.message !== 'object') {
        return;
    }
    const getType = Object.keys(m.message)[0];
    const getText = getType == "conversation" ? m.message.conversation :
        getType == "extendedTextMessage" ? m.message.extendedTextMessage.text :
            getType == "imageMessage" ? m.message.imageMessage.caption :
                getType == "stickerMessage" ? "*Sticker*" : getType == "videoMessage" ? "" : "";
    if (getType == "extendedTextMessage") {
        WA_DEFAULT_EPHEMERAL = 604800;
    } else {
        WA_DEFAULT_EPHEMERAL = false;
    }
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

async function command(m, rinReply, query, argumen, number, name) {
    let text;
    let media = false;
    switch (query) {
        case core.menu[1]:
            text = await menu(name, core.identity.prefix);
            break;
        case core.menu[2]:
            if (!core.admins.includes(number)) {
                text = "You are not admin!"
            } else {
                text = core.reply.sourceCode;
            }
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
            break;
        case core.menu[8]:
            if (!core.admins.includes(number)) {
                text = "You are not admin!";
            } else {
                willban = true;
                text = await banning(m, rinReply, argumen, willban);
            }
            break;
        case core.menu[9]:
            if (!core.admins.includes(number)) {
                text = "You are not admin!";
            } else {
                willban = false;
                text = await banning(m, rinReply, argumen, willban);
            }
            break;
        case core.menu[10]:
            if (!core.admins.includes(number)) {
                text = "You are not admin!";
            } else {
                text = "Bye bye master!";
                setInterval(async () => {
                    process.exit();
                }, 5000);
            }
            break;
        case core.menu[11]:
        case core.menu[12]:
            if (!argumen) {
                text = "Cannot execute command. Try: '.waifusfw waifu'";
                break;
            }
            const isNsfwEnabled = core.nsfw === true;
            const isSfwQuery = query === core.menu[11];
            const isNsfwQuery = query === core.menu[12];
            const isValidWaifu = core.waifu.sfw.includes(argumen) || core.waifu.nsfw.includes(argumen);
            if (!isValidWaifu) {
                text = `Value not match! Here are the examples:\n.waifusfw <${core.waifu.sfw}>\n.waifunsfw <${core.waifu.nsfw}>`;
                break;
            }
            if (isSfwQuery) {
                text = "Here yours...";
                media = await randomWaifu("sfw", argumen);
            } else if (isNsfwQuery) {
                text = isNsfwEnabled ? "*blush* >///<" : "Please turn on nsfw!";
                media = isNsfwEnabled ? await randomWaifu("nsfw", argumen) : undefined;
            }
            break;
        case core.menu[13]:
        case core.menu[14]:
            if (core.admins.includes(number)) {
                const enable = query === core.menu[13];
                text = await toggleNSFW(enable);
            } else {
                text = "Youre not admin!";
            }
            break;
        case core.menu[15]:
        case core.menu[16]:
        case core.menu[17]:
        case core.menu[18]:
            text = await handleAnimeRequest(query, argumen);
            break;
        case core.menu[19]:
            text = await rinAi(argumen)
            break;
        case core.rpg[0]:
            text = await infoPlayer(number);
            break;
        case core.rpg[1]:
            if (!argumen) {
                text = `Please add your name: .${core.rpg[1]} [Your Name]`
                break;
            }
            text = await registerToGuild(number, argumen);
            break;
        case core.rpg[2]:
            if (!argumen) {
                text = `Please add floor you want to enter: .${core.rpg[2]} 1`;
                break;
            }
            text = await enterDungeon(number, argumen);
            break;
        case core.rpg[3]:
            text = await checkBackpackItems(number);
            break;
        default:
            text = core.reply.noCommand;
            break;
    }
    if (text && media == false) {
        replyText(m, rinReply, text);
    } else if (text && media) {
        replyImage(m, rinReply, text, media);
    }else {
        sendButton(m,rinReply);
    }
}
// util function ---
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
        loadCore();
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
        loadCore();
    } catch (err) {
        console.error('Error processing unban:', err);
        await replyText(m, rinReply, 'An error occurred while processing the unban.');
    }
}
// reply function ---
async function replyText(m, rinReply, text) {
    const id = m.key.remoteJid;
    await rinReply.sendMessage(id,
        { text: text }, {
        quoted: m,
        ephemeralExpiration: WA_DEFAULT_EPHEMERAL
    });
}
async function replyImage(m, rinReply, text, url) {
    const id = m.key.remoteJid;
    await rinReply.sendMessage(id, {
        image: { url: url },
        caption: text
    }, { quoted: m, ephemeralExpiration: WA_DEFAULT_EPHEMERAL });
}
module.exports = { msg };
