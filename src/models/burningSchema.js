const mongoose = require("mongoose");

const burningSchema = mongoose.Schema({
    createdAt: {
        type: Date,
        default: new Date(),
    },
    amount: {
        type: Number,
        default: 0
    }    
})

module.exports = mongoose.model("Burning", burningSchema);