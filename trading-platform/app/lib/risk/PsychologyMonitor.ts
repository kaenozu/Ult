/**
 * Psychology Monitor
 * 
 * TRADING-003: 心理管理自動化の導入
 * トレーダーの心理状態監視、過度なリスクテイク防止、感情的な取引の抑制
 */

import { Order, Position } from '@/app/types';
import {
  TradingBehaviorMetrics,
  PsychologyAlert,
  RiskTradingSession,
  BiasAnalysis,
  ConsecutiveLossInfo
} from '@/app/types/risk';
import { logger } from '@/app/core/logger';

export class PsychologyMonitor {
  private tradingHistory: Order[] = [];
  private sessions: RiskTradingSession[] = [];
  private currentSession: RiskTradingSession | null = null;
  private alerts: PsychologyAlert[] = [];

  /**
   * トレーディング行動を分析
   */
  analyzeTradingBehavior(): TradingBehaviorMetrics {
    if (this.tradingHistory.length === 0) {
      return this.getDefaultMetrics();
    }

    const completedTrades = this.tradingHistory.filter(
      order => order.status === 'FILLED'
    );

    // 損益計算
    const tradeResults = this.calculateTradeResults(completedTrades);
    const wins = tradeResults.filter(result => result.pnl > 0);
    const losses = tradeResults.filter(result => result.pnl < 0);

    const winRate = tradeResults.length > 0
      ? wins.length / tradeResults.length
      : 0;

    const lossRate = tradeResults.length > 0
      ? losses.length / tradeResults.length
      : 0;

    // 平均損益計算
    const avgWinSize = wins.length > 0
      ? wins.reduce((sum, win) => sum + win.pnl, 0) / wins.length
      : 0;

    const avgLossSize = losses.length > 0
      ? losses.reduce((sum, loss) => sum + Math.abs(loss.pnl), 0) / losses.length
      : 0;

    // プロフィットファクター計算
    const totalWins = wins.reduce((sum, win) => sum + win.pnl, 0);
    const totalLosses = losses.reduce((sum, loss) => sum + Math.abs(loss.pnl), 0);
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;

    // 連続勝ち負けを計算
    const { consecutiveWins, consecutiveLosses } = this.calculateConsecutiveResults();

    // オーバートレーディングスコアを計算
    const overTradingScore = this.calculateOverTradingScore();

    // 感情的トレーディングスコアを計算
    const emotionalTradingScore = this.calculateEmotionalTradingScore();

    // 平均保有時間を計算（時間単位）
    const averageHoldTime = this.calculateAverageHoldTime();

    return {
      averageHoldTime,
      winRate,
      lossRate,
      avgWinSize,
      avgLossSize,
      profitFactor,
      consecutiveWins,
      consecutiveLosses,
      overTradingScore,
      emotionalTradingScore
    };
  }

