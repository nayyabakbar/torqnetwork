const jwt = require("jsonwebtoken");
const secretKey = require("../../config/secret");
const bcrypt = require("bcrypt");
const { hashSync, compareSync } = require("bcrypt");
const User = require("../models/userSchema");
const MiningSession = require("../models/miningSessionSchema");
const Staking = require("../models/stakingSchema");
const constants = require("../constants");
const crypto = require("crypto");
const Token = require("../models/tokenSchema");
const sendEmail = require("../../utils/sendEmail");
const schedule = require("node-schedule");
const badges = require("../badges");
const QrCode = require("qrcode");
const fs = require("fs").promises;
const path = require("path");
const cloudinary = require("../../config/cloudinary");

async function signUp(req, res) {
  try {
    const findUser = await User.findOne({ email: req.body.email });
    if (!findUser) {
      const user = new User({
        name: req.body.name,
        email: req.body.email,
        password: hashSync(req.body.password, 10),
      });
      const userInvitationCode = crypto.randomBytes(10).toString("hex");
      user.invitationCode = userInvitationCode;
      user.fcmToken = req.body.fcmToken;
      const saveUser = await user.save();
      const userId = saveUser._id;
      //Create QR Code For Invitation
      const qrCodeDirectory = "public/qrCodes";
      const imagePath = path.join(qrCodeDirectory, `${userId}_qr.png`);
      await fs.mkdir(path.join(qrCodeDirectory), { recursive: true });
      const generateCode = await QrCode.toFile(imagePath, user.invitationCode);
      await User.findByIdAndUpdate(userId, { $set: { qrCodePath: imagePath } });

      //Check for invitation code
      const invitationCode = req.body.invitationCode;

      if (!invitationCode == "") {
        const inviter = await User.findOne({ invitationCode: invitationCode });
        const calculateLevel = (referrals) =>
          Math.round(Math.pow(referrals + 1, 1 / 3));
        const level = calculateLevel(inviter.referrals);
        if (!inviter) {
          return res.status(404).json({
            message: "Invalid Invitation Code!",
          });
        } else {
          try {
            saveUser.inviter = inviter._id;
            inviter.tier1Referrals.push(saveUser._id);
            inviter.referrals += 1;
            inviter.level = level;
            if (inviter.inviter) {
              const primaryInviter = await User.findById(inviter.inviter);
              let primaryLevel = calculateLevel(primaryInviter.referrals + 1);
              primaryInviter.referrals += 1;
              primaryInviter.tier2Referrals.push(saveUser.id);
              primaryInviter.level = primaryLevel;
              await primaryInviter.save();
            }
            await saveUser.save();
            await inviter.save();
          } catch (error) {
            console.log(error);
          }
        }
      }

      return res.status(200).json({
        message: "Signed up successfully",
        user: saveUser,
      });
    }
    res.status(409).json({
      message: "User with this email already exists",
    });
  } catch (error) {
    res.status(500).json({
      message: "An error occured!",
    });
  }
}

async function login(req, res) {
  try {
    const user = await User.findOne({ email: req.body.email }).populate(
      "miningSessions"
    );
    if (!user) {
      return res.status(404).json({
        message: "User doesn't exists!",
      });
    } else {
      if (!req.body.password == "") {
        if (!compareSync(req.body.password, user.password)) {
          return res.status(401).json({
            message: "Incorrect password!",
          });
        }
      } else {
        return res.status(404).json({
          message: "Please enter password!",
        });
      }
    }
    
    const fcm = req.body.fcmToken;
    await User.findByIdAndUpdate(user._id, {$set: {fcmToken: fcm}})


    const payload = {
      user: user._id,
    };

    const token = jwt.sign(payload, secretKey, { expiresIn: "1h" });
    res.status(200).json({
      user: user,
      token: "Bearer " + token,
    });
  } catch (error) {
    res.status(500).json({
      message: "An error occured!",
    });
  }
}

