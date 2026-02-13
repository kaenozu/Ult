/**
 * Enhanced Portfolio Risk Monitor
 * 
 * TRADING-003: ポートフォリオリスク監視の強化
 * リアルタイムVaR更新、セクター集中度監視、ベータ計算改善
 */

import { Position, Portfolio, OHLCV } from '@/app/types';
import { RiskMetrics } from '@/app/types/risk';
import { calculateMaxDrawdownFromReturns, calculateVolatilityFlexible } from '@/app/lib/utils/calculations';

// ============================================================================
// Types
// ============================================================================

export interface SectorExposure {
  sector: string;
  exposure: number; // Percentage of portfolio
  positions: string[]; // Symbols in this sector
  concentration: number; // HHI for this sector
  risk: 'low' | 'medium' | 'high';
}

export interface EnhancedRiskMetrics extends RiskMetrics {
  sectorExposures: SectorExposure[];
  marketExposures: Map<string, number>;
  liquidity: number; // Portfolio liquidity score
  correlationMatrix: Map<string, Map<string, number>>;
  concentration: {
    herfindahlIndex: number;
    effectivePositions: number;
    top3Concentration: number;
  };
  realTimeVaR: {
    var95: number;
    var99: number;
    lastUpdate: Date;
    confidence: number;
  };
  enhancedBeta: {
    market: number;
    sector: number;
    style: number; // Growth/Value exposure
  };
}

export interface RiskAlert {
  type: 'sector_concentration' | 'var_breach' | 'beta_drift' | 'liquidity' | 'correlation_breakdown';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  metric: string;
  currentValue: number;
  threshold: number;
  recommendation: string;
  timestamp: Date;
}

interface SectorMapping {
  [symbol: string]: string;
}

// ============================================================================
// Enhanced Portfolio Risk Monitor
// ============================================================================

export class EnhancedPortfolioRiskMonitor {
  private portfolio: Portfolio;
  private priceHistory: Map<string, OHLCV[]> = new Map();
  private benchmarkReturns: number[] = [];
  private alerts: RiskAlert[] = [];
  private lastVaRUpdate: Date = new Date();
  private varUpdateInterval: number = 60000; // 1 minute
  
  // Sector mappings (in production, this would come from a data service)
  private sectorMapping: SectorMapping = {
    'AAPL': 'Technology',
    'MSFT': 'Technology',
    'GOOGL': 'Technology',
    'AMZN': 'Consumer Cyclical',
    'TSLA': 'Consumer Cyclical',
    'JPM': 'Financial',
    'BAC': 'Financial',
    'JNJ': 'Healthcare',
    'PFE': 'Healthcare',
    'XOM': 'Energy',
    'CVX': 'Energy',
  };

  constructor(portfolio: Portfolio) {
    this.portfolio = portfolio;
  }

  /**
   * 拡張リスクメトリクスを計算
   */
  calculateEnhancedRiskMetrics(): EnhancedRiskMetrics {
    const totalValue = this.portfolio.totalValue;
    
    // セクター暴露を計算
    const sectorExposures = this.calculateSectorExposures();
    
    // 市場暴露を計算
    const marketExposures = this.calculateMarketExposures();
    
    // 流動性スコアを計算
    const liquidity = this.calculateLiquidityScore();
    
    // 集中度指標を計算
    const concentration = this.calculateConcentrationMetrics();
    
    // リアルタイムVaRを計算
    const realTimeVaR = this.calculateRealTimeVaR();
    
    // 拡張ベータを計算
    const enhancedBeta = this.calculateEnhancedBeta();
    
    // 基本リスクメトリクス
    const returns = this.calculatePortfolioReturns();
    const volatility = this.calculateVolatility(returns);
    const maxDrawdown = this.calculateMaxDrawdown(returns);
    const currentDrawdown = this.calculateCurrentDrawdown(returns);
    const sharpeRatio = this.calculateSharpeRatio(returns, volatility);
    const sortinoRatio = this.calculateSortinoRatio(returns);
    
    // 相関行列を計算
    const correlationMatrix = this.calculateCorrelationMatrix();
    
    return {
      var95: realTimeVaR.var95,
      cvar95: realTimeVaR.var99 * 1.3, // Approximation
      beta: enhancedBeta.market,
      sharpeRatio,
      sortinoRatio,
      maxDrawdown,
      currentDrawdown,
      volatility,
      correlationMatrix,
      alpha: 0, // Would need benchmark returns
      sectorExposures,
      marketExposures,
      liquidity,
      concentration,
      realTimeVaR,
      enhancedBeta
    };
  }