  /**
   * 心理状態アラートを生成
   */
  generatePsychologyAlerts(positions?: Position[]): PsychologyAlert[] {
    const metrics = this.analyzeTradingBehavior();
    const newAlerts: PsychologyAlert[] = [];

    // オーバートレーディングの検出
    if (metrics.overTradingScore > 70) {
      newAlerts.push({
        type: 'overtrading',
        severity: metrics.overTradingScore > 85 ? 'high' : 'medium',
        message: `過度な取引が検出されました。スコア: ${metrics.overTradingScore.toFixed(0)}`,
        recommendation: '取引頻度を減らし、質の高いセットアップのみに焦点を当ててください。',
        timestamp: new Date()
      });
    }

    // リベンジトレーディングの検出
    if (metrics.consecutiveLosses >= 3) {
      newAlerts.push({
        type: 'revenge_trading',
        severity: metrics.consecutiveLosses >= 5 ? 'high' : 'medium',
        message: `連続損失が${metrics.consecutiveLosses}回続いています。`,
        recommendation: '一時的に取引を停止し、戦略を見直してください。',
        timestamp: new Date()
      });
    }

    // 感情的トレーディングの検出
    if (metrics.emotionalTradingScore > 70) {
      newAlerts.push({
        type: metrics.consecutiveWins >= 3 ? 'greed' : 'fear',
        severity: metrics.emotionalTradingScore > 85 ? 'high' : 'medium',
        message: `感情的な取引パターンが検出されました。スコア: ${metrics.emotionalTradingScore.toFixed(0)}`,
        recommendation: '冷静さを取り戻し、トレーディングプランに従ってください。',
        timestamp: new Date()
      });
    }

    // 疲労の検出
    if (this.currentSession && this.isTraderFatigued()) {
      newAlerts.push({
        type: 'fatigue',
        severity: 'medium',
        message: '長時間の取引により疲労が検出されました。',
        recommendation: '休憩を取り、明日再開してください。',
        timestamp: new Date()
      });
    }

    // TRADING-025: 追加のバイアス検出
    // FOMOの検出
    const recentTrades = this.getRecentTrades(1);
    if (recentTrades.length >= 3) {
      newAlerts.push({
        type: 'fomo',
        severity: 'high',
        message: '短時間に複数の取引が検出されました。FOMO（取り残される恐怖）の可能性があります。',
        recommendation: '一度立ち止まり、取引計画を確認してください。感情ではなく戦略に基づいて取引してください。',
        timestamp: new Date()
      });
    }

    // 確認バイアスの検出
    if (positions && positions.length > 0) {
      const longLosingPositions = positions.filter(p => 
        p.currentPrice < p.avgPrice && 
        this.getPositionHoldTime(p) > 7
      );
      
      if (longLosingPositions.length > 0) {
        newAlerts.push({
          type: 'confirmation_bias',
          severity: 'high',
          message: `${longLosingPositions.length}つの損失ポジションを長期保有しています。確認バイアスの可能性があります。`,
          recommendation: '客観的にポジションを評価し、損切りルールに従ってください。希望的観測ではなくデータに基づいて判断してください。',
          timestamp: new Date()
        });
      }
    }

    // 損失嫌悪の検出
    if (metrics.consecutiveLosses >= 2) {
      const recentBuys = this.getRecentTrades(24).filter(t => t.side === 'BUY');
      const symbols = new Set(recentBuys.map(t => t.symbol));
      
      if (symbols.size < recentBuys.length / 2) {
        newAlerts.push({
          type: 'loss_aversion',
          severity: 'high',
          message: '連続損失後に同じシンボルを買い増ししています。損失嫌悪バイアスの可能性があります。',
          recommendation: '損失を取り戻そうとする心理に注意してください。平均化戦略は慎重に行い、リスク管理を優先してください。',
          timestamp: new Date()
        });
      }
    }

    this.alerts.push(...newAlerts);
    return newAlerts;
  }

  /**
   * トレーディングセッションを開始
   */
  startSession(): void {
    this.currentSession = {
      id: `session_${Date.now()}`,
      startTime: new Date().toISOString(),
      tradesCount: 0,
      winCount: 0,
      lossCount: 0,
      totalProfit: 0,
      emotions: [],
      violations: [],
      notes: '',
      emotionalState: 'calm',
      decisionQuality: 100,
      profitLoss: 0
    } as any;
  }

  /**
   * トレーディングセッションを終了
   */
  endSession(): void {
    if (this.currentSession) {
      this.currentSession.endTime = new Date().toISOString();
      this.sessions.push(this.currentSession);
      this.currentSession = null;
    }
  }

  /**
   * 取引を記録
   */
  recordTrade(order: Order): void {
    this.tradingHistory.push(order);

    if (this.currentSession) {
      this.currentSession.tradesCount++;
      this.updateEmotionalState();
      this.updateDecisionQuality();
    }

    // リアルタイムでアラートをチェック
    const alerts = this.generatePsychologyAlerts();
    if (alerts.length > 0) {
      this.notifyAlerts(alerts);
    }
  }

