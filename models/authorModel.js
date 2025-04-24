const { default: mongoose } = require("mongoose");

const authorSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: true 
    },
    bio: {
         type: String 
        },
    birthdate: {
         type: Date 
    }
  });
  
  const Author = mongoose.model('Author', authorSchema);
  module.exports = Author;




