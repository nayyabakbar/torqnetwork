
const User = require("../models/userSchema");
const MiningSession = require("../models/miningSessionSchema");
const schedule = require("node-schedule");
const constants = require("../constants");

async function startMining(req, res) {
  try {
    const user = await User.findById(req.user.user); //req.user.user contains _id (from payload)
    const currentDate = new Date();
    const lastCheckIn = user.lastCheckIn;
    const activeSession = await MiningSession.findOne({
      userId: user._id,
      isActive: true,
    });
    if (!activeSession) {
      const newSession = new MiningSession({
        userId: user._id,
        createdAt: currentDate,
        isActive: true,
      });
      await newSession.save();
      user.lastCheckIn = currentDate;
      
      user.miningSessions.push(newSession);
      await user.save();
      const timePassed = currentDate - lastCheckIn;
      if(!lastCheckIn || timePassed <= 25*60*60*1000){
        user.streak += 1;
        if (user.streak % 6 === 0) {
             user.daysOff += 1; // Increment the user's daysOff by 1
        }
      }
      if (timePassed > 25*60*60*1000){
        user.streak = 0
      }
      await user.save();
      processHourlyEarnings(user._id, newSession._id);

      return res.status(200).json({
        message: "Running"
      })

    }
    return res.status(409).json({
      message: "Check-in not available!",
    });
  } catch (error) {
    res.status(500).json({
        message: "An error occured!", error
    })
  }
}

function processHourlyEarnings(userId, sessionId) {
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + 24*60*60*1000);
    const endTime2 = new Date(endTime.getTime() + 1*60*1000);

     const job = schedule.scheduleJob(endTime2, async function () {
      try {
        const session =  await MiningSession.findByIdAndUpdate(sessionId, {$set: { isActive: false }}, {new: true});
          if (!session) {
            console.error('Mining session not found or could not be updated.');
          }
        job.cancel();
      } catch (error) {
        console.error('Error in job execution:', error);
      }
    });


    schedule.scheduleJob({start: startTime, end: endTime, rule: '0 * * * *'},async function(){
        getHourlyEarnings(userId, sessionId);
    })
}

async function getHourlyEarnings(userId, sessionId){
    const { count: tier1Count, bonus: tier1Bonus } = await getActiveTiers(userId, 'T1');
    const { count: tier2Count, bonus: tier2Bonus } = await getActiveTiers(userId, 'T2');
    console.log("tier 1",  activeTier1);
    console.log("tier 2",  activeTier2);

    const session = await MiningSession.findById(sessionId);
    const bonusPercentage = session.bonusWheel

    const hourlyMiningRate =
         constants.baseMiningRate +
        (tier1Count *
          (constants.tier1ReferralBonusPercentage * constants.baseMiningRate) +
          tier2Count *
            (constants.tier2ReferralBonusPercentage *
              constants.baseMiningRate) +
          bonusPercentage * constants.baseMiningRate) + (constants.baseMiningRate* (tier1Bonus/100)) + (constants.baseMiningRate* (tier2Bonus/100))

      const hourlyEarnings = {
        earning: hourlyMiningRate,
        percentage: (constants.baseMiningRate / hourlyMiningRate) * 100,
      };

      session.hourlyEarnings.push(hourlyEarnings);
      await session.save();
}


async function getActiveTiers(userId, referralType) {
    try {
        const user = await User.findById(userId);
        const referrals = referralType === 'T1' ? user.tier1Referrals : user.tier2Referrals;
        let count = 0;
        let bonus = 0;

        const promises = referrals.map(async (referralId) => {
            const referral = await User.findById(referralId);
            if (referral) {
                const activeSession = await MiningSession.findOne({ userId: referral._id, isActive: true });
                bonus = activeSession.bonusWheel
                if (activeSession) {
                    count++;
                }
            }
        });

        await Promise.all(promises);
        console.log("count is", count);
        return {count, bonus};
    } catch (error) {
        console.error("An error occurred in getActiveTiers:", error);
        return { count: 0, bonus: 0 };
    }
}

// const inactivityCheckJob = schedule.scheduleJob(' * * * * *', async function() {
//   try {
//     console.log("heresss")
//     // Find all users who haven't checked in for more than 25 hours
//     const inactiveUsers = await User.find({
//       lastCheckIn: { $lt: new Date(new Date() - 2 * 60 * 60 * 1000) }
//     });
//     for (const user of inactiveUsers) {
//       console.log("user is", user)
//         const daysOffAvailable = user.daysOff;
//         if (daysOffAvailable !== 0){
//             const newSession = new MiningSession({
//               userId: user._id,
//               createdAt: new Date(),
//               isActive: true,
//             });
//             await newSession.save();
//             user.streak = 0;
//             user.daysOff -= 1;
//             user.lastCheckIn = new Date();
//             user.miningSessions.push(newSession);
//             await user.save();
//             processHourlyEarnings(user._id, newSession._id);
            
//         }
//         else {
//           const availableBalance = user.availableBalance;
//           const burningRate = (4/2400)*availableBalance;
//           const newBalance = (availableBalance - burningRate).toFixed(2);
//           user.availableBalance = Number(newBalance);
//           await user.save();
//         }
//     }
//   } catch (error) {
//     console.error("Error during inactivity check:", error);
//   }
// });

// inactivityCheckJob.invoke();



// // Staking Process

// async function staking(req, res) {
//   try {
//     const user = await User.findById(req.user.user); //req.user.user contains _id (from payload)
//     const lastCheckIn = user.lastCheckIn;
//     const timePassed = Date.now() - lastCheckIn;
//     const getSession = await MiningSession.find({ userId: user._id }).sort({
//       createdAt: -1,
//     });
//     const sessionTime = getSession.createdAt.getTime();
//     const currentTime = new Date().getTime();
//     const timeDifference = currentTime - sessionTime;
//     //check if last mining session was within 24 hours
//     // if (timeDifference <= 24 * 60 * 60 * 1000) {
//     //   return res.status(404).json({
//     //     message: "Bonus Wheel not available. Come back at next check-in",
//     //   });
//     // }
//   } catch (error) {
//     res.status(500).json({
//         message: "An error occured!"
//     })
//   }
// }

module.exports = {startMining}