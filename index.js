const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Models (Fixed: Users.js instead of User.js to match your file name)
const User = require('./Users.js'); 
const Order = require('./order.js');
const Contact = require('./Contact.js');
const Review = require('./Review.js');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Multer setup (Memory Storage for Vercel, max 4MB to prevent vercel crash)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 4 * 1024 * 1024 } }); 

// --- SERVERLESS MONGODB CONNECTION ---
// Cache the connection globally so Vercel doesn't create 100+ connections
let cached = global.mongoose;
if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
    if (cached.conn) return cached.conn;
    
    if (!cached.promise) {
        cached.promise = mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000 // Timeout after 5s instead of hanging
        }).then(mongoose => {
            console.log("✅ MongoDB Connected Successfully");
            return mongoose;
        }).catch(err => {
            console.error("❌ MongoDB Connection Error:", err.message);
            cached.promise = null;
            throw err;
        });
    }
    cached.conn = await cached.promise;
    return cached.conn;
};

// Apply to all API requests
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (error) {
        res.status(500).json({ error: "Database Connection Failed" });
    }
});
// ----------------------------------------
// ----------------------------------------

// Nodemailer Setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS  
    }
});

// Authentication Middleware
const authMiddleware = (req, res, next) => {
    const token = req.header('Authorization');
    if (!token) return res.status(401).json({ error: 'No token, authorization denied' });
    try {
        const decoded = jwt.verify(token.replace('Bearer ', ''), JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Token is not valid' });
    }
};

// Admin Middleware
const adminAuthMiddleware = (req, res, next) => {
    authMiddleware(req, res, () => {
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied. Admins only.' });
        next();
    });
};

// ==========================================
// PUBLIC & USER API ROUTES
// ==========================================

// --- AFFILIATE CLICK TRACKING ---
app.get('/api/ref/:code', async (req, res) => {
    try {
        await User.findOneAndUpdate(
            { referralCode: req.params.code },
            { $inc: { referralClicks: 1 } }
        );
        res.redirect('/');
    } catch (err) { res.redirect('/'); }
});

// --- REGISTER API ---
app.post('/api/register', async (req, res) => {
    try {
        const { firstName, lastName, email, phone, password, gender, age, country, referredBy } = req.body;
        
        const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
        if (existingUser) return res.status(400).json({ error: "Email or Phone already registered." });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const referralCode = firstName.toUpperCase() + Math.floor(1000 + Math.random() * 9000);

        const newUser = new User({
            firstName, lastName, email, phone, password: hashedPassword, gender, age, country, referralCode, referredBy
        });

        await newUser.save();
        
        if (referredBy) {
            await User.findOneAndUpdate({ referralCode: referredBy }, { $inc: { successfulReferrals: 1 } });
        }

        res.status(201).json({ message: "User registered successfully" });
    } catch (error) { res.status(500).json({ error: "Server error during registration." }); }
});

// --- LOGIN API ---
app.post('/api/login', async (req, res) => {
    try {
        const { identifier, password } = req.body;
        
        const user = await User.findOne({ $or:[{ email: identifier }, { phone: identifier }] });
        if (!user) return res.status(400).json({ error: "Invalid credentials." });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "Invalid credentials." });

        const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

        res.status(200).json({ 
            token, 
            user: { email: user.email, phone: user.phone, firstName: user.firstName, lastName: user.lastName, referralCode: user.referralCode, role: user.role } 
        });
    } catch (error) { res.status(500).json({ error: "Server error during login." }); }
});














// --- FORGOT & RESET PASSWORD ---
app.post('/api/forgot-password', async (req, res) => {
    try {
        const { identifier } = req.body;
        const user = await User.findOne({ $or: [{ email: identifier }, { phone: identifier }] });
        if (!user) return res.status(400).json({ error: "User not found." });

        const resetToken = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();

        // THIS IS THE NEW EMAIL CODE
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            await transporter.sendMail({
                from: `"URHIDU " <${process.env.EMAIL_USER}>`,
                to: user.email,
                subject: `Your Password Reset Token`,
                html: `<h3>Password Reset Request</h3>
                       <p>Hello ${user.firstName},</p>
                       <p>Your secure password reset token is: <b style="font-size:1.2rem; color:#C9A063;">${resetToken}</b></p>
                       <p>Please copy and paste this token into the website to set a new password. It will expire in 1 hour.</p>`
            });
        }

        res.status(200).json({ message: "If an account exists, a reset token has been sent to the email provided." });
        
        
    } catch (error) { res.status(500).json({ error: "Server error." }); }
});




















app.post('/api/reset-password', async (req, res) => {
    try {
        const { resetToken, newPassword } = req.body;
        const user = await User.findOne({ resetPasswordToken: resetToken, resetPasswordExpires: { $gt: Date.now() } });
        if (!user) return res.status(400).json({ error: "Invalid or expired token." });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.status(200).json({ message: "Password reset successful." });
    } catch (error) { res.status(500).json({ error: "Server error." }); }
});

