require('dotenv').config();
const axios = require("axios");
const fetch = require('node-fetch');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { loadCore } = require('./utils');
let apiKey;

async function menu(name, prefix) {
    const text = `Hi ${name}, i saw you want use my feature.\n` +
        `Here i give you feature list.\n` +
        `I hope you not spamming.\n\n` +
        `*--- Regular Member Menu ---*\n\n` +
        `➤ Wikipedia Menu.\n` +
        `\t➥ ${prefix[0]}wikiid [search-indonesian-wiki]\n` +
        `\t➥ ${prefix[0]}wikien [search-global-wiki]\n\n` +
        `➤ Gemini Menu.\n` +
        `\t➥ ${prefix[0]}gemini [type-anything]\n\n` +
        `➤ Weather Condition Menu.\n` +
        `\t➥ ${prefix[0]}weather [your-city-location]\n\n` +
        `➤ Random Waifu Image.\n` +
        `\t➥ ${prefix[0]}waifusfw [category]\n` +
        `\t➥ ${prefix[0]}waifusfw [category]\n` +
        `\t\t ➣ Category:\n\t\t\t ┣ [waifu,neko,shinobu,megumin]\n` +
        `\t\t\t ┗ [waifu,neko,trap,blowjob]\n\n` +
        `➤ MyAnimeList Menu.\n` +
        `\t➥ ${prefix[0]}trending\n` +
        `\t➥ ${prefix[0]}search [anime-name]\n` +
        `\t➥ ${prefix[0]}seasonal\n` +
        `\t➥ ${prefix[0]}schedule\n` +
        `\t➥ ${prefix[0]}latest\n\n` +
        `➤ Role Play Games.\n` +
        `\t➥ ${prefix[0]}register [name]\n` +
        `\t➥ ${prefix[0]}inforpg\n` +
        `\t➥ ${prefix[0]}backpack\n` +
        `\t➥ ${prefix[0]}dungeon [floor]\n\n` +
        // end of regular member command
        `*--- Premium Member Menu ---*\n\n` +
        `➤ Dating with Rin.\n` +
        `\t➥ ${prefix[1]} [Ask everything!]\n\n` +
        // end of premium member
        `*--- Admin Tools ---*\n\n` +
        `\t➥ ${prefix[0]}ban [number/tag]\n` +
        `\t➥ ${prefix[0]}unban [number/tag]\n` +
        `\t➥ ${prefix[0]}shutdown\n` +
        `\t➥ ${prefix[0]}enablensfw\n` +
        `\t➥ ${prefix[0]}disablensfw\n` +
        `\t➥ ${prefix[0]}sc\n`;
    return text;
}

async function rinAi(msg) {
    if (msg === "hello" || msg == "hello how are you?" || msg == "hi") {
        if (global.core.identity && global.core.identity.chat_id) {
            global.core.identity.chat_id = "";

            try {
                await global.fs.writeFile(global.corePath, JSON.stringify(global.core, null, 2), 'utf8');
                console.log('chat_id reset...');
                await loadCore();
            } catch (err) {
                console.error('Error:', err);
            }
        } else {
            console.log('chat_id not found in global.core.');
        }
    }

    const apiUrl = 'https://api.apigratis.site/cai/send_message';
    const requestData = {
        external_id: global.core.identity.cai,
        message: msg,
        chat_id: global.core.identity.chat_id,
        n_ressurect: false
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });
        const data = await response.json();

        if (data.status) {
            const repliesText = data.result.replies.map(reply => reply.text);
            const reply = repliesText[0];
            if (global.core.identity.chat_id === "") {
                global.core.identity.chat_id = data.result.chat_id;

                await global.fs.writeFile(global.corePath, JSON.stringify(global.core, null, 2), 'utf8');
                console.log('chat_id updated and saved.');
                await loadCore();
            }

            return reply;
        } else {
            console.log('Error:', data.message);
        }
    } catch (error) {
        console.error('Error:', error);
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
async function weather(city) {
    try {
        apiKey = process.env.WEATHER;
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
async function Gemini(argumen) {
    try {
        apiKey = process.env.GEMINI_API;
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent([argumen]);
        if (typeof result.response.text === 'function') {
            return result.response.text();
        } else {
            return result.response.text;
        }
    } catch (err) {
        return `Error: ${err}`
    }
}
async function randomWaifu(type, category) {
    try {
        const response = await axios.get(`https://api.waifu.pics/${type}/${category}`);
        const imageUrl = response.data.url;
        return imageUrl;
    } catch (error) {
        console.error('Error fetching image: ', error.message);
    }
}

async function handleAnimeRequest(query, argument) {
    try {
        let response;
        let result = '';

        switch (query) {
            case 'trending':
                response = await axios.get('https://api.jikan.moe/v4/top/anime');
                result = 'Top Trending Anime:\n';
                response.data.data.forEach((anime, index) => {
                    result += `${index + 1}. ${anime.title} - Score: ${anime.score}\n`;
                });
                return result;

            case 'search':
                if (!argument) return "Please add the anime name you want to search.";
                response = await axios.get('https://api.jikan.moe/v4/anime', {
                    params: { q: argument }
                });
                result = `Search Results for "${argument}":\n`;
                response.data.data.forEach((anime, index) => {
                    result += `${index + 1}. ${anime.title}\n- Score: ${anime.score}\n\n`;
                });
                return result;

            case 'seasonal':
                response = await axios.get('https://api.jikan.moe/v4/seasons/now');
                result = 'Seasonal Anime:\n';
                response.data.data.forEach((anime, index) => {
                    result += `${index + 1}. ${anime.title}\n- Score: ${anime.score}\n\n`;
                });
                return result;

            case 'schedule':
                response = await axios.get('https://api.jikan.moe/v4/schedules');
                result = 'Anime Release Schedule:\n';
                response.data.data.forEach((anime, index) => {
                    result += `${index + 1}. ${anime.title}\n- Aired: ${anime.aired.string}\n\n`;
                });
                return result;

            case 'latest':
                response = await axios.get('https://api.apigratis.site/anime/latest?page=20');
                result = 'Latest Anime Update:\n';
                response.data.result.results.forEach((anime, index) => {
                    result += `${index + 1}. ${anime.title}\n- Episode: ${anime.episode}\n\n`;
                });
                return result;

            default:
                return 'Invalid query type! Please use "trending", "search", "seasonal", "schedule", or "latest".';
        }
    } catch (error) {
        return `Error handling anime request: ${error.message}`;
    }
}

module.exports = { wiki, weather, Gemini, randomWaifu, handleAnimeRequest, menu, rinAi };