const mongoose = require("mongoose");

const savingsGoalSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User" ,
        require:true
    },
    title:{
        type:String,
        require:true,
    },
    goalAmount: { 
        type: Number,
        require:true
    },
    savedAmount:{ 
        type:  Number,
    },
    targetDate: { 
        type: Date,
        require:true
    },
    progress: { 
        type: Number
    },
});

const Savings = mongoose.models.Savings || mongoose.model("Savings", savingsGoalSchema);

module.exports = Savings;