const KYC = require("../models/kycSchema");
const User = require("../models/userSchema");

async function personalInfo(req, res) {
  try {
    const kyc = new KYC(req.body);
    const newkyc = await kyc.save();

    return res.status(200).json({
      message: "Personal Information saved!",
      kyc: newkyc,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "An error occured!",
      error,
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

async function getKycStatus(req, res) {
  try {
    const user = await User.findById(req.user.user);
    const kyc = user.kyc;
    if (kyc) {
      const kycInfo = await KYC.findById(kyc);
      return res.status(200).json({
        status: kycInfo.status,
      });
    }
    return res.status(200).json({
      status: "empty",
    });
  } catch (error) {
    res.status(500).json({
      message: "An error occured",
      error,
    });
  }
}

module.exports = {
  personalInfo,
  uploadPanCardFront,
  uploadPanCardBack,
  uploadGovDocFront,
  uploadGovDocBack,
  uploadSelfie,
  getKycStatus,
};
