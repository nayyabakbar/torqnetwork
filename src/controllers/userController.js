const jwt = require("jsonwebtoken");
const secretKey = require("../../config/secret");
const bcrypt = require("bcrypt");
const { hashSync, compareSync } = require("bcrypt");
const User = require("../models/userSchema");
const MiningSession = require("../models/miningSessionSchema");
const constants = require("../constants");
const crypto = require("crypto");
const Token = require("../models/tokenSchema");
const sendEmail = require("../../utils/sendEmail");
const schedule = require("node-schedule");
const badges = require("../badges");
const QrCode = require("qrcode");
const fs = require("fs").promises;
const path = require("path");

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
      const saveUser = await user.save();
      const userId = saveUser._id;
      //Create QR Code For Invitation
      const qrCodeDirectory = 'public/qrCodes'; 
      const imagePath = path.join(qrCodeDirectory, `${userId}_qr.png`);
      await fs.mkdir(path.join( qrCodeDirectory), { recursive: true });
      const generateCode = await QrCode.toFile(imagePath, user.invitationCode);
      await User.findByIdAndUpdate(userId, {$set: {qrCodePath: imagePath}})
      

      //Check for invitation code
      const invitationCode = req.body.invitationCode;

      if (!invitationCode == "") {
        const inviter = await User.findOne({ invitationCode: invitationCode }); 
        const calculateLevel = (referrals)=>  Math.round(Math.pow(referrals+1, 1 / 3));
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
              const primaryInviter = await User.findById(inviter.inviter,);
              let primaryLevel =  calculateLevel(primaryInviter.referrals+1);
              primaryInviter.referrals +=1;
              primaryInviter.tier2Referrals.push(saveUser.id);
              primaryInviter.level = primaryLevel
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
    const user = await User.findOne({ email: req.body.email });
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
  //console.log("here", "token: ", req.info.token, "userrrr:", req.user);
  try {
    const user = await User.findById(req.user.user); //req.user.user contains _id (from payload)
    const session = await MiningSession.findOne({userId: user._id, isActive: true});  
    var currentEarningRate = 0;
    var coins = 0;
    var tier1Bonus = 0;
    var tier2Bonus = 0;
    var bonusWheelBonus = 0;
    var hourlyEarnings = [];
    if (user) {
      if(session){
        tier1Bonus = session.activeTier1Count * (constants.tier1ReferralBonusPercentage*100); //*100 because we have to calculate percentage 
        tier2Bonus = session.activeTier2Count * (constants.tier2ReferralBonusPercentage*100);
        bonusWheelBonus = session.bonusWheel;
        coins = ((tier1Bonus+tier2Bonus)/100) * constants.baseMiningRate;
        hourlyEarnings = session.hourlyEarnings;
        const arrayLength = hourlyEarnings.length;
        if(arrayLength !== 0){
          currentEarningRate = hourlyEarnings[arrayLength-1].earning;
        }   
      }
      return res.status(200).json({
        streak: user.streak,
        daysOff: user.daysOff,
        availableBalance: user.availableBalance,
        stakingBalance: user.stakingBalance,
        currentEarningRate: currentEarningRate,
        bonusOfReferral: tier1Bonus+tier2Bonus,
        coins: coins,
        bonusWheelBonus: bonusWheelBonus,
        rank: user.rank,
        tier1Referrals: user.tier1Referrals.length,
        tier2Referrals: user.tier2Referrals.length,
        hourlyEarnings: hourlyEarnings
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

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hash = await bcrypt.hash(resetToken, Number(10));
    const newToken = new Token({
      token: hash,
      userId: user._id,
      createdAt: Date.now(),
    });

    const savedToken = await newToken.save();
    console.log("Reset token is", resetToken);
    const link = `http://localhost:3000/passwordReset?token=${resetToken}&id=${user._id}`;
    const emailResult = await sendEmail(
      user.email,
      "Password Reset Request",
      {
        name: user.name,
        link: link,
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
  const { userId, token, password } = req.body;
  let passwordResetToken = await Token.findOne({ userId });

  if (!token || !userId || !password) {
    return res.status(400).json({
      message:
        "Invalid reset request. Please provide the necessary parameters.",
    });
  }
  if (!passwordResetToken) {
    return res.status(404).json({
      message: "Invalid or expired token",
    });
  }

  const isValid = await bcrypt.compare(token,passwordResetToken.token);
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

  const user = await User.findById({ _id: userId });

  sendEmail(
    user.email,
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


async function checkEligibilyForBonusWheel(req,res){
  try {

    const session = await MiningSession.findOne({userId: req.user.user, isActive: true});
    if(session){
      if(session.bonusWheel !== 0){
        return res.status(404).json({
          message: "Bonus wheel not available"
        })
      }
      return res.status(200).json({
        message: "Spin the wheel to earn extra bonus!"
      })
    }
    return res.status(404).json({
      message: "Start a new session to earn bonus wheel!"
    })

   
  } catch (error) {
    console.log("error", error)
  }
}


async function bonusWheelReward(req,res){
  try {
    const rewardAmount = req.body.amount;
    const session = await MiningSession.findOne({userId: req.user.user, isActive: true});
    if (session && session.bonusWheel === 0){
      session.bonusWheel = rewardAmount;
      await session.save();

      return res.status(200).json({
        message: "Congratulations!"
      })
    }

    return res.status(404).json({
      message: "Bonus wheel not available!"
    })

    
  } catch (error) {
    console.log("error", error)
  }
}

async function getProfile(req,res){
  try {
    const user = await User.findById(req.user.user);
    if(user){
      const level = user.level;
      const allBadges =  (badges.filter((badge) => badge.level <= level)).reverse();
      return res.status(200).json({
        name: user.name,
        rank: user.rank,
        level: user.level,
        referrals: user.referrals,
        badges: allBadges
      })
    }
    return res.status(404).json({
      message: "User not found!",
    });

  } catch (error) {
    return res.status(500).json({
      message: "An error occured",
    });
  }
}

async function activeTiers(req,res){
  try {
    const user = await User.findById(req.user.user);
    const tier1Referrals = user.tier1Referrals;
    const tier2Referrals = user.tier2Referrals;

    let tier1Count = 0;
    let tier2Count = 0; 

    const tier1Promises = tier1Referrals.map(async (referralId) => {
      const session = await MiningSession.findOne({ userId: referralId, isActive: true });
      if (session) {
          tier1Count++;
      }  
    });

    const tier2Promises = tier2Referrals.map(async (referralId) => {
      const session = await MiningSession.findOne({ userId: referralId, isActive: true });
      if (session) {
          tier2Count++;
      }  
    });
    
    await Promise.all([...tier1Promises, ...tier2Promises]);
    return res.status(200).json({
      tier1Count : tier1Count,
      tier2Count : tier2Count
    })

  } catch (error) {
    return res.status(500).json({
      message: "An error occured",
    });
  }
}

async function earningCalculator(req,res){
  try {
    const constantTerms = constants;
    return res.status(200).json({
      constantTerms
    });

  } catch (error) {
    return res.status(500).json({
      message: "An error occured",
    });
  }
}

async function getStats(req,res){
  try {
    const onlineUsers = await MiningSession.countDocuments({isActive: true});
    const totalUsers = await User.countDocuments({});
    const topUsers = await User.aggregate( [
      {
         $setWindowFields: {
            sortBy: { availableBalance: -1 },
            output: {
               rank: {
                  $denseRank: {}
               }
            }
         }
      }
   ])
   return res.status(200).json({
    onlineUsers: onlineUsers,
    totalUsers: totalUsers,
    topUsers : topUsers
   })

  } catch (error) {
    return res.status(500).json({
      message: "An error occured",
    });
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
  getStats
};