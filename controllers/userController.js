const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const asyncHandler = require("express-async-handler");
const nodemailer = require("nodemailer");
const Budget = require("../models/budgetModel");
const axios = require("axios");
const crypto = require("crypto");
const Transaction = require("../models/transactionModel");
const Savings = require("../models/savingModel");


require("dotenv").config();

const getExchangeRate = async (fromCurrency, toCurrency) => {
    try {
      const API_KEY = process.env.CURRENCY_KEY; // Replace with your key
      const response = await axios.get(`https://v6.exchangerate-api.com/v6/${process.env.CURRENCY_KEY}/latest/${fromCurrency}`);
      console.log(response);
      
      return response.data.conversion_rates[toCurrency];
    } catch (error) {
      console.error("Exchange rate fetch failed:", error.message);
      return null;
    }
  };
  
   
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const userController = {
    register: asyncHandler(async (req, res) => {
        const { username, email, password, role, dob,phone } = req.body;

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = jwt.sign({ email }, process.env.JWT_SECRET_KEY, { expiresIn: "1d" });

        const user = await User.create({
            username,
            email,
            password: hashedPassword,
            verified: false,
            role,
            dob,
            phone,
            verificationToken,
            createdAt:Date.now()
        });

        if (!user) {
            return res.status(500).json({ message: "User creation failed" });
        }

        const payload = { email: user.email, id: user.id };
        const token = jwt.sign(payload, process.env.JWT_SECRET_KEY, { expiresIn: "2d" });

        res.cookie("token", token, {
            maxAge: 2 * 24 * 60 * 60 * 1000,
            httpOnly: true,
            sameSite: "none",
            secure: process.env.NODE_ENV === "production"
        });

        const verificationLink = `${process.env.CLIENT_URL}/verify?token=${verificationToken}`;
        // await transporter.sendMail({
        //     from: process.env.EMAIL_USER,
        //     to: email,
        //     subject: "Verify Your Email",
        //     html: `<p>Click the link to verify your email: <a href="${verificationLink}">${verificationLink}</a></p>`
        // });

        res.json({ token });
    }),

    verifyEmail: asyncHandler(async (req, res) => {
        const { token } = req.query;
        if (!token) {
            return res.status(400).json({ message: "Invalid or missing token" });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
            const user = await User.findOne({ email: decoded.email });

            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            if (user.verified) {
                return res.status(200).json({ message: "Email already verified" });
            }

            user.verified = true;
            user.verificationToken = null;
            await user.save();

            res.status(200).json({ message: "Email verification successful" });
        } catch (error) {
            res.status(400).json({ message: "Invalid or expired token" });
        }
    }),

    googleRegister: asyncHandler(async (req, res) => {
        const email = req.user.emails[0].value;
        let user = await User.findOne({ email });

        if (!user) {
            user = await User.create({
                email,
                username: email,
                verified: true
            });

            if (!user) {
                return res.status(500).json({ message: "User creation failed" });
            }
        }

        const payload = { email: user.email, id: user.id };
        const token = jwt.sign(payload, process.env.JWT_SECRET_KEY, { expiresIn: "2d" });

        res.cookie("token", token, {
            maxAge: 2 * 24 * 60 * 60 * 1000,
            httpOnly: true,
            sameSite: "none",
            secure: process.env.NODE_ENV === "production"
        });

        res.status(200).json({ message: "User authenticated successfully" });
    }),

    login: asyncHandler(async (req, res) => {       
        
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (!user.verified) {
            // return res.status(401).json({ message: "Please verify your email before logging in" });
            return res.status(401).json({ message: "Please wait..." });

        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ message: "Incorrect password" });
        }
        const role=user.role
        const payload = { email: user.email, id: user.id, plan:user.plan };
        const token = jwt.sign(payload, process.env.JWT_SECRET_KEY, { expiresIn: "2d" });
        res.json({ token,role });

    }),

    getUserProfile: asyncHandler(async (req, res) => {
        const userId = req.user.id;
        const user = await User.findById(userId).select("-password");

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({ message: "User details retrieved successfully", user });
    }),

    logout: asyncHandler(async (req, res) => {
        res.clearCookie("token");
        res.status(200).json({ message: "User logged out" });
    }),

    profile: asyncHandler(async (req, res) => {
        const { username, password, oldPassword, dob, currencyPreference, phone } = req.body;
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) throw new Error("User not found");

    // Handle password change
    if (password) {
        const passwordMatch = await bcrypt.compare(oldPassword, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ message: "Incorrect old password" });
        }
        user.password = await bcrypt.hash(password, 10);
    }

    // Track currency change
    const oldCurrency = user.currencyPreference;
    const currencyChanged = currencyPreference && oldCurrency !== currencyPreference;

    // Update profile fields
    if (username) user.username = username;
    if (dob) user.dob = dob;
    if (phone) user.phone = phone;
    if (currencyPreference) user.currencyPreference = currencyPreference;

    await user.save();

    // Only allow currency conversion if user is Premium
    if (currencyChanged && user.plan === 'premium') {
        const rate = await getExchangeRate(oldCurrency || "INR", currencyPreference);
        console.log(rate);
        
        if (!rate) return res.status(500).json({ message: "Currency conversion failed" });

        // Convert Transactions
        const transactions = await Transaction.find({ user: userId });
        for (let txn of transactions) {
            txn.amount = txn.amount * rate;
            await txn.save();
        }

        // Convert Budgets
        const budgets = await Budget.find({ user: userId });
        for (let budget of budgets) {
            if (budget.limit) budget.limit *= rate;
            if (budget.spent) budget.spent *= rate;
            await budget.save();
        }

        // Convert Savings
        const savings = await Savings.find({ user: userId });
        for (let saving of savings) {
            if (saving.goalAmount) saving.goalAmount *= rate;
            if (saving.savedAmount) saving.savedAmount *= rate;
            await saving.save();
        }
    }

    // if (user.isPremium && currencyPreference && currencyPreference !== user.currencyPreference) {
    //     const rate = await getExchangeRate(user.currencyPreference, currencyPreference);
      
    //     // Update all financial fields
    //     await Transaction.updateMany({ userId: user._id }, { $mul: { amount: rate } });
    //     await Budget.updateMany({ userId: user._id }, { $mul: { amount: rate } });
    //     await Savings.updateMany({ userId: user._id }, { $mul: { amount: rate } });
      
    //     user.currencyPreference = currencyPreference;
    //   }
      
    res.status(200).json({ message: "Profile updated successfully" });
    }),

    changePassword: asyncHandler(async (req, res) => {
        const userId = req.user.id;
        const { oldPassword, newPassword } = req.body;
    
        // Validate input
        if (!oldPassword || !newPassword) {
            res.status(400);
            throw new Error("Both old and new passwords are required");
        }
    
        const user = await User.findById(userId);
        if (!user) {
            res.status(404);
            throw new Error("User not found");
        }
    
        // Check if old password matches
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            res.status(401);
            throw new Error("Incorrect old password");
        }
    
        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
    
        // Save the updated user
        await user.save();
    
        res.send({
            message: "Password changed successfully",
        });
    }),

    forgotPassword: asyncHandler(async (req, res) => {
        const { email } = req.body;
        const user = await User.findOne({ email });
        console.log(email);
        
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Generate Reset Token
        const resetToken = crypto.randomBytes(32).toString("hex");
        const hashedToken = await bcrypt.hash(resetToken, 10);
        
        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour expiry
        await user.save();

        // Send Email
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&email=${email}`;

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Password Reset Request",
            text: `Click on this link to reset your password: ${resetLink}`,
        };

        transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "Email could not be sent" });
            }
            res.json({ message: "Reset link sent to your email" });
        });
    }),
    resetPassword: asyncHandler(async (req, res) => {
        const { email, token, newPassword } = req.body;
        const user = await User.findOne({ email });
        console.log(email, token, newPassword);

        if (!user || !user.resetPasswordToken) {
            return res.status(400).json({ message: "Invalid or expired token" });
        }

        const isTokenValid = await bcrypt.compare(token, user.resetPasswordToken);
        if (!isTokenValid || user.resetPasswordExpires < Date.now()) {
            return res.status(400).json({ message: "Invalid or expired token" });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ message: "Password reset successful" });
    }),
    
    getPlan:asyncHandler(async(req,res)=>{
        const user=await User.findById(req.user.id)
        res.json(user.plan)
    })
};

module.exports = userController;