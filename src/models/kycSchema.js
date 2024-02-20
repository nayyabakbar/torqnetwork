const mongoose = require("mongoose");

const kycSchema = mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    fullName: {
        type: String,
        default: "",
    },
    dob: {
        type: String,
        default: "",
    },
    phoneNo: {
        type: String,
        default: "",
    },
    panCardNo: {
        type: String,
        default: "",
    },
    country: {
        type: String,
        default: "",
    },
    postalCode: {
        type: String,
        default: "",
    },
    status: {
        type: String,
        default: "pending"
    },
    panCardFront: {
        type: String,
        default: "",
    },
    panCardBack: {
        type: String,
        default: "",
    },
    govDocFront: {
        type: String,
        default: "",
    },
    govDocBack: {
        type: String,
        default: "",
    }, 
    selfie: {
        type: String,
        default: "",
    },
       
})

module.exports = mongoose.model("KYC", kycSchema);



