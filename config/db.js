require("dotenv").config();
const mongoose = require("mongoose");


var mongoConnection =  ()=>{
    const db = "mongodb+srv://torqnetwork:torqnetwork@cluster0.imrsvcc.mongodb.net/torqnetwork?retryWrites=true&w=majority";
    mongoose.connect(db)
    .then( ()=> console.log("Connected to MongoDB!")
    ). catch((err)=> console.log(err)); 
}


module.exports = {mongoConnection};

