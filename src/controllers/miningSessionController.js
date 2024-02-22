const User = require("../models/userSchema");
const MiningSession = require("../models/miningSessionSchema");
const Staking = require("../models/stakingSchema");
const Progress = require("../models/progressSchema");
const schedule = require("node-schedule");
const constants = require("../constants");
const {sendNotificationOnProgress} = require("../../utils/notifications")

async function updateRank(userId){
  try {
    const users = await User.aggregate( [
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
   const user = users.find(item=> item._id.equals(userId));
   if(user){
    const newRank = user.rank;
    await User.findByIdAndUpdate(userId, {$set: {rank: newRank}});  
   }
   return;

  } catch (error) {
    return res.status(500).json({
      message: "An error occured",
    });
  }
}


async function startMining(req, res) {
  try {
    const user = await User.findById(req.user.user) //req.user.user contains _id (from payload)
    const currentDate = new Date();
    const lastCheckIn = user.lastCheckIn;
    const sessions = await MiningSession.find({userId: req.user.user});
    
    if(sessions.length === 0){
      const newBonus = 10 * constants.baseMiningRate;
      user.availableBalance += bonus;
      await user.save();
      const progress = await Progress.findById(user.progress);
      progress.startedEarning = true;
      await progress.save();
      sendNotificationOnProgress(user._id, user._id, type = "earning", bonus = newBonus)

    }
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
      if (!lastCheckIn || timePassed <= 25 * 60 * 60 * 1000) {
        user.streak += 1;
        if (user.streak % 6 === 0) {
          user.daysOff += 1; // Increment the user's daysOff by 1
        }
      }
      if (timePassed > 25 * 60 * 60 * 1000) {
        user.streak = 0;
      }
      await user.save();
      processHourlyEarnings(user._id, newSession._id);

      return res.status(200).json({
        message: "Running",
      });
    }
    return res.status(409).json({
      message: "Check-in not available!",
    });
  } catch (error) {
    console.error(error)
    res.status(500).json({
      message: "An error occured!",
      error,
    });
  }
}



function processHourlyEarnings(userId, sessionId) {
  const startTime = new Date();
  const endTime = new Date(startTime.getTime() + 23 * 60 * 60 * 1000);
  const endTime2 = new Date(endTime.getTime() + 1 * 60 * 1000);
  const minute = startTime.getMinutes();
  const cronJobRule = `${minute} * * * *`;
  getHourlyEarnings(userId, sessionId);

  const job = schedule.scheduleJob(endTime2, async function () {
    try {
     
      const session = await MiningSession.findByIdAndUpdate(
        sessionId,
        { $set: { isActive: false } },
        { new: true }
      );
      if (!session) {
        console.error("Mining session not found or could not be updated.");
      }
      job.cancel();
    } catch (error) {
      console.error("Error in job execution:", error);
    }
  });

  schedule.scheduleJob(
    { start: startTime, end: endTime, rule: cronJobRule },
    async function () {
      getHourlyEarnings(userId, sessionId);
    }
  );
}

async function getHourlyEarnings(userId, sessionId) {
  const { count: tier1Count, bonus: tier1Bonus } = await getActiveTiers(
    userId,
    "T1"
  );
  const { count: tier2Count, bonus: tier2Bonus } = await getActiveTiers(
    userId,
    "T2"
  );
  console.log("tier 1 count", tier1Count);
  console.log("tier 2 count", tier2Count);
  console.log("tier 1 Bonus", tier1Count);
  console.log("tier 2 bonus", tier2Count);

  const session = await MiningSession.findById(sessionId);
  const bonusPercentage = session.bonusWheel/100;

  const hourlyMiningRate =
    constants.baseMiningRate +
    (tier1Count *(constants.tier1ReferralBonusPercentage * constants.baseMiningRate) +
      tier2Count * (constants.tier2ReferralBonusPercentage * constants.baseMiningRate) +
      (bonusPercentage * constants.baseMiningRate) +
    (constants.baseMiningRate * (tier1Bonus / 100)) +
    (constants.baseMiningRate * (tier2Bonus / 100)));

  const user = await User.findById(userId);
  const availableBalance = user.availableBalance
  user.availableBalance = Number((availableBalance+hourlyMiningRate).toFixed(2));
  await user.save();
  const updateUserRank = await updateRank(userId);

  const hourlyEarnings = {
    earning: hourlyMiningRate,
    time: new Date(),
    percentage: Number(((hourlyMiningRate / constants.baseMiningRate) * 100).toFixed(2)),
  };
  
  session.activeTier1Count = tier1Count;
  session.activeTier2Count = tier2Count;
  session.hourlyEarnings.push(hourlyEarnings);
  await session.save();
}

async function getActiveTiers(userId, referralType) {
  try {
    const user = await User.findById(userId);
    let count = 0;
    let bonus = 0;
    const referrals =
      referralType === "T1" ? user.tier1Referrals : user.tier2Referrals;
    

    const promises = referrals.map(async (referralId) => {
      const referral = await User.findById(referralId);
      if (referral) {
        const activeSession = await MiningSession.findOne({
          userId: referral._id,
          isActive: true,
        });
        if (activeSession) {
          bonus = activeSession.bonusWheel;
          count++;
        }
      }
    });

    await Promise.all(promises);
    console.log("count is", count);
    return { count, bonus };
  } catch (error) {
    console.error("An error occurred in getActiveTiers:", error);
    return { count: 0, bonus: 0 };
  }
}

const inactivityCheckJob = schedule.scheduleJob(' 0 * * * *', async function() { //All users that have been inactive since 25 hours
  try {

    
    const inactiveUsers = await User.find({
      lastCheckIn: { $lt: new Date(new Date() - 25 * 60 * 60 * 1000) }
    });
    for (const user of inactiveUsers) {
        const daysOffAvailable = user.daysOff;
        if (daysOffAvailable !== 0){
            const newSession = new MiningSession({
              userId: user._id,
              createdAt: new Date(),
              isActive: true,
            });
            await newSession.save();
            user.streak = 0;
            user.daysOff -= 1;
            user.lastCheckIn = new Date();
            user.miningSessions.push(newSession);
            await user.save();
            processHourlyEarnings(user._id, newSession._id);
        }
        else {
          const availableBalance = user.availableBalance;
          const burningRate = (4/2400)*availableBalance;
          const newBalance = (availableBalance - burningRate).toFixed(2);
          user.availableBalance = Number(newBalance);
          await user.save();
          const updateUserRank = updateRank(user._Id);

        }
    }
  } catch (error) {
    console.error("Error during inactivity check:", error);
  }
});

inactivityCheckJob.invoke();


schedule.scheduleJob('0 0 * * *', async function () { //All users that have been inactive since 30 days
  try {
    const users = await User.find({ lastCheckIn: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } });
    const promises = users.map(async(user)=>{
    user.availableBalance = 0;
    user.stakingBalance = 0;
    await user.save();
  })
  await Promise.all(promises)
  
  } catch (error) {
    console.error('Error:', error);
  }
});



 // Staking Process