  /**
   * セクター暴露を計算
   */
  private calculateSectorExposures(): SectorExposure[] {
    const totalValue = this.portfolio.totalValue;
    const sectorData = new Map<string, { value: number; positions: string[] }>();
    
    // セクター別に集計
    for (const position of this.portfolio.positions) {
      const sector = this.sectorMapping[position.symbol] || 'Unknown';
      const value = position.currentPrice * position.quantity;
      
      if (!sectorData.has(sector)) {
        sectorData.set(sector, { value: 0, positions: [] });
      }
      
      const data = sectorData.get(sector)!;
      data.value += value;
      data.positions.push(position.symbol);
    }
    
    // SectorExposure配列を作成
    const exposures: SectorExposure[] = [];
    
    for (const [sector, data] of sectorData.entries()) {
      const exposure = (data.value / totalValue) * 100;
      
      // セクター内の集中度（HHI）を計算
      const concentration = this.calculateSectorHHI(data.positions);
      
      // リスクレベルを判定
      let risk: 'low' | 'medium' | 'high' = 'low';
      if (exposure > 40) {
        risk = 'high';
      } else if (exposure > 25) {
        risk = 'medium';
      }
      
      exposures.push({
        sector,
        exposure,
        positions: data.positions,
        concentration,
        risk
      });
    }
    
    // 暴露の高い順にソート
    return exposures.sort((a, b) => b.exposure - a.exposure);
  }

  /**
   * セクター内HHIを計算
   */
  private calculateSectorHHI(symbols: string[]): number {
    const sectorValue = symbols.reduce((sum, symbol) => {
      const position = this.portfolio.positions.find(p => p.symbol === symbol);
      return sum + (position ? position.currentPrice * position.quantity : 0);
    }, 0);
    
    if (sectorValue === 0) return 0;
    
    let hhi = 0;
    for (const symbol of symbols) {
      const position = this.portfolio.positions.find(p => p.symbol === symbol);
      if (position) {
        const value = position.currentPrice * position.quantity;
        const weight = value / sectorValue;
        hhi += weight * weight;
      }
    }
    
    return hhi;
  }

  /**
   * 市場暴露を計算
   */
  private calculateMarketExposures(): Map<string, number> {
    const totalValue = this.portfolio.totalValue;
    const exposures = new Map<string, number>();
    
    for (const position of this.portfolio.positions) {
      const market = position.market || 'US';
      const value = position.currentPrice * position.quantity;
      const currentExposure = exposures.get(market) || 0;
      exposures.set(market, currentExposure + (value / totalValue) * 100);
    }
    
    return exposures;
  }

  /**
   * 流動性スコアを計算
   */
  private calculateLiquidityScore(): number {
    if (this.portfolio.positions.length === 0) return 100;
    
    let totalScore = 0;
    let totalWeight = 0;
    
    for (const position of this.portfolio.positions) {
      const weight = (position.currentPrice * position.quantity) / this.portfolio.totalValue;
      
      // 簡易的な流動性スコア（実際にはボリュームデータが必要）
      // 大型株は高流動性、小型株は低流動性と仮定
      const liquidityScore = 80; // デフォルト
      
      totalScore += liquidityScore * weight;
      totalWeight += weight;
    }
    
    return totalWeight > 0 ? totalScore / totalWeight : 80;
  }