async function getHomeInfo(req, res) {
  console.log("here");
  //console.log("here", "token: ", req.info.token, "userrrr:", req.user);
  try {
    const user = await User.findById(req.user.user); //req.user.user contains _id (from payload)
    const session = await MiningSession.findOne({
      userId: user._id,
      isActive: true,
    });
    var currentEarningRate = 0;
    var coins = 0;
    var tier1Bonus = 0;
    var tier2Bonus = 0;
    var bonusWheelBonus = 0;
    var hourlyEarnings = [];
    if (user) {
      if (session) {
        tier1Bonus =
          session.inActiveTier1Count *
          (constants.tier1ReferralBonusPercentage * 100); //*100 because we have to calculate percentage
        tier2Bonus =
          session.inActiveTier2Count *
          (constants.tier2ReferralBonusPercentage * 100);
        bonusWheelBonus = session.bonusWheel;
        coins = ((tier1Bonus + tier2Bonus) / 100) * constants.baseMiningRate;
        hourlyEarnings = session.hourlyEarnings;
        const arrayLength = hourlyEarnings.length;
        if (arrayLength !== 0) {
          currentEarningRate = hourlyEarnings[arrayLength - 1].earning;
        }
      }
      return res.status(200).json({
        streak: user.streak,
        daysOff: user.daysOff,
        availableBalance: user.availableBalance,
        stakingBalance: user.stakingBalance,
        currentEarningRate: currentEarningRate,
        bonusOfReferral: tier1Bonus + tier2Bonus,
        coins: coins,
        bonusWheelBonus: bonusWheelBonus,
        rank: user.rank,
        tier1Referrals: user.tier1Referrals.length,
        tier2Referrals: user.tier2Referrals.length,
        hourlyEarnings: hourlyEarnings,
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "An error occured!",
    });
  }
}

async function requestResetPassword(req, res) {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return res.status(404).json({
        message:
          "Please recheck your email. Account with this email doesn't exist",
      });
    }

    // Checking if there already exists a token
    let existingToken = await Token.findOne({ userId: user._id });

    if (existingToken) {
      await existingToken.deleteOne();
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000);
    const verificationCodeString = verificationCode.toString();
    const hash = await bcrypt.hash(verificationCodeString, Number(10));
    const newToken = new Token({
      token: hash,
      userId: user._id,
      createdAt: Date.now(),
    });

    const savedToken = await newToken.save();

    //const link = `http://localhost:3000/passwordReset?token=${resetToken}&id=${user._id}`;
    const emailResult = await sendEmail(
      user.email,
      "Password Reset Request",
      {
        name: user.name,
        code: verificationCode,
      },
      "../utils/templates/resetPasswordRequest.handlebars"
    );
    console.log("Email sent result:", emailResult);

    // Check the result of sending email
    if (emailResult && emailResult.error) {
      return res.status(500).json({
        success: false,
        message: "Failed to send reset email",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Password reset email sent successfully",
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
}

async function resetPassword(req, res) {
  const { email, token, password } = req.body;
  const user = await User.findOne({ email: email });
  if (!token || !email || !password) {
    return res.status(400).json({
      message:
        "Invalid reset request. Please provide the necessary parameters.",
    });
  }
  if (user) {
    const userId = user._id;
    let passwordResetToken = await Token.findOne({ userId });
    if (!passwordResetToken) {
      return res.status(404).json({
        message: "Invalid or expired token",
      });
    }
    const isValid = await bcrypt.compare(token, passwordResetToken.token);
    if (!isValid) {
      return res.status(404).json({
        message: "Invalid or expired token",
      });
    }
    const hash = await bcrypt.hash(password, Number(10));

    await User.updateOne(
      { _id: userId },
      { $set: { password: hash } },
      { new: true }
    );
    sendEmail(
      email,
      "Password Reset Successfully",
      {
        name: user.name,
      },
      "../utils/template/resetPassword.handlebars"
    );

    await passwordResetToken.deleteOne();

    return res.status(200).json({
      message: "Password Reset Successfully",
    });
  }
  return res.status(404).json({
    message: "Account not found!"
  })
}

async function uploadPhoto(req, res) {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.user,
      {
        photo: req.file.filename,
      },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({
        message: "User not found!",
      });
    }

    res.status(200).json({
      success: true,
      message: "Photo Added!",
      photo: user.photo,
    });
    // cloudinary.uploader.upload(req.file.path, function (err, result){
    //   if(err) {
    //     console.log(err);
    //     return res.status(500).json({
    //       success: false,
    //       message: "Error"
    //     })
    //   }
    //   res.status(200).json({
    //     success: true,
    //     message:"Uploaded!",
    //     data: result
    //   })
    // })
  } catch (error) {
    res.status(500).json({
      message: "An error occured",
      error,
    });
  }
}

async function checkEligibilyForBonusWheel(req, res) {
  try {
    const session = await MiningSession.findOne({
      userId: req.user.user,
      isActive: true,
    });
    if (session) {
      if (session.bonusWheel !== 0) {
        return res.status(404).json({
          message: "Bonus wheel not available",
        });
      }
      return res.status(200).json({
        message: "Spin the wheel to earn extra bonus!",
      });
    }
    return res.status(404).json({
      message: "Start a new session to earn bonus wheel!",
    });
  } catch (error) {
    console.log("error", error);
  }
}

async function bonusWheelReward(req, res) {
  try {
    const rewardAmount = req.body.amount;
    const session = await MiningSession.findOne({
      userId: req.user.user,
      isActive: true,
    });
    if (session && session.bonusWheel === 0) {
      session.bonusWheel = rewardAmount;
      await session.save();

      return res.status(200).json({
        message: "Congratulations!",
      });
    }

    return res.status(404).json({
      message: "Bonus wheel not available!",
    });
  } catch (error) {
    console.log("error", error);
  }
}

async function getProfile(req, res) {
  try {
    const user = await User.findById(req.user.user);
    if (user) {
      const level = user.level;
      const allBadges = badges
        .filter((badge) => badge.level <= level)
        .reverse();
      return res.status(200).json({
        name: user.name,
        rank: user.rank,
        level: user.level,
        referrals: user.referrals,
        badges: allBadges,
        balance: user.availableBalance,
        photoUrl: user.photo,
      });
    }
    return res.status(404).json({
      message: "User not found!",
    });
  } catch (error) {
    res.status(500).json({
      message: "An error occured",
    });
  }
}

async function activeTiers(req, res) {
  try {
    const user = await User.findById(req.user.user);
    const tier1Referrals = user.tier1Referrals;
    const tier2Referrals = user.tier2Referrals;

    let inActiveTier1 = [];
    let inActiveTier2 = [];

    const tier1Promises = tier1Referrals.map(async (referralId) => {
      const session = await MiningSession.findOne({
        userId: referralId,
        isActive: false,
      });
      if (session) {
        const user = await User.findById(session.userId);
        inActiveTier1.push(user);
      }
    });

    const tier2Promises = tier2Referrals.map(async (referralId) => {
      const session = await MiningSession.findOne({
        userId: referralId,
        isActive: false,
      });
      if (session) {
        const user = await User.findById(session.userId);
        inActiveTier2.push(user);
      }
    });

    await Promise.all([...tier1Promises, ...tier2Promises]);
    return res.status(200).json({
      totalTier1: tier1Referrals.length,
      totalTier2: tier2Referrals.length,
      inActiveTier1: inActiveTier1,
      inActiveTier2: inActiveTier2,
    });
  } catch (error) {
    return res.status(500).json({
      message: "An error occured",
    });
  }
}

async function earningCalculator(req, res) {
  try {
    const constantTerms = constants;
    return res.status(200).json({
      constantTerms,
    });
  } catch (error) {
    return res.status(500).json({
      message: "An error occured",
    });
  }
}

async function getStats(req, res) {
  try {
    const onlineUsers = await MiningSession.countDocuments({ isActive: true });
    const totalUsers = await User.countDocuments({});
    const topUsers = await User.aggregate([
      {
        $setWindowFields: {
          sortBy: { availableBalance: -1 },
          output: {
            rank: {
              $denseRank: {},
            },
          },
        },
      },
    ]);
    return res.status(200).json({
      onlineUsers: onlineUsers,
      totalUsers: totalUsers,
      topUsers: topUsers,
    });
  } catch (error) {
    res.status(500).json({
      message: "An error occured",
    });
  }
}

async function deleteAccount(req, res) {
  try {
    const userId = req.user.user;
    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found!",
      });
    }
    await User.updateMany(
      { tier1Referrals: user._id },
      { $pull: { tier1Referrals: user._id } }
    );
    await User.updateMany(
      { tier2Referrals: user._id },
      { $pull: { tier2Referrals: user._id } }
    );
    await MiningSession.deleteMany({ userId: user._id });

    res.status(200).json({
      message: "User deleted successfully!",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "An error occurred",
    });
  }
}

