const asyncHandler = require("express-async-handler");
 const Transaction = require("../models/transactionModel");
 const User = require("../models/userModel");
 const Notification = require("../models/notificationModel");
 const axios = require("axios");
const Budget = require("../models/budgetModel");
const Savings = require("../models/savingModel");
     require("dotenv").config()
 
     const checkSubscription = (user, feature) => {
         if (user.subscriptionExpiry && user.subscriptionExpiry < new Date()) {
             throw new Error("Subscription expired. Renew to continue.");
         }
         if (feature === "recurring" && user.plan == "free") {
             throw new Error("Recurring transactions are only available for Premium users");
         }
     };
 
 const transactionController = {
     addTransaction: asyncHandler(async (req, res) => {
         const { type, amount, category, date, description, isRecurring, recurrenceInterval, savings_goal } = req.body;
         const userId = req.user.id;
         if (!amount || !category || !date || !type) {
             throw new Error("Amount, category, date, and type are required.");
         }
         const user=await User.findById(userId)
         if(!user.verified){
             throw new Error("User not verified")
         }
         await checkSubscription(user, isRecurring ? "recurring" : "transaction");
         let nextDueDate = null;
         if (isRecurring && recurrenceInterval) {
             const startDate = new Date(date);
             switch (recurrenceInterval) {
                 case "daily":
                     nextDueDate = new Date(startDate.setDate(startDate.getDate() + 1));
                     break;
                 case "weekly":
                     nextDueDate = new Date(startDate.setDate(startDate.getDate() + 7));
                     break;
                 case "monthly":
                     nextDueDate = new Date(startDate.setMonth(startDate.getMonth() + 1));
                     break;
                 case "yearly":
                     nextDueDate = new Date(startDate.setFullYear(startDate.getFullYear() + 1));
                     break;
                 default:
                     throw new Error("Invalid recurrence interval.");
             }
         }
 
         const transaction = new Transaction({
             user: userId,
             type,
             amount,
             category,
             date,
             description: description || '',
             isRecurring: isRecurring || false,
             recurrenceInterval: isRecurring ? recurrenceInterval : null,
             nextDueDate,
         });
 
         if (req.file) {
             transaction.receiptUrl = req.file.path;
         }
 
         if (type === "income" && savings_goal) {
             const savingsGoal = await Savings.findOne({ title: savings_goal });
             if (savingsGoal) {
                 transaction.savings_goal = savingsGoal.id;
                 savingsGoal.savedAmount = (savingsGoal.savedAmount || 0) + amount;
                 savingsGoal.progress = ((savingsGoal.savedAmount / savingsGoal.goalAmount) * 100).toFixed(2);
                 await savingsGoal.save();
                 await transactionController.sendSavingsNotifications(savingsGoal);
             }
         }
 
         if (type === "expense") {
             const budget = await Budget.findOne({
                 user: userId,
                 category,
                 startDate: { $lte: new Date(date) },
                 endDate: { $gte: new Date(date) }
             });
 
             if (budget) {
                 budget.spent = (budget.spent || 0) + amount;
                 await budget.save();
                 await transactionController.sendBudgetNotifications(budget);
             }
         }
         await Notification.create({
                 user: user,
                 message: `🔔 Transaction added successfully`,
             });
         const savedTransaction = await transaction.save();
         res.send("Transaction saved successfully.");
     }),
 
     getTransactions: asyncHandler(async (req, res) => {
         const transactions = await Transaction.find({ user: req.user.id });
 
         if (!transactions || transactions.length === 0) {
             return res.status(404).json({ message: "No transactions found" });
         }
 
         res.status(200).json(transactions);
     }),
 
     filterTransactions: asyncHandler(async (req, res) => {
         const userId= req.user.id; 
 
         let { type, category, minAmount, maxAmount, startDate, endDate, keyword } = req.body;
         const filter = { user: userId }; 
         if (type && ["income", "expense"].includes(type)) {
             filter.type = type;
         }
         if (category) {
             filter.category = category;
         }
         if (minAmount || maxAmount) {
             filter.amount = {};
             if (minAmount) filter.amount.$gte = parseFloat(minAmount);
             if (maxAmount) filter.amount.$lte = parseFloat(maxAmount);
         }
         if (startDate || endDate) {
             filter.date = {};
             if (startDate) filter.date.$gte = new Date(startDate);
             if (endDate) filter.date.$lte = new Date(endDate);
         }
         if (keyword) {
             filter.description = { $regex: keyword, $options: "i" }; // Case-insensitive search
         }
 
         const transactions = await Transaction.find(filter).sort({ date: -1 });
 
         res.status(200).json({ success: true, transactions });
     }),
 
     updateTransaction: asyncHandler(async (req, res) => {
         const { id, amount, category, date, isRecurring, recurrenceInterval,type } = req.body;
         const transaction = await Transaction.findById(id);
         if (!transaction) throw new Error("Transaction record not found.");
 
         if (transaction.type === "expense") {
             const prevBudget = await Budget.findOne({ user: req.user.id, category: transaction.category });
             if (prevBudget) {
                 prevBudget.spent = Math.max(0, prevBudget.spent - transaction.amount);
                 await prevBudget.save();
             }
         }
 
         let nextDueDate = transaction.nextDueDate;
         if (isRecurring && recurrenceInterval) {
             const startDate = new Date(date || transaction.date);
             switch (recurrenceInterval) {
                 case "daily": nextDueDate = new Date(startDate.setDate(startDate.getDate() + 1)); break;
                 case "weekly": nextDueDate = new Date(startDate.setDate(startDate.getDate() + 7)); break;
                 case "monthly": nextDueDate = new Date(startDate.setMonth(startDate.getMonth() + 1)); break;
                 case "yearly": nextDueDate = new Date(startDate.setFullYear(startDate.getFullYear() + 1)); break;
                 default: throw new Error("Invalid recurrence interval.");
             }
         } else {
             nextDueDate = null;
         }
 
         transaction.amount = amount;
         transaction.category = category;
         transaction.date = date;
         transaction.type = type;
         transaction.isRecurring = isRecurring;
         transaction.recurrenceInterval = recurrenceInterval;
         transaction.nextDueDate = nextDueDate;
         await transaction.save();
 
         res.send({ message: "Transaction updated successfully.", transaction });
     }),
 
     deleteTransaction: asyncHandler(async (req, res) => {
         const { id } = req.params;
         const transaction = await Transaction.findById(id);
         if (!transaction) throw new Error("Transaction record not found.");
 
         if (transaction.type === "expense") {
             const budget = await Budget.findOne({ user: req.user.id, category: transaction.category });
             if (budget) {
                 budget.spent = Math.max(0, budget.spent - transaction.amount);
                 await budget.save();
             }
         }
 
         await Transaction.deleteOne({ _id: id });
         res.send({ message: "Transaction deleted successfully." });
     }),
 
     sendBudgetNotifications: async (budget) => {
         const spendingPercentage = (budget.spent / budget.limit) * 100;
         if (spendingPercentage >= 80) {
             await Notification.create({ user: budget.user, message: `Warning: ${spendingPercentage.toFixed(1)}% of your budget for ${budget.category} is used.` });
         }
     },
 
     sendSavingsNotifications: async (savingsGoal) => {
         const progress = savingsGoal.progress;
         if (progress >= 100) {
             await Notification.create({ user: savingsGoal.user, message: `🎉 Congratulations! Savings goal reached: ${savingsGoal.goalAmount}.` });
             const messageBody = `🎉 Congratulations! Savings goal reached: ${savingsGoal.goalAmount}.`;
 
         const client=req.client
                     const user=await User.findById(savingsGoal.user) 
                         if (user.phone) {
                             const number="+91"+user.phone
                             await client.messages.create({
                                 body: messageBody,
                                 from: req.number,
                                 to: number,
                             });
                         }
         } else if (progress >= 80) {
             await Notification.create({ user: savingsGoal.user, message: `🔔 Almost there! ${progress}% of savings goal completed.` });
             const messageBody = `🔔 Almost there! ${progress}% of savings goal completed.`;
 
                     const client=req.client
                                 const user=await User.findById(savingsGoal.user) 
                                     if (user.phone) {
                                         const number="+91"+user.phone
                                         await client.messages.create({
                                             body: messageBody,
                                             from: req.number,
                                             to: number,
                                         });
                                     }
         } else if (progress >= 50) {
             await Notification.create({ user: savingsGoal.user, message: `🌱 Halfway there! ${progress}% of savings goal completed.` });
             const messageBody = `🌱 Halfway there! ${progress}% of savings goal completed.`;
 
                     const client=req.client
                                 const user=await User.findById(savingsGoal.user) 
                                     if (user.phone) {
                                         const number="+91"+user.phone
                                         await client.messages.create({
                                             body: messageBody,
                                             from: req.number,
                                             to: number,
                                         });
                                     }
         }
     },
 
 
     convertCurrency : asyncHandler(async (req,res) => {
         const {fromCurrency, toCurrency, amount}=req.body
             const response = await axios.get(`${process.env.CURRENCY_BASE_URL}/${process.env.CURRENCY_API_KEY}/latest/${fromCurrency}`);
             const rates = response.data.conversion_rates;            
             if (!rates[toCurrency]) {
                 throw new Error("Invalid target currency");
             }
 
             const convertedAmount = amount * rates[toCurrency];
             res.send({ convertedAmount, rate: rates[toCurrency] })
            })
        };
        
        module.exports = transactionController;