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
const { ToadScheduler, SimpleIntervalJob, Task } = require('toad-scheduler')


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

      //Check for invitation code
      const invitationCode = req.body.invitationCode;

      if (!invitationCode == "") {
        const inviter = await User.findOne({ invitationCode: invitationCode }); //generate random code
        if (!inviter) {
          return res.status(404).json({
            message: "Invalid Invitation Code!",
          });
        } else {
          try {
            saveUser.inviter = inviter._id; //c ke inviter mein b
            inviter.tier1Referrals.push(saveUser._id); //b ke tier1 mein c chalajauega
          
            if (inviter.inviter) {
              const primaryInviter = await User.findByIdAndUpdate(
                inviter.inviter,
                { $push: { tier2Referrals: saveUser.id } },
                { new: true }
              );
            }
            //await inviter.inviter.save();
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
  console.log("here", "token: ", req.info.token, "userrrr:", req.user);
  try {
    const user = await User.findById(req.user.user); //req.user.user contains _id (from payload)
    if (user) {
      return res.status(200).json({
        streak: user.streak,
        daysOff: user.daysOff,
        balance: user.balance,
        rank: user.rank,
        tier1Referrals: user.tier1Referrals.length,
        tier2Referrals: user.tier2Referrals.length,
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "An error occured!",
    });
  }
}

async function checkIn(req, res) {

  try {
    const user = await User.findById(req.user.user); //req.user.user contains _id (from payload)
    const lastCheckIn = user.lastCheckIn;
    const T1 = user.tier1Referrals.length;
    const T2 = user.tier2Referrals.length;
   
    const hourlyMiningRate =
      constants.baseMiningRate +
      (T1 *
        (constants.tier1ReferralBonusPercentage * constants.baseMiningRate) +
        T2 *
          (constants.tier2ReferralBonusPercentage * constants.baseMiningRate));
    //CHECK IF BONUS WHEEL IS AVAILABLE OR NOT 
    if (!lastCheckIn) {
      //For first time user
      user.lastCheckIn = new Date();
      await user.save();
      res.status(200).json({
        message: "First-time check-in successful!",
        hourlyMiningRate: hourlyMiningRate,
      });
    } else {
      
      const timePassed = new Date() - new Date(lastCheckIn);
      
      //If checkIn is available
      if (timePassed > 24 * 60 * 60 * 1000) {
        user.lastCheckIn = new Date();
        await user.save();
      }

      //If checkIn is not availble
      const nextCheckInTime = new Date(user.lastCheckIn.getTime() + 24 * 60 * 60 * 1000);
      const timeRemaining = nextCheckInTime - new Date();
      const hoursRemaining = Math.floor(timeRemaining / (60 * 60 * 1000));
      const minutesRemaining = Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000));
     
      res.status(400).json({
        message: `Check-in not available. Next check-in will be available in ${hoursRemaining} hours and ${minutesRemaining} minutes`,
      });
    }

  } catch (error) {
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


async function bonusWheelReward(req,res){
  try {
    const user = await User.findById(req.user.user); //req.user.user contains _id (from payload)
    const lastCheckIn = user.lastCheckIn;
    const timePassed = Date.now() - lastCheckIn;

    //If checkIn is not available
    if (lastCheckIn && timePassed < 24 * 60 * 60 * 1000) {
        const nextCheckInTime = new Date(
            lastCheckIn.getTime() + 24 * 60 * 60 * 1000
        );
        const timeRemaining = nextCheckInTime - new Date();
        const hoursRemaining = Math.floor(timeRemaining / (60 * 60 * 1000));
        const minutesRemaining = Math.floor(
            (timeRemaining % (60 * 60 * 1000)) / (60 * 1000)
        );
        return res.status(400).json({
            message: `Check-in not available. Next check-in will be available in ${hoursRemaining} hours and ${minutesRemaining} minutes`,
        });
      }
      const getSession = await MiningSession.find({ userId: user._id }).sort({ createdAt: -1 });
      const sessionTime = getSession.createdAt.getTime();
      const currentTime = new Date().getTime();
      const timeDifference = currentTime - sessionTime;
      if(timeDifference <= 24 * 60 * 60 * 1000){
          return res.status(404).json({
            message: "Bonus Wheel not available. Come back at next check-in"
          })
      }   
  } catch (error) {
    console.log("error", error)
  }
}






module.exports = {
  login,
  signUp,
  getHomeInfo,
  checkIn,
  requestResetPassword,
  resetPassword,
  bonusWheelReward
};
