// Session.js
const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    sessionId: { type: String, required: true, unique: true },
    data: { type: Object, required: true }
});

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;
