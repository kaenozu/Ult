/**
 * Prediction Clouds Demo Page
 * 
 * 予測雲機能のデモページ
 */

import { PredictionCloudsChart } from '@/app/components/PredictionCloudsChart';
import { OHLCV } from '@/app/types';

// サンプルデータを生成
function generateSampleData(): OHLCV[] {
  const data: OHLCV[] = [];
  const basePrice = 5000;
  let currentPrice = basePrice;
  
  const startDate = new Date('2024-01-01');
  
  for (let i = 0; i < 60; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    // ランダムウォークで価格を生成
    const change = (Math.random() - 0.48) * 100; // わずかに上昇トレンド
    currentPrice += change;
    
    const volatility = 80;
    const open = currentPrice + (Math.random() - 0.5) * 30;
    const close = currentPrice;
    const high = Math.max(open, close) + Math.random() * volatility;
    const low = Math.min(open, close) - Math.random() * volatility;
    const volume = 1000000 + Math.random() * 2000000;
    
    data.push({
      date: date.toISOString().split('T')[0],
      open: Math.round(open),
      high: Math.round(high),
      low: Math.round(low),
      close: Math.round(close),
      volume: Math.round(volume),
    });
  }
  
  return data;
}

export default function PredictionCloudsPage() {
  const sampleData = generateSampleData();
  
  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* ヘッダー */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white">
            予測雲（Prediction Clouds）
          </h1>
          <p className="text-slate-400 max-w-2xl">
            ATR（平均真波幅）に基づく株価予測の可視化。
            過去の価格変動から統計的に予測される未来の価格範囲を「雲」として表示します。
          </p>
        </div>

        {/* メインチャート */}
        <section className="bg-slate-900/50 rounded-xl p-6 border border-slate-800">
          <PredictionCloudsChart
            symbol="DEMO"
            data={sampleData}
            height={500}
            mode="full"
          />
        </section>

        {/* 機能説明 */}
        <section className="grid md:grid-cols-2 gap-6">
          <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-800">
            <h2 className="text-xl font-semibold text-white mb-4">
              予測雲とは？
            </h2>
            <div className="space-y-3 text-slate-400 text-sm">
              <p>
                予測雲は、株価の未来の変動範囲を統計的に予測し、視覚的に表現したものです。
                過去の価格データからATR（平均真波幅）を計算し、その変動性を基に予測範囲を算出します。
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>
                  <strong className="text-white">ATR（Average True Range）</strong>:
                  過去N日間の真の変動幅の平均を示す指標。ボラティリティの尺度として使用されます。
                </li>
                <li>
                  <strong className="text-white">信頼区間</strong>:
                  標準偏差に基づく統計的な信頼度。1.5倍ATRは約87%の確率で価格が範囲内に収まることを示します。
                </li>
                <li>
                  <strong className="text-white">予測期間</strong>:
                  未来5営業日先までの価格範囲を予測。期間が長いほど不確実性が増大します。
                </li>
              </ul>
            </div>
          </div>

          <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-800">
            <h2 className="text-xl font-semibold text-white mb-4">
              使い方
            </h2>
            <div className="space-y-3 text-slate-400 text-sm">
              <p>
                予測雲を活用することで、トレード戦略の意思決定を支援できます。
              </p>
              <ul className="list-disc list-inside space-y-2">
                <li>
                  <strong className="text-white">エントリーポイントの選定</strong>:
                  雲の下限近くで買い、上限近くで売る戦略が有効です。
                </li>
                <li>
                  <strong className="text-white">リスク管理</strong>:
                  雲の幅が広い（ボラティリティ高）場合は、ポジションサイズを小さくするなど、
                  リスクを抑制する必要があります。
                </li>
                <li>
                  <strong className="text-white">トレンド確認</strong>:
                  雲の中心線が上向きなら上昇トレンド、下向きなら下降トレンドと判断できます。
                </li>
              </ul>
              <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <p className="text-amber-400 text-xs">
                  <strong>免責事項:</strong> 予測雲は統計的な予測であり、
                  実際の市場動向を保証するものではありません。投資判断は自己責任で行ってください。
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 技術仕様 */}
        <section className="bg-slate-900/50 rounded-xl p-6 border border-slate-800">
          <h2 className="text-xl font-semibold text-white mb-4">
            技術仕様
          </h2>
          <div className="grid md:grid-cols-3 gap-6 text-sm">
            <div>
              <h3 className="text-white font-medium mb-2">計算ロジック</h3>
              <ul className="space-y-1 text-slate-400">
                <li>• ATR期間: 14日（デフォルト）</li>
                <li>• 標準倍率: 1.5倍ATR（87%信頼区間）</li>
                <li>• 保守的倍率: 1.0倍ATR（68%信頼区間）</li>
                <li>• 楽観的倍率: 2.0倍ATR（95%信頼区間）</li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-medium mb-2">リスク評価</h3>
              <ul className="space-y-1 text-slate-400">
                <li>• 低リスク: ATR% &lt; 1.5%</li>
                <li>• 中リスク: ATR% 1.5%〜3.0%</li>
                <li>• 高リスク: ATR% 3.0%〜5.0%</li>
                <li>• 極端リスク: ATR% &gt; 5.0%</li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-medium mb-2">パフォーマンス</h3>
              <ul className="space-y-1 text-slate-400">
                <li>• 計算時間: &lt; 10ms（1年分データ）</li>
                <li>• メモリ使用量: ~100KB</li>
                <li>• キャッシュ対応: 予測結果を自動キャッシュ</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
