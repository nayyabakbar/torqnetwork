const axios = require('axios');
const schedule = require("node-schedule");
const dataCache = require("../dataCache");


async function fetchMarketsData(){
    const url = process.env.LCW_COINS_URI;
    const apiKey = process.env.LCW_COINS_API;
    const bodyObject = {
      codes: ["BTC", "ETH","BNB", "SOL","XRP","ADA","DOGE","AVAX","TRX","LINK","DOT","TON","MATIC","SHIB","DAI","LTC","ICP","BCH", "UNI","ATOM"],
      currency: "USD",
      sort: "rank",
      order: "ascending",
      offset: 0,
      limit: 0,
      meta: false,
    }
    const response = await axios.post(url, bodyObject, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
    });
    return response.data;
}

async function fetchGlobalStats(){
  const url = process.env.CMC_GLOBAL_URI;
  const apiKey = process.env.CMC_GLOBAL_API;

  const response = await axios.get(url, {
    headers: {
      Accepts: 'application/json',
      'X-CMC_PRO_API_KEY': apiKey,
    }
  });

  return response.data.data.quote.USD;
}

async function marketsData(req,res){
  try {
    let marketsData = dataCache.getMarketsData();

    if (!marketsData) {
      marketsData = await fetchMarketsData();
      dataCache.setMarketsData(marketsData);
    }

    res.status(200).json({ data: marketsData });

  } catch (error) {
    res.status(500).json({ message: 'An error occurred!' });
  }
}

async function globalStats(req,res){
  try {
    let globalStatsData = dataCache.getGlobalStats();
    if (!globalStatsData) {
      globalStatsData = await fetchGlobalStats();
      dataCache.setGlobalStats(globalStatsData);
    }

    res.status(200).json({ data: globalStatsData });

  } catch (error) {
    res.status(500).json({ message: 'An error occurred!' });
  }
}

schedule.scheduleJob('*/5 * * * *', async()=>{
  try {
    const marketsData = await fetchMarketsData();
    const globalStatsData = await fetchGlobalStats();

    dataCache.setMarketsData(marketsData);
    dataCache.setGlobalStats(globalStatsData);

    console.log('Data updated successfully.');
  } catch (error) {
    console.error('Error updating data:', error);
  }
})

module.exports = {marketsData, globalStats};
