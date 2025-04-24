const asyncHandler = require("express-async-handler");
const Payment = require("../models/paymentModel");
const Stripe = require("stripe");
const User = require("../models/userModel");
 require("dotenv").config();
 
 const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
 
 const paymentController = {
     // Get all payments for a user
     getPayments: asyncHandler(async (req, res) => {
         const payments = await Payment.find({ user: req.user.id })
             .populate('user')
             .sort({ createdAt: -1 });
         res.json(payments);
     }),
 
     // Get a single payment by ID
     getPaymentById: asyncHandler(async (req, res) => {
         const { id } = req.body;
         const payment = await Payment.findById(id).populate('user');
 
         if (!payment) {
             res.status(404);
             throw new Error("Payment not found");
         }
 
         res.json(payment);
     }),
 
     // Update payment status (for admin purposes)
     updatePaymentStatus: asyncHandler(async (req, res) => {
         const { id, status } = req.body;
         const payment = await Payment.findById(id);
 
         if (!payment) {
             res.status(404);
             throw new Error("Payment not found");
         }
 
         payment.paymentStatus = status;
         await payment.save();
         res.json(payment);
     }),
 
     // Process payment using Stripe
     processPayment: asyncHandler(async (req, res) => {
         const { plan, amount } = req.body;
         const payment = await Payment.create({
            user:req.user.id,
            amount,
            paymentStatus:'completed'
         })
         const user=await User.findById(req.user.id)
       

         user.plan=plan
         user.subscribed=true
         await user.save()
         try {
             const paymentIntent = await stripe.paymentIntents.create({
                 amount: amount * 100,
                 currency:'USD',
                 metadata: { userId: payment.user.toString() },
             });
             console.log("Payment Intent Created:", paymentIntent);

             payment.transactionId = paymentIntent.id;
             await payment.save();
 
             res.json({ clientSecret: paymentIntent.client_secret });
         } catch (error) {
             res.status(500).json({ error: error.message });
         }
     }),
 
     // Handle Stripe webhook events
     webhook: asyncHandler(async (req, res) => {
         const sig = req.headers['stripe-signature'];
         let event;
 
         try {
             event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_KEY);
         } catch (err) {
             return res.status(400).send(`Webhook Error: ${err.message}`);
         }
 
         switch (event.type) {
             case 'payment_intent.succeeded':
             case 'checkout.session.completed':
                 const payment=await Payment.findOneAndUpdate(
                     { transactionId: event.data.object.id },
                     { paymentStatus: 'completed' }
                 );
                 if (payment) {
                     const user = await User.findById(payment.user);
                     user.plan = payment.metadata.plan;
                     user.subscriptionExpiry = new Date();
                     user.subscriptionExpiry.setMonth(user.subscriptionExpiry.getMonth() + 1);
                     await user.save();
                 }
                 return res.status(200).send('✅ Payment Completed');
             default:
                 return res.status(200).send('Webhook received');
         }
     })
 };
 
 module.exports = paymentController;