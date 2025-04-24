const asyncHandler = require("express-async-handler");
const Budget = require("../models/budgetModel");
const Notification = require("../models/notificationModel");
const User = require("../models/userModel");

// ✅ Fix: `checkSubscription` now correctly handles async behavior
const checkSubscription = async (user, feature) => {
    if (user.subscriptionExpiry && user.subscriptionExpiry < new Date()) {
        throw new Error("Subscription expired. Renew to continue.");
    }
    if (feature === "budget" && user.plan === "free") {
        const count = await Budget.countDocuments({ user: user._id }); // ✅ Fix: Added `await`
        if (count >= 1) throw new Error("Free users can only have 1 budget");
    }
};

const budgetController = {
    createBudget: asyncHandler(async (req, res) => {
        const { category, limit, frequency, spent,startDate } = req.body;
        const userId = req.user.id;
        const user = await User.findById(userId);
        await checkSubscription(user, "budget");

        // ✅ Fix: Validate `startDate`
        if (!startDate || isNaN(new Date(startDate))) {
            throw new Error("Invalid startDate");
        }

        // ✅ Fix: Removed `spent` from duplicate check
        const existingBudget = await Budget.findOne({
            user: userId,
            category,
            frequency,
            startDate
        });


        if (existingBudget) {
            throw new Error("Budget for this category and period already exists");
        }

        let endDate;
        switch (frequency) {
            case "weekly":
                endDate = new Date(startDate);
                endDate.setDate(endDate.getDate() + 6);
                break;
            case "monthly":
                endDate = new Date(startDate);
                endDate.setMonth(endDate.getMonth() + 1);
                endDate.setDate(0);
                break;
            case "yearly":
                endDate = new Date(startDate);
                endDate.setFullYear(endDate.getFullYear() + 1);
                endDate.setDate(0);
                break;
            default:
                throw new Error("Invalid frequency. Choose 'weekly', 'monthly', or 'yearly'.");
        }

        const budget = new Budget({
            user: userId,
            category,
            limit,
            spent: spent || 0,
            frequency,
            startDate,
            endDate
        });

        console.log("🚀 Saving budget:", budget);
        const createdBudget = await budget.save();
        console.log("✅ Budget saved successfully:", createdBudget);

        if (!createdBudget) {
            throw new Error("Error saving budget");
        }

        // ✅ Fix: Use `userId` instead of `user` object
        await Notification.create({
            user: userId,
            message: `🔔 Budget added successfully`,
        });

        res.send("Budget created successfully");
    }),

    getBudgets: asyncHandler(async (req, res) => {
        const getBudget = await Budget.find({ user: req.user.id });

        // console.log(getBudget);
        // if (getBudget.length === 0) {
        //     return res.status(404).json({ message: "No budgets found" });
        // }

        res.status(200).json(getBudget);
    }),

    updateBudget: asyncHandler(async (req, res) => {
        const { id, category, limit, spent, frequency, startDate } = req.body;

        const budget = await Budget.findById(id);
        if (!budget) {
            throw new Error("Budget not found");
        }

        budget.category = category || budget.category;
        budget.limit = limit || budget.limit;
        budget.spent = spent || budget.spent;
        budget.frequency = frequency || budget.frequency;
        budget.startDate = startDate || budget.startDate;
        budget.alert = (budget.limit / budget.spent) * 100;

        if (startDate || frequency) {
            let newEndDate;
            switch (budget.frequency) {
                case "weekly":
                    newEndDate = new Date(budget.startDate);
                    newEndDate.setDate(newEndDate.getDate() + 6);
                    break;
                case "monthly":
                    newEndDate = new Date(budget.startDate);
                    newEndDate.setMonth(newEndDate.getMonth() + 1);
                    newEndDate.setDate(0);
                    break;
                case "yearly":
                    newEndDate = new Date(budget.startDate);
                    newEndDate.setFullYear(newEndDate.getFullYear() + 1);
                    newEndDate.setDate(0);
                    break;
                default:
                    throw new Error("Invalid frequency. Choose 'weekly', 'monthly', or 'yearly'.");
            }
            budget.endDate = newEndDate;
        }

        const updatedBudget = await budget.save();
        if (!updatedBudget) {
            throw new Error("Error updating budget");
        }

        const spendingPercentage = (budget.spent / budget.limit) * 100;
        if (spendingPercentage >= 80) {
            await Notification.create({
                user: budget.user,
                message: `🔔 Warning: You're at ${spendingPercentage.toFixed(1)}% of your budget for ${budget.category}.`,
            });

            const messageBody = `🔔 Warning: You're at ${spendingPercentage.toFixed(1)}% of your budget for ${budget.category}.`;
            const client = req.client;
            const user = await User.findById(budget.user);

            if (user.phone) {
                const number = "+91" + user.phone;
                await client.messages.create({
                    body: messageBody,
                    from: req.number,
                    to: number,
                });
            }
        }

        res.send("Budget updated successfully");
    }),

    deleteBudget: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const budget = await Budget.findById(id);
        if (!budget) {
            throw new Error("Budget not found");
        }

        await budget.deleteOne();
        res.send("Budget deleted successfully");
    })
};

module.exports = budgetController;
