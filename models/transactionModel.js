const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User",
    required: true 
  },
  type: { 
    type: String, 
    enum: ["income", "expense"], 
    required: true 
  },
  amount: { 
    type: Number, 
    required: true 
  },
  category: { 
    type: String, 
    required: true 
  },
  date: { 
    type: Date, 
    required: true 
  },
  description: { 
    type: String 
  },
  savings_goal: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Savings" 
  },
  receiptUrl: { 
    type: String 
  },
  isRecurring: { 
    type: Boolean, 
    default: false 
  },
  recurrenceInterval: { 
    type: String, 
    enum: ["daily", "weekly", "monthly", "yearly"] 
  },
  nextDueDate: { 
    type: Date 
  }
});

// const Transaction = mongoose.model("Transaction", transactionSchema);
const Transaction = mongoose.models.Transaction || mongoose.model("Transaction", transactionSchema);

module.exports = Transaction;
