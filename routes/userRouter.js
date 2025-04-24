const express = require("express");
const userAuthentication = require("../middlewares/userAuthentication");
// const userController = require("../Controllers/userController");
const userController = require("../controllers/userController");
const userRoutes = express.Router();

userRoutes.post("/register", userController.register);
userRoutes.post("/login", userController.login);
userRoutes.put("/edit", userAuthentication,userController.profile);
userRoutes.delete("/logout", userController.logout);
userRoutes.get("/view", userAuthentication,userController.getUserProfile);
userRoutes.post("/forgot", userController.forgotPassword);
userRoutes.put("/change", userController.changePassword);
userRoutes.post("/reset", userController.resetPassword);
userRoutes.get("/getplan",userAuthentication, userController.getPlan);


module.exports = userRoutes;
