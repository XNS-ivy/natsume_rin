const { RateLimiterMemory } = require('rate-limiter-flexible');
global.colors = require('colors');
global.fs = require("fs").promises;
global.core = {};
global.corePath = "./db/core.json";
global.rateLimiter = new RateLimiterMemory({
    points: 2,
    duration: 120,
});
global.stopLimit = new RateLimiterMemory({
    points: 1,
    duration: 120,
});
global.owner = (number) => {
    global.owner_number = number;
};