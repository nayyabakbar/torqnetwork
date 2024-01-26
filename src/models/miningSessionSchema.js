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
        },
        time: {
            type: Date,
            default: new Date () 
        }
    }],
    isActive: {
        type: Boolean,
        default: false
    },
    activeTier1Count: {
        type: Number,
        default: 0
    },
    activeTier2Count: {
        type: Number,
        default: 0
    }    
})

module.exports = mongoose.model("MiningSession", miningSessionSchema);



