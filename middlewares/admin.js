const express=require("express")
const User = require("../models/userModel")

const adminAuthentication=async(req,res,next)=>{
    const user=await User.findOne({_id:req.user.id})    
    if(user.role!=="admin"){
        return res.send("User not authenticated!")        
    }
    next()
}
module.exports=adminAuthentication