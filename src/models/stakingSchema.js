const mongoose = require("mongoose");

const stakingSchema = mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    createdAt: {
        type: Date,
        default: new Date(),
    },
    years: {
        type: Number,
        default: 0
    }, 
    percentage: {
        type: Number,
        default: 0
    }, 
    isActive: {
        type: Boolean,
        default: true
    },
    amount: {
        type: Number,
        default: 0
    }    
})

module.exports = mongoose.model("Staking", stakingSchema);