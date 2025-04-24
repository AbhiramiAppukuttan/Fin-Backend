const asyncHandler = require("express-async-handler");
const Notification = require("../models/notificationModel");
const Savings = require("../models/savingModel");
const User = require("../models/userModel");

// Function to check user subscription and savings limit
const checkSubscription = async (user, feature) => {
    if (user.subscriptionExpiry && user.subscriptionExpiry < new Date()) {
        throw new Error("Subscription expired. Renew to continue.");
    }

    console.log(feature === "savings", user.plan === "free");

    if (feature === "savings" && user.plan === "free") {
        const count = await Savings.countDocuments({ user: user._id });
        if (count >= 1) {
            throw new Error("Free users can only have 1 savings goal");
        }
    }
};

const savingsController = {
    // Create a savings goal
    setSavingsGoal: asyncHandler(async (req, res) => {
        const { goalAmount, savedAmount, targetDate, title } = req.body;
        const user = await User.findById(req.user.id); // Fetch user details

        await checkSubscription(user, "savings"); // Check if user can add savings

        const savingsGoal = new Savings({
            user: req.user.id,
            goalAmount,
            title,
            savedAmount: savedAmount || 0,
            targetDate,
            progress: savedAmount ? (savedAmount / goalAmount) * 100 : 0,
        });

        await Notification.create({
            user: user._id,
            message: `🔔 Savings added successfully`,
        });

        const createdGoal = await savingsGoal.save();
        if (!createdGoal) {
            throw new Error("Error creating savings");
        }

        res.send("Savings goal saved successfully");
    }),

    // Get all savings goals
    getSavingsGoals: asyncHandler(async (req, res) => {
        // Using `find` instead of `findOne` to return an array
        const savingsGoals = await Savings.find({ user: req.user.id });
        console.log(savingsGoals);
        
        // if (savingsGoals.length === 0) {
        //     return res.status(404).json({ message: "No savings goals found" });
        // }
        
        res.json(savingsGoals); // Now returns an array
    }),
    

    // Update a savings goal
    updateSavingsGoal: asyncHandler(async (req, res) => {
        const { _id, goalAmount, savedAmount, targetDate, title } = req.body; // Get ID from body
    
        console.log("Update Request Body:", req.body); // Debugging
    
        if (!_id) {
            return res.status(400).json({ message: "Missing savings goal ID" });
        }
    
        const savingsGoal = await Savings.findById(_id);
        if (!savingsGoal) {
            return res.status(404).json({ message: "Savings goal not found" });
        }
    
        // Update fields
        savingsGoal.title = title ?? savingsGoal.title;
        savingsGoal.goalAmount = goalAmount ?? savingsGoal.goalAmount;
        savingsGoal.savedAmount = savedAmount ?? savingsGoal.savedAmount;
        savingsGoal.targetDate = targetDate ?? savingsGoal.targetDate;
        savingsGoal.progress = (savingsGoal.savedAmount / savingsGoal.goalAmount) * 100;
    
        try {
            const updatedGoal = await savingsGoal.save();
            console.log("Updated Goal:", updatedGoal); // Debugging
            res.status(200).json(updatedGoal);
        } catch (error) {
            console.error("Error updating savings:", error);
            res.status(500).json({ message: "Server error", error: error.message });
        }
    }),
    


    // Delete a savings goal
    deleteSavingsGoal: asyncHandler(async (req, res) => {
        const { id } = req.params;
        const savingsGoal = await Savings.findById(id);

        if (!savingsGoal) {
            throw new Error("Savings goal not found");
        }

        await savingsGoal.deleteOne();
        res.send("Savings goal deleted successfully");
    }),
};

module.exports = savingsController;
