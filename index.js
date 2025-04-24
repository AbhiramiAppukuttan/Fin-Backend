require("dotenv").config();
require('./middlewares/notificationScheduler');
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const connectDB = require("./database/connectDB");
const cookieParser = require("cookie-parser")
const errorHandler = require("./middlewares/errorHandler");
// const router = require("./routes")
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const session=require('express-session');
const router = require("./routes");



const app = express();

connectDB()

app.use(cors({
    origin: 'https://fin-frontend-seven.vercel.app', 
    credentials: true, 
}));

app.use(cookieParser())
app.use(
    session({
        secret:"secret",
        resave:false,
        saveUninitialized:true
    })
)
// Update your Google Strategy configuration
passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/auth/google/callback",  // Changed to match your API route
        passReqToCallback: true
      },
      (req, accessToken, refreshToken, profile, done) => {
        // Handle user profile data
        return done(null, profile);
      }
    )
  );
  
  // Add these routes
  app.get('/auth/google', passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false
  }));
  
  app.get('/auth/google/callback', 
    passport.authenticate('google', { 
      failureRedirect: '/login',
      session: false 
    }),
    (req, res) => {
      // Successful authentication, redirect or send token
     res.redirect(`https://fin-frontend-seven.vercel.app/login`);
    }
  );
app.use(router)
app.use(errorHandler)
app.options("*", cors())

app.listen(process.env.PORT, () => console.log(`Server running on port ${process.env.PORT}`));
