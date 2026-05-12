const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
    name: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    review: { type: String, required: true },
    approved: { type: Boolean, default: false } // Allows admin to approve before showing on frontend
}, { timestamps: true });

module.exports = mongoose.model('Review', ReviewSchema);