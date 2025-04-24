const axios = require("axios");
 require("dotenv").config()
 const checkSubscription = (user, feature) => {
     if (user.subscriptionExpiry && user.subscriptionExpiry < new Date()) {
         throw new Error("Subscription expired. Renew to continue.");
     }
     if (feature === "currency" && user.plan !== "premium") {
         throw new Error("Currency conversion is only available for Premium users");
     }
 };
 
 const convertCurrency = async (req,res) => {
     const {fromCurrency, toCurrency, amount}=req.body
     await checkSubscription(user, "currency");
     try {
         const response = await axios.get(`${process.env.CURRENCY_BASE_URL}/${process.env.CURRENCY_API_KEY}/latest/${fromCurrency}`);
         const rates = response.data.conversion_rates;
 
         if (!rates[toCurrency]) {
             throw new Error("Invalid target currency");
         }
 
         const convertedAmount = amount * rates[toCurrency];
         res.send({ convertedAmount, rate: rates[toCurrency] })
     } catch (error) {
         throw new Error("Currency conversion failed");
     }
 };
 
 module.exports = convertCurrency ;