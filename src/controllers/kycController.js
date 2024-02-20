const KYC = require("../models/kycSchema");
const User = require("../models/userSchema");


async function personalInfo(req,res){
    try{
      const kyc = new KYC(req.body);
      await kyc.save();
      
      return res.status(200).json({
        message: "Personal Information saved!"
      })
    }
    catch (error) {
      console.log(error)
      res.status(500).json({
        message: "An error occured!", error
      });
    }
}

async function uploadPanCardFront(req, res) {
    try {
     const kyc = await KYC.findById(req.body.kycId);
     kyc.panCardFront = req.file.filename;
     await kyc.save();

      res.status(200).json({
        success: true,
        message: "Photo Added!",
        photo: kyc.panCardFront,
      });
 
    } catch (error) {
      res.status(500).json({
        message: "An error occured",
        error,
      });
    }
}

async function uploadPanCardBack(req, res) {
    try {
     const kyc = await KYC.findById(req.body.kycId);
     kyc.panCardBack = req.file.filename;
     await kyc.save();

      res.status(200).json({
        success: true,
        message: "Photo Added!",
        photo: kyc.panCardBack,
      });
 
    } catch (error) {
      res.status(500).json({
        message: "An error occured",
        error,
      });
    }
}

async function uploadGovDocFront(req, res) {
    try {
     const kyc = await KYC.findById(req.body.kycId);
     kyc.govDocFront = req.file.filename;
     await kyc.save();

      res.status(200).json({
        success: true,
        message: "Photo Added!",
        photo: kyc.govDocFront,
      });
 
    } catch (error) {
      res.status(500).json({
        message: "An error occured",
        error,
      });
    }
}

async function uploadGovDocBack(req, res) {
    try {
     const kyc = await KYC.findById(req.body.kycId);
     kyc.govDocBack = req.file.filename;
     await kyc.save();

      res.status(200).json({
        success: true,
        message: "Photo Added!",
        photo: kyc.govDocBack,
      });
 
    } catch (error) {
      res.status(500).json({
        message: "An error occured",
        error,
      });
    }
}

async function uploadSelfie(req, res) {
    try {
     const kyc = await KYC.findById(req.body.kycId);
     kyc.selfie = req.file.filename;
     await kyc.save();

      res.status(200).json({
        success: true,
        message: "Photo Added!",
        photo: kyc.selfie,
      });
 
    } catch (error) {
      res.status(500).json({
        message: "An error occured",
        error,
      });
    }
}

modules.exports = {personalInfo, uploadPanCardFront, uploadPanCardBack, uploadGovDocFront, uploadGovDocBack, uploadSelfie};