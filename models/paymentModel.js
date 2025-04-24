// const mongoose = require('mongoose');

// const paymentSchema = new mongoose.Schema({
//     user: { 
//         type: mongoose.Schema.Types.ObjectId, 
//         ref: 'User', 
//         required: true 
//     },
//     amount: { 
//         type: Number, 
//         required: true ,
//         default:500
//     },
//     paymentMethod: { 
//         type: String, 
//         enum: ['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'cash'], 
//         required: true 
//     },
//     paymentStatus: { 
//         type: String, 
//         enum: ['pending', 'completed', 'failed', 'refunded'], 
//         default: 'pending' 
//     },
//     transactionId: { 
//         type: String 
//     },
//     paymentDate: { 
//         type: Date, 
//         default: Date.now 
//     },
//     receiptUrl: { 
//         type: String 
//     }
// }, { timestamps: true });

// const Payment = mongoose.model('Payment', paymentSchema);
// module.exports = Payment;





const mongoose = require('mongoose');
 
 const paymentSchema = new mongoose.Schema({
     user: { 
         type: mongoose.Schema.Types.ObjectId, 
         ref: 'User', 
         required: true 
     },
     amount: { 
         type: Number, 
         required: true ,
         default:500
     },
     paymentMethod: { 
         type: String, 
         enum: ['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'cash'], 
     },
     paymentStatus: { 
         type: String, 
         enum: ['pending', 'completed', 'failed', 'refunded'], 
         default: 'pending' 
     },
     transactionId: { 
         type: String 
     },
     paymentDate: { 
         type: Date, 
         default: Date.now 
     },
     receiptUrl: { 
         type: String 
     }
    },
     
 { timestamps: true });
 
 const Payment = mongoose.model('Payment', paymentSchema);
 module.exports = Payment;