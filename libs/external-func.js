require('dotenv').config();
const axios = require("axios");
const { GoogleGenerativeAI } = require('@google/generative-ai');
let apiKey;

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
  
module.exports = { wiki, weather, Gemini, randomWaifu };