const Progress = require("../models/progressSchema");
const User = require("../models/userSchema");
const constants = require("../constants");
const {sendNotificationOnProgress} = require("../../utils/notifications")

async function getProgress(req, res) {
  try {
    const user = await User.findById(req.user.user).populate("progress");
    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }
     res.status(200).json({
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
    const username = req.body.username;
    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }
    const newBonus = 10 * constants.baseMiningRate;
    const progress = await Progress.findById(user.progress);
    progress.followedOnTwitter = true;
    await progress.save();
    user.availableBalance += newBonus;
    user.twitterUsername = username;
    await user.save();
    sendNotificationOnProgress(user._id, user._id, type = "twitter", bonus = newBonus)
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
      const username = req.body.username;
      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }
      const newBonus = 10 * constants.baseMiningRate;
      const progress = await Progress.findById(user.progress);
      progress.followedOnTelegram = true;
      await progress.save();
      user.availableBalance += newBonus;
      user.telegramUsername = username;
      await user.save();
      sendNotificationOnProgress(user._id, user._id, type = "telegram", bonus = newBonus)
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
