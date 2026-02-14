/**
 * Behavioral Warning Demo Page
 * 
 * Demonstrates the AI Behavioral Bias Warning System in action
 */

'use client';

import { useState } from 'react';
import { Navigation } from '@/app/components/Navigation';
import { ScreenLabel } from '@/app/components/ScreenLabel';
import { useGuardedOrderExecution } from '@/app/hooks/useGuardedOrderExecution';
import { useExtendedJournalStore } from '@/app/store/journalStore';
import { usePortfolioStore } from '@/app/store/portfolioStore';
import { OrderRequest } from '@/app/types/order';
import { JournalEntry } from '@/app/types';
import { cn } from '@/app/lib/utils';

export default function BehavioralWarningDemoPage() {
  const { executeGuardedOrder } = useGuardedOrderExecution();
  const { psychologyState, activeWarnings, recordTradeForPsychology } = useExtendedJournalStore();
  const portfolio = usePortfolioStore(state => state.portfolio);
  
  const [quantity, setQuantity] = useState(100);
  const [orderStatus, setOrderStatus] = useState<string>('');

  // Simulate a trade for demonstration
  const simulateTrade = async (isWin: boolean) => {
    const profit = isWin ? 100 : -50;
    const entry: JournalEntry = {
      id: `demo_${Date.now()}`,
      symbol: 'AAPL',
      date: new Date().toISOString(),
      signalType: 'BUY',
      entryPrice: 150,
      exitPrice: isWin ? 152 : 149,
      quantity: 10,
      profit,
      profitPercent: (profit / (150 * 10)) * 100,
      notes: `Demo ${isWin ? 'win' : 'loss'}`,
      status: 'CLOSED',
    };

    recordTradeForPsychology(entry, portfolio.cash);
    setOrderStatus(`Simulated ${isWin ? 'winning' : 'losing'} trade`);
  };

  // Execute a guarded order
  const executeOrder = async () => {
    setOrderStatus('Executing order...');

    const order: OrderRequest = {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      market: 'usa',
      side: 'LONG',
      quantity,
      price: 155.50,
      orderType: 'MARKET',
    };

    try {
      const result = await executeGuardedOrder(order);
      if (result.success) {
        setOrderStatus(`✅ Order executed successfully! ID: ${result.orderId}`);
      }
    } catch (error) {
      setOrderStatus(`❌ Order cancelled: ${(error as Error).message}`);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#101922] text-white overflow-hidden">
      <ScreenLabel label="行動バイアス警告システム / Behavioral Bias Warning" />
      {/* Header */}
      <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-[#233648] bg-[#101922] px-6 py-3 shrink-0">
        <div className="flex items-center gap-3 text-white">
          <div className="size-8 bg-primary/20 rounded-lg flex items-center justify-center text-primary">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </div>
          <h2 className="text-white text-lg font-bold leading-tight tracking-tight">行動バイアス警告システム - デモ</h2>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#101922] overflow-auto p-6">
          <div className="max-w-6xl mx-auto w-full space-y-6">
            {/* Psychology State Card */}
            <div className="bg-[#192633] rounded-lg border border-[#233648] p-6">
              <h3 className="text-xl font-bold mb-4">現在の心理状態</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#101922] rounded-lg p-4">
                  <div className="text-sm text-[#92adc9] mb-1">現在のストリーク</div>
                  <div className={cn(
                    'text-2xl font-bold',
                    psychologyState.currentStreak === 'winning' ? 'text-green-500' :
                    psychologyState.currentStreak === 'losing' ? 'text-red-500' :
                    'text-white'
                  )}>
                    {psychologyState.currentStreak === 'winning' ? `${psychologyState.consecutiveWins}連勝` :
                     psychologyState.currentStreak === 'losing' ? `${psychologyState.consecutiveLosses}連敗` :
                     'ニュートラル'}
                  </div>
                </div>
                <div className="bg-[#101922] rounded-lg p-4">
                  <div className="text-sm text-[#92adc9] mb-1">リスク許容度</div>
                  <div className="text-2xl font-bold text-white">
                    {(psychologyState.riskTolerance * 100).toFixed(0)}%
                  </div>
                </div>
                <div className="bg-[#101922] rounded-lg p-4">
                  <div className="text-sm text-[#92adc9] mb-1">本日の取引</div>
                  <div className="text-2xl font-bold text-white">{psychologyState.tradesToday}</div>
                </div>
              </div>

              {/* Active Warnings */}
              {activeWarnings.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h4 className="text-sm font-semibold text-yellow-400 uppercase tracking-wider">
                    アクティブ警告 ({activeWarnings.length})
                  </h4>
                  {activeWarnings.map((warning, index) => (
                    <div key={index} className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                      <div className="text-sm font-medium text-yellow-400">{warning.message}</div>
                      <div className="text-xs text-[#92adc9] mt-1">推奨: {warning.recommendation}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Simulation Controls */}
            <div className="bg-[#192633] rounded-lg border border-[#233648] p-6">
              <h3 className="text-xl font-bold mb-4">シミュレーション</h3>
              <p className="text-[#92adc9] mb-4">
                連続損失や復讐トレードをシミュレートして、警告システムの動作を確認できます。
              </p>
              
              <div className="flex gap-3 mb-6">
                <button
                  onClick={() => simulateTrade(false)}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
                >
                  損失を記録
                </button>
                <button
                  onClick={() => simulateTrade(true)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
                >
                  勝利を記録
                </button>
              </div>

              <div className="h-px bg-[#233648] my-6" />

              <h4 className="text-lg font-semibold mb-4">保護された注文実行</h4>
              <p className="text-[#92adc9] mb-4">
                以下の注文を実行すると、心理状態に基づいて警告が表示されるか、ブロックされる場合があります。
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#92adc9] mb-2">
                    数量 (株)
                  </label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2 bg-[#101922] border border-[#233648] rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    min="1"
                    step="100"
                  />
                  <p className="text-xs text-[#92adc9] mt-1">
                    ヒント: 大きな数量（500+）を入力すると、ポジションサイズ警告が表示されます
                  </p>
                </div>

                <button
                  onClick={executeOrder}
                  className="w-full px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors font-medium"
                >
                  保護された注文を実行
                </button>

                {orderStatus && (
                  <div className="bg-[#101922] border border-[#233648] rounded-lg p-4">
                    <div className="text-sm text-white">{orderStatus}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Info Card */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">
                  <h4 className="text-blue-400 font-semibold mb-2">システムの動作</h4>
                  <ul className="text-sm text-white/80 space-y-2">
                    <li>• 5連敗後は、すべての取引がブロックされます</li>
                    <li>• 連敗中のポジションサイズ拡大（50%以上）は復讐トレードとしてブロックされます</li>
                    <li>• 1日の取引回数が20回を超えると、確認ダイアログが表示されます</li>
                    <li>• 推奨ポジションサイズを大幅に超える場合、警告が表示されます</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <Navigation />
    </div>
  );
}