async function startStaking(req, res) { 
  try {
    const user = await User.findById(req.user.user); //req.user.user contains _id (from payload)
    const { percentage, years } = req.body;
    const availableBalance = user.availableBalance;
    const amount = (percentage / 100) * availableBalance;
    const session = await MiningSession.findOne({
      userId: user._id,
      isActive: true,
    });
    if (session) {
      const stakings = await Staking.find({ userId: user._id }).sort({
        createdAt: -1,
      });
      if (stakings.length !== 0) {
        const latestStaking = stakings[0];
        const creationDate = latestStaking.createdAt;
        const days = new Date().getTime() - creationDate.getTime();
        const dayDifference = Math.floor(days / (1000 * 60 * 60 * 24));
        if (dayDifference < constants.stakingCooldownPeriod) {
          return res.status(409).json({
            message: "Staking deposit can not be created",
          });
        }
      }
      const newStaking = new Staking({
        userId: user._id,
        years: years,
        amount: amount,
        percentage: percentage
      });
      await newStaking.save();
      user.stakingBalance += amount;
      user.availableBalance -= amount;
      user.stakings.push(newStaking._id);
      await user.save();

    const releaseDate = new Date();
    releaseDate.setFullYear(releaseDate.getFullYear() + years);
    const stakingJob = createStakingJob(user._id, newStaking._id, amount, years);
    schedule.scheduleJob(releaseDate, stakingJob);
      return res.status(200).json({
        message: "Staked balance successfully!"
      })
    }
    return res.status(404).json({
      message: "Inactive users can't stake deposit",
    });
  } catch (error) {
    res.status(500).json({
      message: "An error occured!",
    });
  }
}

function createStakingJob(userId, stakingId, amount, years) {
  return async function () {
    try {
      const stakingDeposit = await Staking.findByIdAndUpdate(stakingId, { $set: { isActive: false } });
      if (stakingDeposit) {
        const getStakedAmount = calculateInterest(amount, years);
        const user = await User.findByIdAndUpdate(userId, { $inc: { availableBalance: getStakedAmount, stakingBalance: -amount } });
        if (!user) {
          console.error("User not found!");
        } 
      }
    } catch (error) {
      console.error("Error in staking job execution:", error);
    }
  };
}


function calculateInterest(amount,years){
  switch(years){
    case 1: return (0.25*amount+amount);
    case 2: return (0.65*amount+amount);
    case 3: return (1.20*amount+amount);
    case 4: return (1.90*amount+amount);
    case 5: return (2.75*amount+amount);
    default: return 0;
  }
}

module.exports = { startMining, startStaking };
