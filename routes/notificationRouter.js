const express = require("express");
 const userAuthentication = require("../middlewares/userAuthentication");
const notificationController = require("../controllers/notificationController");
 const notificationRouter = express.Router();
 
 notificationRouter.get("/viewall",userAuthentication,notificationController.getUserNotifications);
 notificationRouter.put("/update",userAuthentication,notificationController.markNotificationAsRead);
 notificationRouter.put("/readall",userAuthentication,notificationController.markAllNotificationsAsRead);
 notificationRouter.delete("/delete",userAuthentication,notificationController.deleteNotification);
 notificationRouter.get("/savings",userAuthentication,notificationController.generateSavingsRecommendations);
 notificationRouter.get("/spending",userAuthentication,notificationController.generateSpendingAnalysis);
 
 module.exports = notificationRouter;