async function getInfo(req, res) {
  try {
    const user = await User.findById(req.user.user);
    const stakedBalance = user.stakingBalance;
    const lastCheckIn = user.lastCheckIn;
    const currentTime = new Date();
    const nextCheckIn = new Date(lastCheckIn.getTime() + 24 * 60 * 60 * 1000);
    const timeRemaining = nextCheckIn - currentTime;
    const hoursRemaining = Math.floor(timeRemaining / (60 * 60 * 1000));
    const minutesRemaining = Math.floor(
      (timeRemaining % (60 * 60 * 1000)) / (60 * 1000)
    );

    let stakingPeriod;
    const staking = await Staking.findOne({ userId: user._id, isActive: true })
      .sort({ years: 1 })
      .limit(1);
    if (staking) {
      stakingPeriod = staking.years;
    } else {
      stakingPeriod = 0;
    }
    res.status(200).json({
      timeRemaining: `${hoursRemaining}h ${minutesRemaining}m`,
      stakedBalance: stakedBalance,
      stakedPeriod: stakingPeriod,
    });
  } catch (error) {
    res.status(500).json({
      message: "An error occured!",
    });
  }
}

async function balanceHistory(req, res) {
  try {
    const id = req.user.user;
    const today = new Date();

    // Sessions created one day ago
    const dayOld = await getFormattedHourlyEarnings(
      await getMiningSessions(
        new Date(today).setDate(today.getDate() - 1),
        today,
        id
      )
    );

    // Sessions created one week ago
    const weekOld = await getFormattedHourlyEarnings(
      await getMiningSessions(
        new Date(today).setDate(today.getDate() - 7),
        today,
        id
      )
    );

    // Sessions created one month ago
    const monthOld = await getFormattedHourlyEarnings(
      await getMiningSessions(
        new Date(today).setMonth(today.getMonth() - 1),
        today,
        id
      )
    );

    
    return res.status(200).json({
      dayOld: dayOld,
      weekOld: weekOld,
      monthOld: monthOld,
    });
  } catch (error) {
    console.error(`Error in balanceHistory: ${error.message}`);
    res.status(500).json({
      message: "An error occurred!",
    });
  }
}