  /**
   * 集中度メトリクスを計算
   */
  private calculateConcentrationMetrics(): {
    herfindahlIndex: number;
    effectivePositions: number;
    top3Concentration: number;
  } {
    const totalValue = this.portfolio.totalValue;
    
    if (totalValue === 0 || this.portfolio.positions.length === 0) {
      return {
        herfindahlIndex: 0,
        effectivePositions: 0,
        top3Concentration: 0
      };
    }
    
    // Herfindahl-Hirschman Index (HHI)
    let hhi = 0;
    const weights: number[] = [];
    
    for (const position of this.portfolio.positions) {
      const value = position.currentPrice * position.quantity;
      const weight = value / totalValue;
      weights.push(weight);
      hhi += weight * weight;
    }
    
    // 実効ポジション数（分散の逆数）
    const effectivePositions = hhi > 0 ? 1 / hhi : 0;
    
    // トップ3集中度
    const sortedWeights = [...weights].sort((a, b) => b - a);
    const top3Concentration = sortedWeights.slice(0, 3).reduce((sum, w) => sum + w, 0) * 100;
    
    return {
      herfindahlIndex: hhi,
      effectivePositions,
      top3Concentration
    };
  }

  /**
   * リアルタイムVaRを計算
   */
  private calculateRealTimeVaR(): {
    var95: number;
    var99: number;
    lastUpdate: Date;
    confidence: number;
  } {
    const now = new Date();
    
    // 更新間隔チェック
    if (now.getTime() - this.lastVaRUpdate.getTime() < this.varUpdateInterval) {
      // キャッシュされた値を返す（実際の実装ではキャッシュを保持）
    }
    
    const returns = this.calculatePortfolioReturns();
    
    if (returns.length < 30) {
      return {
        var95: 0.05 * this.portfolio.totalValue,
        var99: 0.10 * this.portfolio.totalValue,
        lastUpdate: now,
        confidence: 0.5
      };
    }
    
    // Historical VaR
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const var95Index = Math.floor(returns.length * 0.05);
    const var99Index = Math.floor(returns.length * 0.01);
    
    const var95 = Math.abs(sortedReturns[var95Index] || 0) * this.portfolio.totalValue;
    const var99 = Math.abs(sortedReturns[var99Index] || 0) * this.portfolio.totalValue;
    
    // 信頼度はデータポイント数に基づく
    const confidence = Math.min(1, returns.length / 100);
    
    this.lastVaRUpdate = now;
    
    return {
      var95,
      var99,
      lastUpdate: now,
      confidence
    };
  }

  /**
   * 拡張ベータを計算
   */
  private calculateEnhancedBeta(): {
    market: number;
    sector: number;
    style: number;
  } {
    const portfolioReturns = this.calculatePortfolioReturns();
    
    if (portfolioReturns.length < 20 || this.benchmarkReturns.length < 20) {
      return {
        market: 1.0,
        sector: 1.0,
        style: 0
      };
    }
    
    // 市場ベータ
    const marketBeta = this.calculateBeta(portfolioReturns, this.benchmarkReturns);
    
    // セクターベータ（簡略化）
    // 実際にはセクター別ベンチマークが必要
    const sectorBeta = marketBeta * 1.1; // Approximation
    
    // スタイルベータ（Growth/Value）
    // 正の値はGrowth、負の値はValue
    const styleExposure = this.calculateStyleExposure();
    
    return {
      market: marketBeta,
      sector: sectorBeta,
      style: styleExposure
    };
  }

  /**
   * スタイル暴露を計算
   */
  private calculateStyleExposure(): number {
    // 簡略化：テクノロジーセクターをGrowth、その他をValueとする
    let growthWeight = 0;
    let valueWeight = 0;
    const totalValue = this.portfolio.totalValue;
    
    for (const position of this.portfolio.positions) {
      const sector = this.sectorMapping[position.symbol] || 'Unknown';
      const weight = (position.currentPrice * position.quantity) / totalValue;
      
      if (sector === 'Technology') {
        growthWeight += weight;
      } else {
        valueWeight += weight;
      }
    }
    
    // -1 (完全Value) から +1 (完全Growth)
    return growthWeight - valueWeight;
  }

