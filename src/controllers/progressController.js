const Progress = require("../models/progressSchema");
const User = require("../models/userSchema");
const constants = require("../constants");

async function getProgress(req, res) {
  try {
    const user = await User.findById(req.user.user).populate("progress");
    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }
    return res.status(200).json({
      progress: user.progress,
    });
  } catch (error) {
    res.status(500).json({
      message: "An error occured!",
    });
  }
}

async function followOnTwitter(req, res) {
  try {
    const user = await User.findById(req.user.user);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }
    const bonus = 10 * constants.baseMiningRate;
    const progress = await Progress.findById(user.progress);
    progress.followedOnTwitter = true;
    await progress.save();
    sendNotificationOnProgress(user._id, user._id, type = "twitter", bonus = bonus)
    return res.status(200).json({
      progress: user.progress,
    });
  } catch (error) {
    res.status(500).json({
      message: "An error occured!",
    });
  }
}

async function followOnTelegram(req, res) {
    try {
      const user = await User.findById(req.user.user);
      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }
      const bonus = 10 * constants.baseMiningRate;
      const progress = await Progress.findById(user.progress);
      progress.followedOnTelegram = true;
      await progress.save();
      sendNotificationOnProgress(user._id, user._id, type = "telegram", bonus = bonus)
      return res.status(200).json({
        progress: user.progress,
      });
    } catch (error) {
      res.status(500).json({
        message: "An error occured!",
      });
    }
  }

module.exports = { getProgress, followOnTwitter, followOnTelegram };
