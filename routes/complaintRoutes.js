const express = require("express");
const userAuthentication = require("../middlewares/userAuthentication");
const adminAuthentication = require("../middlewares/admin");
const complaintController = require("../controllers/complaintController");

const complaintRouter = express.Router();

complaintRouter.post("/add", userAuthentication, complaintController.fileComplaint);
complaintRouter.get("/get", userAuthentication, complaintController.getUserComplaints);
complaintRouter.get("/viewall", userAuthentication, adminAuthentication,complaintController.getAllComplaints);
complaintRouter.put("/update", userAuthentication, adminAuthentication,complaintController.updateComplaintStatus);

module.exports = complaintRouter;
