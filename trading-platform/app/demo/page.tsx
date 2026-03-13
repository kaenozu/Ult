'use client';

import React, { useMemo } from 'react';
import { BeginnerSignalCard } from '@/app/components/signal/BeginnerSignalCard';
import { StockChart } from '@/app/components/StockChart/StockChart';
import { Header } from '@/app/components/Header';
import { AIRecommendationPanel } from '@/app/components/AIRecommendationPanel';
import { Stock, Signal, OHLCV } from '@/app/types';

/**
 * 成功体験デモページ (Sato-san Scenario)
 * 初心者がこのアプリを使って利益を出すまでの一連の流れを可視化します。
 */
export default function DemoPage() {
  // 1. デモ用の銘柄データ (トヨタ自動車)
  const mockStock: Stock = {
    symbol: '7203',
    name: 'トヨタ自動車',
    price: 2500,
    change: 45,
    changePercent: 1.83,
    market: 'japan',
    sector: '輸送用機器',
    volume: 12500000,

  };

  // 2. デモ用の完璧なAIシグナル
  const mockSignal: Signal = {
    symbol: '7203',
    type: 'BUY',
    confidence: 88,
    accuracy: 82,
    expectedValue: 1.25,
    targetPrice: 2650,
    stopLoss: 2480,
    atr: 35,
    reason: '強力な上昇トレンドを検出。RSI・ボリンジャーバンドが買いポイントで一致しています。過去の同様のパターンでは高い確率で利益が出ています。',
    predictedChange: 6.0,
    predictionDate: new Date().toISOString(),
    indicatorCount: 3,
    agreeingIndicators: ['RSI', 'MACD', 'BB'],
    driftRisk: 'LOW',
  };

  // 3. チャート用のダミー履歴データ (右肩上がり)
  const mockHistory: OHLCV[] = useMemo(() => {
    const data: OHLCV[] = [];
    let basePrice = 2300;
    const now = new Date();
    
    for (let i = 30; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const volatility = (Math.random() - 0.4) * 20; // Slightly bullish bias
      basePrice += volatility;
      
      data.push({
        date: date.toISOString().split('T')[0],
        open: basePrice - 5,
        high: basePrice + 15,
        low: basePrice - 10,
        close: basePrice,
        volume: 1000000 + Math.random() * 500000,
      });
    }
    return data;
  }, []);

  // 4. 初心者フィルタを通した後のデータ
  const beginnerSignal = {
    action: 'BUY' as const,
    confidence: 88,
    reason: mockSignal.reason,
    riskLevel: 'low' as const,
    historicalWinRate: 82,
    expectedValue: 1.25,
    indicatorCount: 3,
    autoRisk: {
      stopLossPrice: 2480,
      takeProfitPrice: 2650,
      stopLossPercent: 0.8,
      takeProfitPercent: 6.0,
      recommendedShares: 300,
      expectedProfitAmount: 45000,
      expectedLossAmount: 6000,
    },
    rawSignal: {
      symbol: '7203',
      type: 'BUY' as const,
      confidence: 88
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1118] text-white font-sans">
      <Header />
      
      <main className="container mx-auto p-4 lg:p-8 space-y-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-black tracking-tighter">
            🌟 初心者成功体験デモ
          </h1>
          <p className="text-[#92adc9] text-sm max-w-2xl">
            「佐藤さん」がアプリを開いて、AIの指示通りにトヨタ株を300株購入し、利益を確定させるまでのシミュレーション画面です。
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左側：チャートと推奨銘柄 */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#141e27] p-6 rounded-2xl border border-[#233648] shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold text-xl">
                    72
                  </div>
                  <div>
                    <h2 className="text-xl font-bold leading-none">{mockStock.name}</h2>
                    <span className="text-xs text-[#92adc9]">{mockStock.symbol}.T | 🇯🇵 日本市場</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black tabular-nums">¥{mockStock.price.toLocaleString()}</div>
                  <div className="text-xs font-bold text-green-400">+{mockStock.change} ({mockStock.changePercent}%)</div>
                </div>
              </div>
              
              <div className="h-[400px] w-full rounded-xl overflow-hidden bg-black/20">
                <StockChart 
                  data={mockHistory} 
                  signal={mockSignal}
                  height={400}
                />
              </div>
            </div>

            <AIRecommendationPanel 
              signals={[mockSignal]} 
              onSelectSignal={() => {}} 
            />
          </div>

          {/* 右側：初心者用指示カード */}
          <div className="space-y-6">
            <div className="sticky top-20 space-y-4">
              <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-xl flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-black text-xl">
                  💡
                </div>
                <div>
                  <div className="text-yellow-500 font-black text-sm">初心者モード稼働中</div>
                  <p className="text-[10px] text-yellow-500/80">AIが最も安全で高確率な指示だけを表示しています。</p>
                </div>
              </div>

              <BeginnerSignalCard 
                signal={beginnerSignal as any} 
                currentPrice={2500}
                onExecute={() => alert('デモ注文が送信されました！指示通りの価格・株数で予約します。')}
              />

              <div className="bg-[#141e27] p-5 rounded-2xl border border-[#233648] space-y-4">
                <h3 className="text-sm font-bold text-[#92adc9]">💡 この画面の使い方</h3>
                <ul className="space-y-3">
                  {[
                    '左のチャートでAIの「買い矢印」を確認',
                    '青色の枠にある「推奨株数」をチェック',
                    '下の大きなボタンを押して注文を確定',
                    'あとはAIが指定した「目標利益」まで待つだけ'
                  ].map((step, i) => (
                    <li key={i} className="flex gap-3 text-xs">
                      <span className="flex-shrink-0 w-5 h-5 bg-[#233648] rounded-full flex items-center justify-center font-bold text-[10px]">
                        {i + 1}
                      </span>
                      <span className="text-white/80">{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