  /**
   * 過度なリスクテイクをチェック
   */
  checkExcessiveRiskTaking(
    proposedPosition: { size: number; riskAmount: number },
    normalRiskAmount: number
  ): {
    isExcessive: boolean;
    riskMultiplier: number;
    recommendation: string;
  } {
    const riskMultiplier = proposedPosition.riskAmount / normalRiskAmount;

    const isExcessive = riskMultiplier > 1.5;

    let recommendation = '';
    if (isExcessive) {
      if (riskMultiplier > 2.0) {
        recommendation = '極めて危険：通常の2倍以上のリスクです。ポジションサイズを大幅に縮小してください。';
      } else {
        recommendation = '警告：通常より50%以上高いリスクです。ポジションサイズの見直しを推奨します。';
      }
    }

    return {
      isExcessive,
      riskMultiplier,
      recommendation
    };
  }

  /**
   * 取引ルール違反をチェック
   */
  checkRuleViolation(
    order: Order,
    rules: {
      maxTradesPerDay?: number;
      maxLossPerDay?: number;
      requiredStopLoss?: boolean;
    }
  ): {
    hasViolation: boolean;
    violations: string[];
  } {
    const violations: string[] = [];

    // 1日の最大取引回数チェック
    if (rules.maxTradesPerDay) {
      const todayTrades = this.getTodayTrades();
      if (todayTrades.length >= rules.maxTradesPerDay) {
        violations.push(`1日の最大取引回数（${rules.maxTradesPerDay}回）を超えています。`);
      }
    }

    // 1日の最大損失チェック
    if (rules.maxLossPerDay) {
      const todayLoss = this.getTodayLoss();
      if (todayLoss >= rules.maxLossPerDay) {
        violations.push(`1日の最大損失額（$${rules.maxLossPerDay}）に達しています。`);
      }
    }

    // ストップロスの必須チェック
    if (rules.requiredStopLoss) {
      // TODO: orderにstopLossが設定されているかチェック
    }

    return {
      hasViolation: violations.length > 0,
      violations
    };
  }

  /**
   * アラートを取得
   */
  getAlerts(severity?: PsychologyAlert['severity']): PsychologyAlert[] {
    if (severity) {
      return this.alerts.filter(alert => alert.severity === severity);
    }
    return this.alerts;
  }

  /**
   * アラートをクリア
   */
  clearAlerts(): void {
    this.alerts = [];
  }

  // ============================================================================
  // TRADING-025: Enhanced Bias Detection
  // ============================================================================

  /**
   * バイアス分析を実行
   */
  detectBiases(trade: Order, positions?: Position[]): BiasAnalysis {
    const detectedBiases: string[] = [];
    let maxSeverity: 'low' | 'medium' | 'high' = 'low';

    // FOMO検出
    const fomo = this.detectFOMO(trade);
    if (fomo) {
      detectedBiases.push('FOMO (恐れによる取引)');
      maxSeverity = this.escalateSeverity(maxSeverity, 'medium');
    }

    // 恐怖バイアス検出
    const fear = this.detectFearBias(trade);
    if (fear) {
      detectedBiases.push('恐怖バイアス (早すぎた利益確定)');
      maxSeverity = this.escalateSeverity(maxSeverity, 'medium');
    }

    // 確認バイアス検出
    const confirmationBias = this.detectConfirmationBias(trade, positions);
    if (confirmationBias) {
      detectedBiases.push('確認バイアス (損失ポジションの長期保有)');
      maxSeverity = this.escalateSeverity(maxSeverity, 'high');
    }

    // 損失嫌悪検出
    const lossAversion = this.detectLossAversion(trade);
    if (lossAversion) {
      detectedBiases.push('損失嫌悪 (損失ポジションへの追加投資)');
      maxSeverity = this.escalateSeverity(maxSeverity, 'high');
    }

    const recommendations = this.generateBiasRecommendations(detectedBiases);

    return {
      detectedBiases,
      severity: maxSeverity,
      recommendations
    };
  }