  /**
   * リスクアラートを生成
   */
  generateRiskAlerts(
    limits: {
      maxSectorExposure?: number;
      maxVaR95?: number;
      maxBeta?: number;
      minLiquidity?: number;
    }
  ): RiskAlert[] {
    const metrics = this.calculateEnhancedRiskMetrics();
    const newAlerts: RiskAlert[] = [];
    
    // セクター集中度アラート
    if (limits.maxSectorExposure) {
      for (const sector of metrics.sectorExposures) {
        if (sector.exposure > limits.maxSectorExposure) {
          newAlerts.push({
            type: 'sector_concentration',
            severity: sector.risk === 'high' ? 'critical' : 'warning',
            message: `${sector.sector}セクターの暴露が制限を超えています`,
            metric: 'sector_exposure',
            currentValue: sector.exposure,
            threshold: limits.maxSectorExposure,
            recommendation: `${sector.sector}セクターのポジションを削減してください。現在の暴露: ${sector.exposure.toFixed(1)}%`,
            timestamp: new Date()
          });
        }
      }
    }
    
    // VaRアラート
    if (limits.maxVaR95 && metrics.realTimeVaR.var95 > limits.maxVaR95) {
      newAlerts.push({
        type: 'var_breach',
        severity: 'critical',
        message: 'VaR (95%)が制限を超えています',
        metric: 'var95',
        currentValue: metrics.realTimeVaR.var95,
        threshold: limits.maxVaR95,
        recommendation: 'ポジションサイズを削減するか、ヘッジを検討してください',
        timestamp: new Date()
      });
    }
    
    // ベータアラート
    if (limits.maxBeta && Math.abs(metrics.enhancedBeta.market) > limits.maxBeta) {
      newAlerts.push({
        type: 'beta_drift',
        severity: 'warning',
        message: 'ポートフォリオベータが目標範囲を外れています',
        metric: 'beta',
        currentValue: metrics.enhancedBeta.market,
        threshold: limits.maxBeta,
        recommendation: 'ベータを調整するために低ベータ資産を追加してください',
        timestamp: new Date()
      });
    }
    
    // 流動性アラート
    if (limits.minLiquidity && metrics.liquidity < limits.minLiquidity) {
      newAlerts.push({
        type: 'liquidity',
        severity: 'warning',
        message: 'ポートフォリオの流動性が低下しています',
        metric: 'liquidity',
        currentValue: metrics.liquidity,
        threshold: limits.minLiquidity,
        recommendation: '流動性の高い銘柄への配分を増やしてください',
        timestamp: new Date()
      });
    }
    
    // 相関ブレークダウン検出
    const correlationIssue = this.detectCorrelationBreakdown();
    if (correlationIssue) {
      newAlerts.push({
        type: 'correlation_breakdown',
        severity: 'critical',
        message: '相関構造に異常が検出されました',
        metric: 'correlation',
        currentValue: correlationIssue.severity,
        threshold: 0.5,
        recommendation: correlationIssue.recommendation,
        timestamp: new Date()
      });
    }
    
    this.alerts.push(...newAlerts);
    return newAlerts;
  }

  /**
   * 相関ブレークダウンを検出
   * 
   * Detects abnormal correlation patterns such as:
   * - Assets that normally correlate positively showing negative correlation
   * - Correlation values significantly different from historical norms (>0.5 change)
   * - Market stress indicators based on correlation breakdown (correlation approaching 1)
   */
  private detectCorrelationBreakdown(): { severity: number; recommendation: string } | null {
    const matrix = this.calculateCorrelationMatrix();
    const symbols = Array.from(matrix.keys());
    
    if (symbols.length < 2) return null;
    
    let breakdownCount = 0;
    let perfectCorrelationCount = 0;
    let inverseCorrelationCount = 0;
    const abnormalPairs: string[] = [];
    
    // Analyze correlation matrix for abnormal patterns
    for (let i = 0; i < symbols.length; i++) {
      for (let j = i + 1; j < symbols.length; j++) {
        const symbol1 = symbols[i];
        const symbol2 = symbols[j];
        const correlation = matrix.get(symbol1)?.get(symbol2) || 0;
        
        // Detect perfect correlation (market stress indicator)
        if (correlation > 0.95) {
          perfectCorrelationCount++;
          abnormalPairs.push(`${symbol1}-${symbol2}`);
        }
        
        // Detect inverse correlation in normally correlated assets
        // Assuming same-sector assets should correlate positively
        const sector1 = this.sectorMapping[symbol1];
        const sector2 = this.sectorMapping[symbol2];
        
        if (sector1 && sector2 && sector1 === sector2 && correlation < -0.3) {
          inverseCorrelationCount++;
          breakdownCount++;
        }
        
        // Detect extreme correlation changes (would need historical data in production)
        // This is a simplified check for demonstration
        if (Math.abs(correlation) > 0.9 || (sector1 === sector2 && correlation < 0)) {
          breakdownCount++;
        }
      }
    }
    
    // Determine severity based on findings
    let severity = 0;
    let recommendation = '';
    
    if (perfectCorrelationCount > 0) {
      severity = Math.min(100, 30 + perfectCorrelationCount * 20);
      recommendation = `市場ストレス検出: ${perfectCorrelationCount}組の銘柄が完全相関しています。リスク分散が効いていない可能性があります。`;
    } else if (breakdownCount > 0) {
      severity = Math.min(100, 20 + breakdownCount * 15);
      recommendation = `相関ブレークダウン検出: ${breakdownCount}組の銘柄で異常な相関パターンが見られます。ポジションを見直してください。`;
    } else if (inverseCorrelationCount > 0) {
      severity = 20;
      recommendation = `逆相関検出: 同じセクターの銘柄間で逆相関が見られます。異常な市場動向の可能性があります。`;
    }
    
    return severity > 0 ? { severity, recommendation } : null;
  }

