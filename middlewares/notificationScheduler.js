const cron = require("node-cron");
const Savings = require("../models/savingModel");
const Transaction = require("../models/transactionModel");
const Notification = require("../models/notificationModel");
const moment = require("moment");

// Schedule the job to run daily at midnight
cron.schedule("0 0 * * *", async () => {
    console.log("Running scheduled job for savings goals and recurring expenses...");

    const today = moment().startOf("day");
    const tomorrow = moment().add(1, "day").startOf("day");

    try {
        // Fetch savings goals
        const savingsGoals = await Savings.find();
        const notifications = [];

        for (const goal of savingsGoals) {
            const targetDate = moment(goal.targetDate).startOf("day");
            const progress = (goal.savedAmount / goal.goalAmount) * 100;

            if (targetDate.isSame(tomorrow)) {
                notifications.push({
                    user: goal.user,
                    message: `⏳ Reminder: Your savings goal of $${goal.goalAmount} is due tomorrow!`,
                });
            }

            if (targetDate.isBefore(today) && progress < 100) {
                notifications.push({
                    user: goal.user,
                    message: `⚠️ You missed your savings goal deadline! You saved ${progress.toFixed(1)}%. Consider adjusting your plan.`,
                });
            }
        }

        // Fetch all recurring expenses that are due tomorrow
        const recurringTransactions = await Transaction.find({ 
            type: "expense", 
            isRecurring: true 
        });

        const transactionUpdates = [];
        const newTransactions = [];

        for (const transaction of recurringTransactions) {
            let nextDueDate = moment(transaction.nextDueDate);

            if (transaction.recurrenceInterval === "daily") {
                // Directly add a new transaction for today's date
                newTransactions.push({
                    user: transaction.user,
                    amount: transaction.amount,
                    category: transaction.category,
                    type: "expense",
                    date: today.toDate(),
                    isRecurring: false, // Mark the new expense as non-recurring
                    description: transaction.description || "Recurring Expense",
                });

                // Set next due date to tomorrow
                nextDueDate.add(1, "day");
            } else if (nextDueDate.isSame(tomorrow)) {
                // Send notification for non-daily expenses due tomorrow
                notifications.push({
                    user: transaction.user,
                    message: `💳 Reminder: Your recurring expense of $${transaction.amount} for ${transaction.category} is due tomorrow.`,
                });

                // Update next due date for non-daily expenses
                switch (transaction.recurrenceInterval) {
                    case "weekly":
                        nextDueDate.add(1, "week");
                        break;
                    case "monthly":
                        nextDueDate.add(1, "month");
                        break;
                    case "yearly":
                        nextDueDate.add(1, "year");
                        break;
                }
            }

            // Update nextDueDate for all recurring expenses
            transactionUpdates.push({
                updateOne: {
                    filter: { _id: transaction._id },
                    update: { nextDueDate: nextDueDate.toDate() }
                }
            });
        }

        // Bulk insert new transactions for daily expenses
        if (newTransactions.length > 0) {
            await Transaction.insertMany(newTransactions);
        }

        // Bulk insert notifications for non-daily expenses
        if (notifications.length > 0) {
            await Notification.insertMany(notifications);
        }

        // Bulk update recurring transactions' next due dates
        if (transactionUpdates.length > 0) {
            await Transaction.bulkWrite(transactionUpdates);
        }

        console.log("Scheduled job completed successfully.");
    } catch (error) {
        console.error("Error in scheduled job:", error);
    }
});