const twilio = require("twilio");
 require("dotenv").config();

 const accountSid = process.env.TWILIO_ACCOUNT_SID;
 const authToken = process.env.TWILIO_AUTH_TOKEN;
 const number=process.env.TWILIO_AUTH_NUMBER
 const client = new twilio(accountSid, authToken);
 const twilioClient=(req,res,next)=>{
    req.client=client
    req.number=number
    next()
  }
module.exports=twilioClient


// const twilio = require("twilio");
// require("dotenv").config();

// const accountSid = process.env.TWILIO_ACCOUNT_SID;
// const authToken = process.env.TWILIO_AUTH_TOKEN;
// const number=process.env.TWILIO_AUTH_NUMBER
// const client = new twilio(accountSid, authToken);

// const twilioClient=(req,res,next)=>{
//     req.client=client
//     req.number=number
//     next()
//   }
// module.exports=twilioClient