async function getFormattedHourlyEarnings(sessions) {
  return sessions
    .map((session) =>
      session.hourlyEarnings.map((hourlyEarning) => ({
        ...hourlyEarning.toObject(),
        time: new Date(hourlyEarning.time).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      }))
    )
    .flat();
}

async function getMiningSessions(startDate, endDate, userId) {
  try {
    const sessions = await MiningSession.find({
      userId: userId,
      createdAt: {
        $gte: startDate,
        $lt: endDate,
      },
    });

    return sessions;
  } catch (error) {
    console.error(`Error finding mining sessions: ${error.message}`);
    return [];
  }
}

async function balanceHistoryOfSpecificDate(req,res){
  try{
    const id = req.user.user;
    const specificDate = new Date(req.body.date);
    let specificDateSessions = [];
    if (specificDate) {
      specificDateSessions = await getFormattedHourlyEarnings(
        await getMiningSessions(
          specificDate,
          new Date(specificDate).setHours(23, 59, 59, 999),
          id
        )
      );
    }
    return res.status(200).json({
      specificDate: specificDateSessions
    })
  }
  catch(error){
     res.status(500).json({
      message: "An error occured!"
    })
  }
}

module.exports = {
  login,
  signUp,
  getHomeInfo,
  requestResetPassword,
  resetPassword,
  checkEligibilyForBonusWheel,
  bonusWheelReward,
  getProfile,
  activeTiers,
  earningCalculator,
  getStats,
  uploadPhoto,
  deleteAccount,
  getInfo,
  balanceHistory,
  balanceHistoryOfSpecificDate
};
