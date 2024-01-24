const mongoose = require("mongoose");

const miningSessionSchema = mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    bonusWheel:{
        type: Number,
        default: 0
    },
    hourlyEarnings:[{
        earning:{
            type: Number
        },
        percentage:{
            type: Number
        }
    }],
    isActive: {
        type: Boolean,
        default: false
    }    
})

module.exports = mongoose.model("MiningSession", miningSessionSchema);