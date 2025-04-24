const sample=((req,res,next)=>{
    console.log("Middleware is running");
    next()
    
})

module.exports=sample