  /**
   * ポートフォリオリターンを計算
   * 
   * Calculates portfolio returns from price history. Uses position weights to calculate
   * weighted portfolio returns based on individual asset returns.
   */
  private calculatePortfolioReturns(): number[] {
    if (this.portfolio.positions.length === 0) return [];
    
    // Get all symbols with price history
    const symbols = this.portfolio.positions.map(p => p.symbol);
    const totalValue = this.portfolio.totalValue;
    
    if (totalValue <= 0) return [];
    
    // Calculate position weights
    const weights = new Map<string, number>();
    for (const position of this.portfolio.positions) {
      const value = position.currentPrice * position.quantity;
      weights.set(position.symbol, value / totalValue);
    }
    
    // Find the minimum length of price history across all positions
    let minLength = Infinity;
    for (const symbol of symbols) {
      const history = this.priceHistory.get(symbol);
      if (history && history.length > 1) {
        minLength = Math.min(minLength, history.length);
      }
    }
    
    if (minLength === Infinity || minLength < 2) return [];
    
    // Calculate portfolio returns
    const returns: number[] = [];
    
    for (let i = 1; i < minLength; i++) {
      let portfolioReturn = 0;
      
      for (const symbol of symbols) {
        const history = this.priceHistory.get(symbol);
        const weight = weights.get(symbol) || 0;
        
        if (history && history.length > i) {
          const currentPrice = history[i].close;
          const previousPrice = history[i - 1].close;
          
          if (previousPrice > 0) {
            const assetReturn = (currentPrice - previousPrice) / previousPrice;
            portfolioReturn += assetReturn * weight;
          }
        }
      }
      
      returns.push(portfolioReturn);
    }
    
    return returns;
  }

  /**
   * ボラティリティを計算
   */
  private calculateVolatility(returns: number[]): number {
    return calculateVolatilityFlexible(returns, true, true);
  }

  /**
   * 最大ドローダウンを計算
   */
  private calculateMaxDrawdown(returns: number[]): number {
    return calculateMaxDrawdownFromReturns(returns, true);
  }

  /**
   * 現在のドローダウンを計算
   */
  private calculateCurrentDrawdown(returns: number[]): number {
    if (returns.length === 0) return 0;
    
    let peak = 1;
    let cumulative = 1;
    
    for (const ret of returns) {
      cumulative *= (1 + ret);
      peak = Math.max(peak, cumulative);
    }
    
    return ((peak - cumulative) / peak) * 100;
  }

  /**
   * シャープレシオを計算
   */
  private calculateSharpeRatio(returns: number[], volatility: number): number {
    if (returns.length === 0 || volatility === 0) return 0;
    
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const annualizedReturn = mean * 252;
    const riskFreeRate = 0.02; // 2%
    
    return (annualizedReturn - riskFreeRate) / volatility;
  }

