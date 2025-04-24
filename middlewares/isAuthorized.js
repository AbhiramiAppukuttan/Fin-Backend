const jwt = require("jsonwebtoken");
require('dotenv').config()

const isAuthorized=((req,res,next)=>{
    // console.log(req);
    const {token}=req.cookies
    console.log(token);
    if(!token){
        throw new Error( "Please Login" )
    }

    const decoded=jwt.verify(token,process.env.JWT_SECRET_KEY,)
    // if(decoded){
    //     res.send(decoded)                                                                                                                                 
    // }
    req.user=decoded

    next()

})
module.exports=isAuthorized