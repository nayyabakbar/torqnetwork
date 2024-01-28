const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const passport = require("passport");
const secretKey = require("../../config/secret");

const { login, signUp, getHomeInfo, requestResetPassword, resetPassword,checkEligibilyForBonusWheel, bonusWheelReward, getProfile, activeTiers, earningCalculator, getStats } = require("../controllers/userController");
const {startMining, startStaking} = require ("../controllers/miningSessionController");


function verifyToken(req, res, next) {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({
      message: "Unauthorized- Token not provided!",
    });
  }

  jwt.verify(token.replace("Bearer ", ""), secretKey, (err, decode) => {
    if (err) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }
    req.user = decode;
    next();
  });
}

router.post("/signUp", signUp)
router.post("/login", login)
router.post("/requestResetPassword", requestResetPassword);
router.post("/resetPassword", resetPassword);


router.get("/google", passport.authenticate('google', {scope: ['profile', 'email']}));
router.get("/google/callback", passport.authenticate('google', {failureRedirect: '/login'}), (req,res)=> res.redirect('/home'))

// router.get("/facebook", passport.authenticate('facebook', {scope: ['email']}));
// router.get("/facebook/callback", passport.authenticate('google', {failureRedirect: '/login'}), (req,res)=> res.redirect('/home'))

router.post("/startMining",verifyToken, startMining);
router.post("/startStaking",verifyToken, startStaking);

router.get("/home",verifyToken, getHomeInfo);
router.get("/getProfile",verifyToken, getProfile)
router.get("/getStats",verifyToken, getStats);
router.get("/checkEligibilyForBonusWheel",verifyToken, checkEligibilyForBonusWheel);
router.post("/bonusWheelReward",verifyToken, bonusWheelReward);
router.get("/activeTiers",verifyToken, activeTiers);
router.get("/earningCalculator", verifyToken, earningCalculator)

module.exports = router;
