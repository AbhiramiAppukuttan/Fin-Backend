const express=require('express');
const testController = require('../Controllers/testController');
const testRouter=express.Router()

testRouter.post("/create",testController.create)
testRouter.get("/find",testController.find)
testRouter.put("/update",testController.update)
testRouter.delete("/delete",testController.delete)

module.exports=testRouter;