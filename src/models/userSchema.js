const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  googleId: {
    type: String,
    default: "",
  },
  availableBalance: {
    type: Number,
    default: 0,
  },
  stakingBalance: {
    type: Number,
    default: 0,
  },
  availableBurningBalance: {
    type: Number,
    default: 0,
  },
  lastCheckIn: {
    type: Date,
    index: true,
  },
  streak: {
    type: Number,
    default: 0,
  },
  daysOff: {
    type: Number,
    default: 0,
  },
  level: {
    type: Number,
    default: 0,
  },
  tier1Referrals: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  tier2Referrals: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  referrals: {
    type: Number,
    default: 0,
  },
  rank: {
    type: Number,
    default: 0,
  },
  badges: [
    {
      type: String,
      default: "",
    },
  ],
  invitationCode: {
    type: String,
    default: "",
  },
  inviter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  miningSessions: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MiningSession",
    },
  ],
  stakings: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staking",
    },
  ],
  qrCodePath: {
    type: String,
    default: "",
  },
  photo: {
    type: String,
    default: "",
  },
  fcmToken: {
    type: String,
    default: "",
  },
  enableNotification: { //push notifications
    type: Boolean,
    default: true,
  },
  enableEmailNotification: {
    type: Boolean,
    default: true,
  },
  kyc: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "KYC",
  },
  progress: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Progress",
  },
  twitterUsername:{
    type : String,
    default: ""
  },
  telegramUsername:{
    type : String,
    default: ""
  }
});

// userSchema.pre("remove", async function (next) {
//   const deletedUserId = this._id;
//     console.log("here", deletedUserId)
//   await this.model("User").updateMany(
//     { tier1Referrals: deletedUserId },
//     { $pull: { tier1Referrals: deletedUserId } }
//   );
//   await this.model("User").updateMany(
//     { tier2Referrals: deletedUserId },
//     { $pull: { tier2Referrals: deletedUserId } }
//   );
//   await MiningSession.deleteMany({userId: deletedUserId})
//   next();
// });

module.exports = mongoose.model("User", userSchema);