  /**
   * 連続損失情報を取得
   */
  detectConsecutiveLosses(history: Order[]): ConsecutiveLossInfo {
    let count = 0;
    let totalLoss = 0;
    let startedAt = new Date();
    let lastLossAt = new Date();

    // 最新から遡って連続損失をカウント
    const tradeResults = this.calculateTradeResults(history.filter(o => o.status === 'FILLED'));
    
    for (let i = tradeResults.length - 1; i >= 0; i--) {
      const result = tradeResults[i];
      if (result.pnl < 0) {
        if (count === 0) lastLossAt = new Date(result.trade.timestamp || Date.now());
        count++;
        totalLoss += Math.abs(result.pnl);
        startedAt = new Date(result.trade.timestamp || Date.now());
      } else if (count > 0) {
        break;
      }
    }

    return {
      count,
      totalLoss,
      startedAt,
      lastLossAt
    };
  }

  /**
   * FOMO (Fear of Missing Out) を検出
   */
  private detectFOMO(trade: Order): boolean {
    const recentTrades = this.getRecentTrades(1); // 過去1時間
    
    // 短時間に複数取引
    if (recentTrades.length >= 3) {
      return true;
    }

    // 連続勝利後の大きな取引
    const metrics = this.analyzeTradingBehavior();
    if (metrics.consecutiveWins >= 3 && trade.quantity > this.getAverageTradeSize() * 1.5) {
      return true;
    }

    return false;
  }

  /**
   * 恐怖バイアスを検出
   */
  private detectFearBias(trade: Order): boolean {
    // 売却取引で、平均保有時間より大幅に短い場合
    if (trade.side === 'SELL') {
      const metrics = this.analyzeTradingBehavior();
      return metrics.consecutiveLosses >= 2;
    }
    return false;
  }

  /**
   * 確認バイアスを検出
   */
  private detectConfirmationBias(trade: Order, positions?: Position[]): boolean {
    if (!positions || positions.length === 0) return false;

    // 損失ポジションを長期保有している場合
    const losingPositions = positions.filter(p => 
      p.currentPrice < p.avgPrice && 
      this.getPositionHoldTime(p) > 7 // 7日以上保有
    );

    return losingPositions.length > 0;
  }

  /**
   * 損失嫌悪を検出
   */
  private detectLossAversion(trade: Order): boolean {
    const metrics = this.analyzeTradingBehavior();
    
    // 連続損失後に同じシンボルを買い増し
    if (metrics.consecutiveLosses >= 2 && trade.side === 'BUY') {
      const recentLosses = this.getRecentTrades(24).filter(t => 
        t.side === 'BUY' && t.symbol === trade.symbol
      );
      return recentLosses.length >= 2;
    }

    return false;
  }

  /**
   * バイアス推奨メッセージを生成
   */
  private generateBiasRecommendations(biases: string[]): string[] {
    if (biases.length === 0) {
      return ['心理的バイアスは検出されませんでした。良好な取引判断を継続してください。'];
    }

    return [
      `以下のバイアスが検出されました: ${biases.join(', ')}`,
      '取引計画を見直し、客観的な判断を行ってください',
      '必要に応じてクーリングオフ期間を設けてください',
      '感情日記をつけて、バイアスのパターンを認識してください'
    ];
  }

  /**
   * 深刻度をエスカレート
   */
  private escalateSeverity(
    current: 'low' | 'medium' | 'high',
    newSeverity: 'low' | 'medium' | 'high'
  ): 'low' | 'medium' | 'high' {
    const levels = { low: 1, medium: 2, high: 3 };
    return levels[newSeverity] > levels[current] ? newSeverity : current;
  }

  /**
   * 平均取引サイズを取得
   */
  private getAverageTradeSize(): number {
    if (this.tradingHistory.length === 0) return 100;
    
    const totalQuantity = this.tradingHistory.reduce(
      (sum, trade) => sum + trade.quantity,
      0
    );
    return totalQuantity / this.tradingHistory.length;
  }

