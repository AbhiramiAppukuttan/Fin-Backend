const express = require("express");
const userAuthentication = require("../middlewares/userAuthentication");
const paymentController = require("../controllers/paymentController");
const paymentRoutes = express.Router();

paymentRoutes.post("/webhook",  express.raw({ type: 'application/json' }), paymentController.webhook);
paymentRoutes.post("/checkout", userAuthentication,express.json() ,paymentController.processPayment);
paymentRoutes.put("/edit", userAuthentication,express.json() ,paymentController.updatePaymentStatus);
paymentRoutes.get("/viewall", userAuthentication,express.json() ,paymentController.getPayments);
paymentRoutes.get("/search", userAuthentication,express.json() ,paymentController.getPaymentById);

module.exports = paymentRoutes;