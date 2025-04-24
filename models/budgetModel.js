const mongoose = require("mongoose");

const budgetSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" },
  category: { 
    type:String,
  },
  limit: { 
    type:Number,
  },
  spent: { 
    type:Number
  },
  frequency: { 
    type: String, 
    enum: ["weekly", "monthly", "yearly"], 
    required: true 
  },
  startDate: { 
    type: Date, 
  },
  endDate: { 
    type: Date, 
    required: true 
  }
});

// const Budget = mongoose.model("Budget", budgetSchema);
const Budget = mongoose.models.Budget || mongoose.model("Budget", budgetSchema);
module.exports = Budget;
