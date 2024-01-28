const express = require("express");
const router = express.Router();

const {marketsData, globalStats} = require("../controllers/marketsController");

router.get("/marketsData", marketsData);
router.get("/globalStats", globalStats);

module.exports = router;
