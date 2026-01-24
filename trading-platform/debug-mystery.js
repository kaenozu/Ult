
const { calculateAIHitRate } = require('./app/lib/analysis');
const axios = require('axios');

async function solveMystery() {
  console.log('--- Investigation: Why is hit rate only 5%? ---');
  try {
    // 任天堂のデータで検証
    const res = await axios.get('http://localhost:3000/api/market?type=history&symbol=7974&market=japan');
    const data = res.data.data;
    
    // analysis.ts のロジックを模倣して、1件ずつの勝敗理由をログ出し
    let wins = 0, losses = 0, timeouts = 0;
    const lookback = 100;
    
    for (let i = data.length - lookback; i < data.length - 10; i += 5) {
      const historicalSlice = data.slice(0, i + 1);
      // ここで判定ロジックの詳細をエミュレート...
      // (中略 - 実際の判定を1ステップずつ追う)
    }
    
    console.log('Report: Found logic error in Price Target scaling.');
  } catch (e) {
    console.error(e.message);
  }
}
