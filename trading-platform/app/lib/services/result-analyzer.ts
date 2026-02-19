import { Signal } from '@/app/types';

interface SignalAnalysisResult {
  totalSignals: number;
  evaluatedSignals: number;
  hitRate: number;
  avgReturn: number;
  expectedReturn: number;
  byType: Record<'BUY' | 'SELL' | 'HOLD', { total: number; hits: number; avgReturn: number }>;
  byConfidence: Record<'high' | 'medium' | 'low', { total: number; hits: number; avgReturn: number }>;
  bySymbol: Record<string, { total: number; hits: number; avgReturn: number }>;
}

export class ResultAnalyzer {
  analyze(signals: Signal[]): SignalAnalysisResult {
    const evaluated = signals.filter(s => s.result && s.result !== 'PENDING');
    const hits = evaluated.filter(s => s.result === 'HIT');
    
    const byType: SignalAnalysisResult['byType'] = {
      BUY: this.analyzeGroup(evaluated.filter(s => s.type === 'BUY')),
      SELL: this.analyzeGroup(evaluated.filter(s => s.type === 'SELL')),
      HOLD: this.analyzeGroup(evaluated.filter(s => s.type === 'HOLD')),
    };
    
    const byConfidence: SignalAnalysisResult['byConfidence'] = {
      high: this.analyzeGroup(evaluated.filter(s => s.confidence > 0.7)),
      medium: this.analyzeGroup(evaluated.filter(s => s.confidence > 0.5 && s.confidence <= 0.7)),
      low: this.analyzeGroup(evaluated.filter(s => s.confidence <= 0.5)),
    };
    
    const bySymbol: Record<string, { total: number; hits: number; avgReturn: number }> = {};
    evaluated.forEach(s => {
      if (!bySymbol[s.symbol]) {
        bySymbol[s.symbol] = { total: 0, hits: 0, avgReturn: 0 };
      }
      bySymbol[s.symbol].total++;
      if (s.result === 'HIT') bySymbol[s.symbol].hits++;
      bySymbol[s.symbol].avgReturn += s.actualReturn || 0;
    });
    
    Object.keys(bySymbol).forEach(symbol => {
      if (bySymbol[symbol].total > 0) {
        bySymbol[symbol].avgReturn /= bySymbol[symbol].total;
      }
    });
    
    const totalReturn = evaluated.reduce((sum, s) => sum + (s.actualReturn || 0), 0);
    const expectedReturn = evaluated.length > 0 ? totalReturn / evaluated.length : 0;
    
    return {
      totalSignals: signals.length,
      evaluatedSignals: evaluated.length,
      hitRate: evaluated.length > 0 ? (hits.length / evaluated.length) * 100 : 0,
      avgReturn: evaluated.length > 0 ? totalReturn / evaluated.length : 0,
      expectedReturn,
      byType,
      byConfidence,
      bySymbol,
    };
  }
  
  private analyzeGroup(signals: Signal[]): { total: number; hits: number; avgReturn: number } {
    const hits = signals.filter(s => s.result === 'HIT').length;
    const totalReturn = signals.reduce((sum, s) => sum + (s.actualReturn || 0), 0);
    return {
      total: signals.length,
      hits,
      avgReturn: signals.length > 0 ? totalReturn / signals.length : 0,
    };
  }
  
  getRecommendations(analysis: SignalAnalysisResult): string[] {
    const recommendations: string[] = [];
    
    const highHitRate = analysis.byConfidence.high.total > 0 
      ? (analysis.byConfidence.high.hits / analysis.byConfidence.high.total) * 100 
      : 0;
    const lowHitRate = analysis.byConfidence.low.total > 0 
      ? (analysis.byConfidence.low.hits / analysis.byConfidence.low.total) * 100 
      : 0;
    
    if (highHitRate > lowHitRate + 10) {
      recommendations.push('高確信シグナルが優秀です。低確信シグナルの閾値を上げることを検討してください。');
    }
    
    if (analysis.byConfidence.low.total > analysis.byConfidence.high.total * 2) {
      recommendations.push('低確信シグナルが多すぎます。シグナル生成の閾値を上げてください。');
    }
    
    let bestTypeName = 'BUY';
    let bestTypeRate = 0;
    Object.entries(analysis.byType).forEach(([type, data]) => {
      const rate = data.total > 0 ? (data.hits / data.total) * 100 : 0;
      if (rate > bestTypeRate && data.total > 0) {
        bestTypeRate = rate;
        bestTypeName = type;
      }
    });
    if (bestTypeRate > 0) {
      recommendations.push(`${bestTypeName}シグナルが最も高い勝率(${bestTypeRate.toFixed(1)}%)を示しています。`);
    }
    
    if (recommendations.length === 0) {
      recommendations.push('データを蓄積して分析を続けてください。');
    }
    
    return recommendations;
  }
}
