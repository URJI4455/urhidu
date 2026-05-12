const mongoose = require('mongoose');

const ContactSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    subject: { type: String },
    message: { type: String, required: true },
    status: { type: String, default: 'Unread' }
}, { timestamps: true });

module.exports = mongoose.model('Contact', ContactSchema);