  /**
   * ポジション保有時間を取得（日数）
   */
  private getPositionHoldTime(position: Position): number {
    const entryDate = new Date(position.entryDate || Date.now());
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - entryDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * 連続勝ち負けを計算
   */
  private calculateConsecutiveResults(): {
    consecutiveWins: number;
    consecutiveLosses: number;
  } {
    let consecutiveWins = 0;
    let consecutiveLosses = 0;
    let currentStreak = 0;
    let isWinStreak = true;

    // 最新の取引から遡って計算
    for (let i = this.tradingHistory.length - 1; i >= 0; i--) {
      const trade = this.tradingHistory[i];
      // 簡易的な勝ち負け判定
      const isWin = trade.side === 'SELL';

      if (i === this.tradingHistory.length - 1) {
        isWinStreak = isWin;
        currentStreak = 1;
      } else if ((isWin && isWinStreak) || (!isWin && !isWinStreak)) {
        currentStreak++;
      } else {
        break;
      }
    }

    if (isWinStreak) {
      consecutiveWins = currentStreak;
    } else {
      consecutiveLosses = currentStreak;
    }

    return { consecutiveWins, consecutiveLosses };
  }

  /**
   * オーバートレーディングスコアを計算
   */
  private calculateOverTradingScore(): number {
    const recentTrades = this.getRecentTrades(24); // 過去24時間

    // 1時間あたりの取引数
    const tradesPerHour = recentTrades.length / 24;

    // 正常な取引頻度を1時間に1回とする
    const normalFrequency = 1;
    const overTradingRatio = tradesPerHour / normalFrequency;

    // 0-100のスコアに変換
    return Math.min(100, overTradingRatio * 50);
  }

  /**
   * 感情的トレーディングスコアを計算
   */
  private calculateEmotionalTradingScore(): number {
    let score = 0;

    // 連続勝ち負けによる感情的傾向
    const { consecutiveWins, consecutiveLosses } = this.calculateConsecutiveResults();

    if (consecutiveWins >= 3) {
      score += consecutiveWins * 10; // 過信
    }

    if (consecutiveLosses >= 3) {
      score += consecutiveLosses * 15; // 恐怖・報復
    }

    // 急激な取引頻度の変化
    const recentTrades = this.getRecentTrades(6);
    const previousTrades = this.getRecentTrades(12).slice(0, -6);

    if (recentTrades.length > previousTrades.length * 2) {
      score += 30; // 急激な増加
    }

    return Math.min(100, score);
  }

  /**
   * 平均保有時間を計算
   */
  private calculateAverageHoldTime(): number {
    // TODO: 実際のentry/exit時間から計算
    return 4; // デフォルト4時間
  }

  /**
   * トレーダーの疲労を判定
   */
  private isTraderFatigued(): boolean {
    if (!this.currentSession) return false;

    const sessionDuration = Date.now() - new Date(this.currentSession.startTime).getTime();
    const hoursTrading = sessionDuration / (1000 * 60 * 60);

    // 4時間以上の連続取引で疲労と判定
    return hoursTrading >= 4;
  }

  /**
   * 感情状態を更新
   */
  private updateEmotionalState(): void {
    if (!this.currentSession) return;

    const metrics = this.analyzeTradingBehavior();

    if (metrics.consecutiveWins >= 3) {
      this.currentSession.emotionalState = 'excited';
    } else if (metrics.consecutiveLosses >= 3) {
      this.currentSession.emotionalState = 'fearful';
    } else if (this.isTraderFatigued()) {
      this.currentSession.emotionalState = 'tired';
    } else {
      this.currentSession.emotionalState = 'calm';
    }
  }

  /**
   * 意思決定の質を更新
   */
  private updateDecisionQuality(): void {
    if (!this.currentSession) return;

    const metrics = this.analyzeTradingBehavior();

    let quality = 100;

    // オーバートレーディングで減点
    quality -= metrics.overTradingScore * 0.3;

    // 感情的取引で減点
    quality -= metrics.emotionalTradingScore * 0.3;

    // 疲労で減点
    if (this.isTraderFatigued()) {
      quality -= 20;
    }

    this.currentSession.decisionQuality = Math.max(0, quality);
  }

  /**
   * 最近の取引を取得
   */
  private getRecentTrades(hours: number): Order[] {
    const cutoffTime = Date.now() - hours * 60 * 60 * 1000;
    return this.tradingHistory.filter(
      trade => (trade.timestamp || 0) >= cutoffTime
    );
  }

  /**
   * 今日の取引を取得
   */
  private getTodayTrades(): Order[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();

    return this.tradingHistory.filter(
      trade => (trade.timestamp || 0) >= todayTimestamp
    );
  }

  /**
   * 取引結果を計算（損益計算）
   */
  private calculateTradeResults(trades: Order[]): { pnl: number; trade: Order }[] {
    const results: { pnl: number; trade: Order }[] = [];
    
    // 価格情報がない場合は従来のsideベース判定にフォールバック
    const hasPrice = trades.some(t => t.price && t.price > 0);
    if (!hasPrice) {
      // 後方互換性: priceがない場合はSELL=利益、BUY=損失として扱う
      return trades.map(trade => ({
        pnl: trade.side === 'SELL' ? 1 : trade.side === 'BUY' ? -1 : 0,
        trade
      }));
    }
    
    const positionMap = new Map<string, { quantity: number; avgPrice: number }>();

    for (const trade of trades) {
      const price = trade.price || 0;
      
      if (trade.side === 'BUY') {
        // 買いポジションを追加/更新
        const current = positionMap.get(trade.symbol);
        if (current) {
          const totalQuantity = current.quantity + trade.quantity;
          const totalCost = current.quantity * current.avgPrice + trade.quantity * price;
          positionMap.set(trade.symbol, {
            quantity: totalQuantity,
            avgPrice: totalCost / totalQuantity
          });
        } else {
          positionMap.set(trade.symbol, { quantity: trade.quantity, avgPrice: price });
        }
      } else if (trade.side === 'SELL') {
        // 売りで損益確定
        const position = positionMap.get(trade.symbol);
        if (position && position.quantity > 0) {
          const sellQuantity = Math.min(trade.quantity, position.quantity);
          const pnl = (price - position.avgPrice) * sellQuantity;
          results.push({ pnl, trade });
          
          // ポジションを減らす
          const remainingQuantity = position.quantity - sellQuantity;
          if (remainingQuantity > 0) {
            positionMap.set(trade.symbol, { ...position, quantity: remainingQuantity });
          } else {
            positionMap.delete(trade.symbol);
          }
        }
      }
    }

    return results;
  }

  /**
   * 今日の損失を計算
   */
  private getTodayLoss(): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();
    
    const todayTrades = this.tradingHistory.filter(
      trade => trade.status === 'FILLED' && (trade.timestamp || 0) >= todayTimestamp
    );
    
    const tradeResults = this.calculateTradeResults(todayTrades);
    const totalLoss = tradeResults
      .filter(result => result.pnl < 0)
      .reduce((sum, result) => sum + Math.abs(result.pnl), 0);
    
    return totalLoss;
  }

  /**
   * アラートを通知
   */
  private notifyAlerts(alerts: PsychologyAlert[]): void {
    // 専用ロガーを使用してアラートを記録
    alerts.forEach(alert => {
      logger.warn(
        `Psychology Alert [${alert.type}]: ${alert.message}`,
        {
          severity: alert.severity,
          recommendation: alert.recommendation,
          timestamp: alert.timestamp
        },
        'PsychologyMonitor'
      );
    });
  }

  /**
   * デフォルトメトリクスを取得
   */
  private getDefaultMetrics(): TradingBehaviorMetrics {
    return {
      averageHoldTime: 0,
      winRate: 0,
      lossRate: 0,
      avgWinSize: 0,
      avgLossSize: 0,
      profitFactor: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
      overTradingScore: 0,
      emotionalTradingScore: 0
    };
  }
}

export const createPsychologyMonitor = (): PsychologyMonitor => {
  return new PsychologyMonitor();
};