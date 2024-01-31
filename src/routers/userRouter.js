const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const passport = require("passport");
const secretKey = require("../../config/secret");
const multer = require("multer");
const fs = require('fs');
const path = require('path');

const { login, signUp, getHomeInfo, requestResetPassword, resetPassword,checkEligibilyForBonusWheel, bonusWheelReward, getProfile, activeTiers, earningCalculator, getStats, uploadPhoto, deleteAccount, getInfo, balanceHistory } = require("../controllers/userController");
const {startMining, startStaking} = require ("../controllers/miningSessionController");
const {send} = require("../../utils/notifications");

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

// Multer Middleware

const uploadFile = multer({
  storage: multer.diskStorage({
    destination: function(req,file,cb){
      const uploadDir = 'public/photoUploads';
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir);
      }
      cb(null, uploadDir);
    },
    filename: function(req,file,cb){
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
      //cb(null, file.originalname)
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
}).single("photo")


router.post("/signUp", signUp)
router.post("/login", login)
router.post("/requestResetPassword", requestResetPassword);
router.post("/resetPassword", resetPassword);
router.post("/uploadPhoto",verifyToken, uploadFile, uploadPhoto)

router.get("/google", passport.authenticate('google', {scope: ['profile', 'email']}));
router.get("/google/callback", passport.authenticate('google', {failureRedirect: '/login'}), (req,res)=> res.redirect('/home'))

// router.get("/facebook", passport.authenticate('facebook', {scope: ['email']}));
// router.get("/facebook/callback", passport.authenticate('google', {failureRedirect: '/login'}), (req,res)=> res.redirect('/home'))

router.post("/startMining",verifyToken, startMining);
router.post("/startStaking",verifyToken, startStaking);

router.get("/home",verifyToken, getHomeInfo);
router.get("/getProfile",verifyToken, getProfile);
router.delete("/deleteAccount", verifyToken, deleteAccount);


router.get("/getStats",verifyToken, getStats);
router.get("/checkEligibilyForBonusWheel",verifyToken, checkEligibilyForBonusWheel);
router.post("/bonusWheelReward",verifyToken, bonusWheelReward);
router.get("/activeTiers",verifyToken, activeTiers);
router.get("/earningCalculator", verifyToken, earningCalculator);
router.get("/getInfo", verifyToken, getInfo);
router.get("/balanceHistory", verifyToken, balanceHistory)

router.post("/sendNotification", verifyToken, send);



module.exports = router;
