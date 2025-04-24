const asyncHandler = require("express-async-handler");
const Notification = require("../models/notificationModel");
const Transaction = require("../models/transactionModel");
const Savings = require("../models/savingModel");

const notificationController = {
    getUserNotifications: asyncHandler(async (req, res) => {
        const notifications = await Notification.find({ user: req.user.id, read: false }).sort({ date: -1 });
        res.send(notifications);
    }),

    markNotificationAsRead: asyncHandler(async (req, res) => {
        console.log("Received request:", req.body);
    
        const { id } = req.body;
        const notification = await Notification.findOne({ _id: id, user: req.user.id });
    
        if (!notification) {
            console.log("Notification not found.");
            return res.status(404).json({ error: "Notification not found." });
        }
    
        notification.read = true;
        await notification.save();
    
        console.log("Notification updated successfully.");
        res.json({ message: "Notification marked as read." });
    }),
   
    markAllNotificationsAsRead: asyncHandler(async (req, res) => {
        await Notification.updateMany({ user: req.user.id }, { read: true });
        res.send("All notifications marked as read.");
    }),

    deleteNotification: asyncHandler(async (req, res) => {
        const { id } = req.body;
        const notification = await Notification.findById(id);

        if (!notification) {
            throw new Error("Notification not found.");
        }

        await notification.deleteOne();
        res.send("Notification deleted successfully.");
    }),

    generateSpendingAnalysis: asyncHandler(async (req, res) => {
        const userId = req.user.id;
        const transactions = await Transaction.find({ user: userId });
    
        const expenseCategories = {};
        const totalExpenses = transactions
            .filter(transaction => transaction.type === "expense")
            .reduce((sum, transaction) => {
                expenseCategories[transaction.category] = (expenseCategories[transaction.category] || 0) + transaction.amount;
                return sum + transaction.amount;
            }, 0);
    
        const sortedExpenses = Object.entries(expenseCategories)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);
    
        const recurringExpenses = transactions.filter(transaction => transaction.isRecurring && transaction.type === "expense");
    
        let recommendations = [];
    
        if (sortedExpenses.length > 0) {
            sortedExpenses.forEach(([category, amount]) => {
                recommendations.push(`You spent heavily on ${category} ($${amount.toFixed(2)}). Consider tracking these expenses and reducing unnecessary spending.`);
                if (category.toLowerCase() === "dining out") {
                    recommendations.push("Try meal prepping or cooking at home to cut down food expenses.");
                }
                if (category.toLowerCase() === "entertainment") {
                    recommendations.push("Look for free or budget-friendly entertainment options to save more.");
                }
            });
        }
    
        if (recurringExpenses.length > 0) {
            recommendations.push("You have recurring expenses. Review subscriptions and automatic payments to check if any can be canceled or reduced.");
            const subscriptionExpenses = recurringExpenses.filter(txn => txn.category.toLowerCase().includes("subscription"));
            if (subscriptionExpenses.length > 0) {
                recommendations.push("Check your subscriptions. You may be paying for services you no longer use.");
            }
        }
    
        if (totalExpenses > 0) {
            recommendations.push("Consider using a budgeting app to track and manage your expenses efficiently.");
        }
    
        res.send({
            totalExpenses,
            topSpendingCategories: sortedExpenses,
            recommendations,
        });
    }),
    
    generateSavingsRecommendations: asyncHandler(async (req, res) => {
        const userId = req.user.id;
        const transactions = await Transaction.find({ user: userId });
        const savingsGoals = await Savings.find({ user: userId });
    
        const totalIncome = transactions
            .filter(transaction => transaction.type === "income")
            .reduce((sum, transaction) => sum + transaction.amount, 0);
    
        const totalExpenses = transactions
            .filter(transaction => transaction.type === "expense")
            .reduce((sum, transaction) => sum + transaction.amount, 0);
    
        const savingsAmount = totalIncome - totalExpenses;
        const savingsPercentage = totalIncome > 0 ? (savingsAmount / totalIncome) * 100 : 0;
    console.log( savingsAmount,savingsPercentage)
        let recommendations = [];
    
        if (savingsPercentage < 20) {
            recommendations.push("Your savings rate is below 20%. Try saving at least 20% of your income.");
            recommendations.push("Set up automatic transfers to your savings account to ensure consistent savings.");
        } else if (savingsPercentage > 30) {
            recommendations.push("You're saving over 30%! Consider investing or diversifying your savings for better growth.");
        }
    
        if (savingsAmount > 0 && savingsAmount < 500) {
            recommendations.push("You have some savings. Consider setting up an emergency fund with at least 3-6 months’ worth of expenses.");
        }
    
        if (savingsGoals.length > 0) {
            recommendations.push("You have active savings goals. Allocate more funds to achieve them faster.");
        } else {
            recommendations.push("You don’t have a savings goal set. Setting one can help you stay financially disciplined.");
        }
    
        if (totalIncome > 0 && savingsPercentage > 10) {
            recommendations.push("Consider investing in a retirement fund or stocks to grow your wealth over time.");
        }
    
        if (totalIncome > 0 && totalExpenses > totalIncome) {
            recommendations.push("Your expenses exceed your income! Consider reducing unnecessary expenses or finding additional income sources.");
        }
    
        if (totalIncome > 0 && totalExpenses < totalIncome) {
            recommendations.push("You're spending less than you earn! Make the most of it by saving or investing wisely.");
        }
    
        res.send({
            totalIncome,
            totalExpenses,
            savingsPercentage: savingsPercentage.toFixed(2),
            recommendations,
        });
    }),
    
};

module.exports = notificationController;
