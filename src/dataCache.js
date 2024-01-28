let marketsDataCache = null;
let globalStatsCache = null;

function setMarketsData(data) {
  marketsDataCache = data;
}

function getMarketsData() {
  return marketsDataCache;
}

function setGlobalStats(data) {
  globalStatsCache = data;
}

function getGlobalStats() {
  return globalStatsCache;
}

module.exports = { setMarketsData, getMarketsData, setGlobalStats, getGlobalStats };
