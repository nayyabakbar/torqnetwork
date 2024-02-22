const mongoose = require("mongoose");

const progressSchema = mongoose.Schema({
    startedEarning: {
        type: Boolean,
        default: false,
    },
    addedPhoto: {
        type: Boolean,
        default: false,
    },
    followedOnTwitter: {
        type: Boolean,
        default: false,
    },
    followedOnTelegram: {
        type: Boolean,
        default: false,
    },
    invitedFriends: {
        type: Boolean,
        default: false,
    },  
})

module.exports = mongoose.model("Progress", progressSchema);



