'use client';

import { useMemo } from 'react';
import { AIRecommendationPanel } from '@/app/components/AIRecommendationPanel';
import { useSignalHistoryStore } from '@/app/store/signalHistoryStore';
import { useWatchlistStore } from '@/app/store/watchlistStore';
import { ResultAnalyzer } from '@/app/lib/services/result-analyzer';

export default function RecommendationsPage() {
  const { signals } = useSignalHistoryStore();
  const { watchlist } = useWatchlistStore();
  
  const analyzer = useMemo(() => new ResultAnalyzer(), []);
  const stats = useMemo(() => analyzer.analyze(signals), [signals, analyzer]);
  const recommendations = useMemo(() => analyzer.getRecommendations(stats), [stats, analyzer]);
  
  return (
    <div className="min-h-screen bg-[#101922] text-white p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">AI推奨銘柄</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: AI Recommendations */}
          <div className="lg:col-span-2">
            <AIRecommendationPanel 
              signals={signals.filter(s => s.confidence > 0.7)} 
              maxItems={10}
            />
            
            <div className="mt-6">
              <h2 className="text-lg font-semibold mb-3">分析・推奨事項</h2>
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                {recommendations.map((rec, i) => (
                  <p key={i} className="text-sm text-gray-300 mb-2">• {rec}</p>
                ))}
              </div>
            </div>
          </div>
          
          {/* Right: Stats */}
          <div className="space-y-4">
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">統計</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">総シグナル数</span>
                  <span className="font-medium">{stats.totalSignals}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">評価済み</span>
                  <span className="font-medium">{stats.evaluatedSignals}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">勝率</span>
                  <span className={`font-medium ${stats.hitRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                    {stats.hitRate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">平均リターン</span>
                  <span className={`font-medium ${stats.avgReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {stats.avgReturn >= 0 ? '+' : ''}{stats.avgReturn.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">確信度別</h3>
              <div className="space-y-2">
                {Object.entries(stats.byConfidence).map(([level, data]) => (
                  <div key={level} className="flex justify-between text-sm">
                    <span className={level === 'high' ? 'text-green-400' : level === 'medium' ? 'text-yellow-400' : 'text-red-400'}>
                      {level === 'high' ? '高' : level === 'medium' ? '中' : '低'}
                    </span>
                    <span className="text-gray-400">
                      {data.total}件 ({data.total > 0 ? ((data.hits / data.total) * 100).toFixed(0) : 0}%勝)
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">タイプ別</h3>
              <div className="space-y-2">
                {Object.entries(stats.byType).map(([type, data]) => (
                  <div key={type} className="flex justify-between text-sm">
                    <span className={type === 'BUY' ? 'text-green-400' : type === 'SELL' ? 'text-red-400' : 'text-gray-400'}>
                      {type}
                    </span>
                    <span className="text-gray-400">
                      {data.total}件 ({data.total > 0 ? ((data.hits / data.total) * 100).toFixed(0) : 0}%勝)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
