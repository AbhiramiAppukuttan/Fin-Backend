const express=require("express");
const userRoutes = require("./userRouter");
const passport = require("passport");
const budgetRoutes = require("./budgetRouter");
const savingsRoutes = require("./savingsRouter");
const notificationRouter = require("./notificationRouter");
const transactionRoutes = require("./transactionRoutes");
const paymentRoutes = require("./paymentRoutes");
const adminRoutes = require("./adminRouter");
const complaintRouter = require("./complaintRoutes");
const router=express()

router.use("/payment", paymentRoutes);

router.use(express.json())

router.use("/users", userRoutes);
router.use("/admin", adminRoutes);
router.use("/complaint", complaintRouter);
router.use("/transaction", transactionRoutes);
router.use("/budget", budgetRoutes);
router.use("/savings", savingsRoutes);
router.use("/notification", notificationRouter);
router.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));
// router.get("/auth/google/callback",passport.authenticate("google", { failureRedirect: "/" }),userController.googleRegister);


module.exports=router