  /**
   * ソルティノレシオを計算
   */
  private calculateSortinoRatio(returns: number[]): number {
    if (returns.length === 0) return 0;
    
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const negativeReturns = returns.filter(r => r < 0);
    
    if (negativeReturns.length === 0) return 0;
    
    const downside = Math.sqrt(
      negativeReturns.reduce((sum, r) => sum + r * r, 0) / negativeReturns.length
    ) * Math.sqrt(252);
    
    const annualizedReturn = mean * 252;
    const riskFreeRate = 0.02;
    
    return downside > 0 ? (annualizedReturn - riskFreeRate) / downside : 0;
  }

  /**
   * ベータを計算
   */
  private calculateBeta(returns: number[], benchmarkReturns: number[]): number {
    if (returns.length < 2 || benchmarkReturns.length < 2) return 1;
    
    const minLength = Math.min(returns.length, benchmarkReturns.length);
    const ret = returns.slice(-minLength);
    const bench = benchmarkReturns.slice(-minLength);
    
    const meanRet = ret.reduce((sum, r) => sum + r, 0) / ret.length;
    const meanBench = bench.reduce((sum, r) => sum + r, 0) / bench.length;
    
    let covariance = 0;
    let benchVariance = 0;
    
    for (let i = 0; i < ret.length; i++) {
      covariance += (ret[i] - meanRet) * (bench[i] - meanBench);
      benchVariance += Math.pow(bench[i] - meanBench, 2);
    }
    
    return benchVariance > 0 ? covariance / benchVariance : 1;
  }

  /**
   * 相関行列を計算
   * 
   * Calculates actual correlations from price history data using Pearson correlation coefficient.
   * Requires sufficient price history data for accurate calculation.
   */
  private calculateCorrelationMatrix(): Map<string, Map<string, number>> {
    const matrix = new Map<string, Map<string, number>>();
    const symbols = this.portfolio.positions.map(p => p.symbol);
    
    // Calculate returns for each symbol
    const returnsMap = new Map<string, number[]>();
    
    for (const symbol of symbols) {
      const history = this.priceHistory.get(symbol);
      if (history && history.length > 1) {
        const returns: number[] = [];
        for (let i = 1; i < history.length; i++) {
          const prev = history[i - 1].close;
          const curr = history[i].close;
          if (prev > 0) {
            returns.push((curr - prev) / prev);
          }
        }
        returnsMap.set(symbol, returns);
      }
    }
    
    // Calculate correlation matrix
    for (const symbol1 of symbols) {
      const row = new Map<string, number>();
      const returns1 = returnsMap.get(symbol1);
      
      for (const symbol2 of symbols) {
        if (symbol1 === symbol2) {
          row.set(symbol2, 1);
        } else {
          const returns2 = returnsMap.get(symbol2);
          
          if (returns1 && returns2 && returns1.length > 1 && returns2.length > 1) {
            // Use minimum length for comparison
            const minLen = Math.min(returns1.length, returns2.length);
            const corr = this.calculatePearsonCorrelation(
              returns1.slice(-minLen),
              returns2.slice(-minLen)
            );
            row.set(symbol2, corr);
          } else {
            // Default correlation if insufficient data
            row.set(symbol2, 0);
          }
        }
      }
      
      matrix.set(symbol1, row);
    }
    
    return matrix;
  }
  
  /**
   * Pearson相関係数を計算
   */
  private calculatePearsonCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length < 2) return 0;
    
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * ポートフォリオを更新
   */
  updatePortfolio(portfolio: Portfolio): void {
    this.portfolio = portfolio;
  }

  /**
   * 価格履歴を更新
   */
  updatePriceHistory(symbol: string, history: OHLCV[]): void {
    this.priceHistory.set(symbol, history);
  }

  /**
   * ベンチマークリターンを更新
   */
  updateBenchmarkReturns(returns: number[]): void {
    this.benchmarkReturns = returns;
  }

  /**
   * アラートを取得
   */
  getAlerts(): RiskAlert[] {
    return this.alerts;
  }

  /**
   * アラートをクリア
   */
  clearAlerts(): void {
    this.alerts = [];
  }
}

export const createEnhancedPortfolioRiskMonitor = (
  portfolio: Portfolio
): EnhancedPortfolioRiskMonitor => {
  return new EnhancedPortfolioRiskMonitor(portfolio);
};
