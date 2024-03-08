const mongoose = require("mongoose");

const notificationSchema = mongoose.Schema({
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    receiverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    message: {
        title: {
            type: String
        },
        body: {
            type: String
        }
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    notificationType: {
        type: String,
        default: ""
    }
});

module.exports = mongoose.model("Notification", notificationSchema);
