const express = require("express");
const router = express.Router();
const multer = require("multer");
const fs = require('fs');
const path = require('path');
const jwt = require("jsonwebtoken");
const secretKey = require("../../config/secret");

const {personalInfo, uploadPanCardFront, uploadPanCardBack, uploadGovDocFront, uploadGovDocBack, uploadSelfie, getKycStatus} = require ("../controllers/kycController");


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
const storage =  multer.diskStorage({
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
  })


const upload = multer({storage: storage, limits: { fileSize: 5 * 1024 * 1024 }})

router.post('/personalInfo', verifyToken,  personalInfo)
router.post('/upload/panCardFront', upload.single('panCardFront'), uploadPanCardFront);
router.post('/upload/panCardBack', upload.single('panCardBack'), uploadPanCardBack);
router.post('/upload/govDocFront', upload.single('govDocFront'), uploadGovDocFront);
router.post('/upload/govDocBack', upload.single('govDocBack'), uploadGovDocBack);
router.post('/upload/selfie', upload.single('selfie'), uploadSelfie);

router.get('/getKycStatus', verifyToken, getKycStatus);

module.exports = router;

