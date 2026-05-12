const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String },
    password: { type: String, required: true },
    gender: { type: String },
    age: { type: Number },
    country: { type: String },
    
    // Affiliate & Referral tracking
    referralCode: { type: String },
    referredBy: { type: String },
    referralClicks: { type: Number, default: 0 },
    successfulReferrals: { type: Number, default: 0 },
    
    // Password Reset
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    
    // Admin System
    role: { type: String, default: 'user' } // Change manually to 'admin' in MongoDB Atlas for your account
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);