// const express = require("express");
// const userAuthentication = require("../Middlewares/userAuthentication");
// const budgetController = require("../Controllers/budgetController");
// const twilioClient = require("../Middlewares/twilio");
// const budgetRoutes = express.Router();

// budgetRoutes.post("/add",userAuthentication,budgetController.createBudget);
// budgetRoutes.get("/viewall",userAuthentication,budgetController.getBudgets);
// budgetRoutes.put("/update",userAuthentication, twilioClient,budgetController.updateBudget);
// budgetRoutes.delete("/delete/:id",userAuthentication,budgetController.deleteBudget);

// module.exports = budgetRoutes;




const express = require("express");
const userAuthentication = require("../middlewares/userAuthentication");
const twilioClient = require("../middlewares/twilio");
const budgetController = require("../controllers/budgetController");
const budgetRoutes = express.Router();

budgetRoutes.post("/add",userAuthentication,budgetController.createBudget);
budgetRoutes.get("/viewall",userAuthentication,budgetController.getBudgets);
budgetRoutes.put("/update",userAuthentication, twilioClient,budgetController.updateBudget);
budgetRoutes.delete("/delete/:id",userAuthentication,budgetController.deleteBudget);

module.exports = budgetRoutes;