// --- PROFILE APIS ---
app.get('/api/profile', authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password -resetPasswordToken -resetPasswordExpires');
        res.status(200).json(user);
    } catch (error) { res.status(500).json({ error: "Server error." }); }
});

app.put('/api/profile', authMiddleware, async (req, res) => {
    try {
        const { firstName, lastName, email, phone, gender, age, country } = req.body;
        await User.findByIdAndUpdate(req.user.userId, { firstName, lastName, email, phone, gender, age, country });
        res.status(200).json({ message: "Profile updated successfully." });
    } catch (error) { res.status(500).json({ error: "Server error." }); }
});

app.put('/api/password', authMiddleware, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user.userId);
        
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(400).json({ error: "Incorrect current password." });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.status(200).json({ message: "Password updated securely." });
    } catch (error) { res.status(500).json({ error: "Server error." }); }
});

// --- ORDER API ---
app.post('/api/order', authMiddleware, upload.array('files', 5), async (req, res) => {
    try {
        const { serviceType, fullName, jobTitle, companyName, email, phone, businessProblem, hasWebsite, launchDate, budgetRange, primaryGoal, preferredCommunication } = req.body;
        
        const fileNames = req.files ? req.files.map(f => f.originalname) : [];
        const emailAttachments = req.files ? req.files.map(f => ({
            filename: f.originalname,
            content: f.buffer
        })) : [];

        const newOrder = new Order({
            userId: req.user.userId, service: serviceType, name: fullName, jobTitle, companyName,
            email, phone, businessProblem, hasWebsite, launchDate, budgetRange,
            primaryGoal, preferredCommunication, files: fileNames
        });
        await newOrder.save();

        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            await transporter.sendMail({
                from: `" URHIDU " <${process.env.EMAIL_USER}>`,
                to: process.env.EMAIL_USER,
                subject: `🚨 NEW ORDER: ${serviceType} | ${companyName}`,
                text: `You received a new order!\n\nClient: ${fullName}\nCompany: ${companyName}\nEmail: ${email}\nPhone: ${phone}\n\nProject Goal: ${primaryGoal}\nBudget: ${budgetRange}\nLaunch Date: ${launchDate}\n\nProject Details:\n${businessProblem}`,
                attachments: emailAttachments
            });

            await transporter.sendMail({
                from: `" URHIDU " <${process.env.EMAIL_USER}>`,
                to: email,
                subject: ` Your Order has been received `,
                html: `<h3>Hello ${fullName},</h3>
                       <p>We have successfully received your project request for <b>${serviceType}</b>.</p>
                       <p>Our lead developer will review your details and contact you via <b>${preferredCommunication}</b> within 24 hours to discuss the next steps.</p>
                       <br><p>Thank you for choosing URHIDU! </p>`
            });
        }

        res.status(201).json({ message: "Order submitted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error during order submission." });
    }
});

// --- CONTACT API ---
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;
        const newContact = new Contact({ name, email, subject, message });
        await newContact.save();

        if (process.env.EMAIL_USER) {
            await transporter.sendMail({
                from: `" URHIDU " <${process.env.EMAIL_USER}>`,
                to: process.env.EMAIL_USER,
                subject: `New Message: ${subject || 'Inquiry'} from ${name}`,
                text: `Sender: ${name}\nEmail: ${email}\n\nMessage:\n${message}`
            });
        }

        res.status(201).json({ message: "Message sent successfully" });
    } catch (error) { res.status(500).json({ error: "Server error sending message." }); }
});

// --- REVIEW API ---
app.post('/api/review', async (req, res) => {
    try {
        const { name, rating, review } = req.body;
        const newReview = new Review({ name, rating, review });
        await newReview.save();
        res.status(201).json({ message: "Review submitted successfully" });
    } catch (error) { res.status(500).json({ error: "Server error submitting review." }); }
});

// --- NEWSLETTER API ---
app.post('/api/newsletter', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (process.env.EMAIL_USER) {
            await transporter.sendMail({
                from: `"URHIDU " <${process.env.EMAIL_USER}>`,
                to: process.env.EMAIL_USER,
                subject: `New Newsletter Subscriber!`,
                text: `You have a new subscriber: ${email}`
            });
        }
        res.status(200).json({ message: "Successfully subscribed to newsletter!" });
    } catch (error) { 
        res.status(500).json({ error: "Server error subscribing to newsletter." }); 
    }
});

// ==========================================
// SECURE ADMIN ROUTES
// ==========================================

app.get('/api/admin/stats', adminAuthMiddleware, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const pendingOrders = await Order.countDocuments({ status: 'Pending' });
        const affiliates = await User.countDocuments({ successfulReferrals: { $gt: 0 } });
        res.status(200).json({ totalUsers, pendingOrders, affiliates });
    } catch (err) { res.status(500).json({ error: 'Server Error' }); }
});

app.get('/api/admin/orders', adminAuthMiddleware, async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.status(200).json(orders);
    } catch (err) { res.status(500).json({ error: 'Server Error' }); }
});

app.get('/api/admin/users', adminAuthMiddleware, async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.status(200).json(users);
    } catch (err) { res.status(500).json({ error: 'Server Error' }); }
});

module.exports = app;
