# TRADING-006: ユーザー体験の向上

## 概要
高度なアラート通知システム、高度なチャート可視化、ダッシュボードカスタマイズ機能、キーボードショートカットの実装を通じて、ユーザー体験を向上させます。

## 問題の説明
現在のシステムには以下の課題があります：

1. **アラート通知の不備**
   - 基本的なアラートのみ
   - 通知チャネルの選択肢が限定的
   - アラート条件のカスタマイズが不十分

2. **チャート可視化の制限**
   - 基本的なチャートのみ
   - 高度なテクニカル分析ツールがない
   - カスタマイズ機能が不足している

3. **ダッシュボードの固定性**
   - 固定されたレイアウト
   - ユーザーごとのカスタマイズができない
   - ウィジェットの追加・削除ができない

4. **キーボードショートカットの欠如**
   - マウス操作のみ
   - キーボードショートカットがない
   - 効率的な操作ができない

## 影響
- ユーザー生産性の低下
- 重要な情報の見逃し
- ユーザー満足度の低下
- 競合他社との差別化不足

## 推奨される解決策

### 1. 高度なアラート通知システム

```typescript
// src/ui/alerts/AlertNotificationSystem.ts
import { EventEmitter } from 'events';

export interface AlertCondition {
  id: string;
  name: string;
  type: 'price' | 'indicator' | 'portfolio' | 'risk';
  symbol?: string;
  condition: string;
  threshold: number;
  enabled: boolean;
}

export interface Alert {
  id: string;
  conditionId: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  timestamp: number;
  acknowledged: boolean;
  data?: any;
}

export interface NotificationChannel {
  type: 'email' | 'sms' | 'push' | 'webhook' | 'slack';
  enabled: boolean;
  config: any;
}

export class AlertNotificationSystem extends EventEmitter {
  private conditions: Map<string, AlertCondition> = new Map();
  private alerts: Alert[] = new Array<Alert>();
  private channels: Map<string, NotificationChannel> = new Map();
  private maxAlerts = 1000;

  constructor() {
    super();
    this.initializeDefaultChannels();
  }

  private initializeDefaultChannels(): void {
    // デフォルトの通知チャネル
    this.channels.set('push', {
      type: 'push',
      enabled: true,
      config: {}
    });

    this.channels.set('email', {
      type: 'email',
      enabled: false,
      config: {
        recipient: '',
        subject: 'Trading Alert'
      }
    });
  }

  addCondition(condition: AlertCondition): void {
    this.conditions.set(condition.id, condition);
  }

  removeCondition(conditionId: string): void {
    this.conditions.delete(conditionId);
  }

  updateCondition(conditionId: string, updates: Partial<AlertCondition>): void {
    const condition = this.conditions.get(conditionId);
    if (condition) {
      this.conditions.set(conditionId, { ...condition, ...updates });
    }
  }

  checkConditions(marketData: Map<string, any>, portfolio: any): Alert[] {
    const triggeredAlerts: Alert[] = [];

    for (const [conditionId, condition] of this.conditions.entries()) {
      if (!condition.enabled) continue;

      const triggered = this.evaluateCondition(condition, marketData, portfolio);

      if (triggered) {
        const alert: Alert = {
          id: this.generateAlertId(),
          conditionId,
          message: this.generateAlertMessage(condition, triggered),
          severity: this.determineSeverity(condition, triggered),
          timestamp: Date.now(),
          acknowledged: false,
          data: triggered
        };

        this.alerts.push(alert);
        triggeredAlerts.push(alert);

        // 通知の送信
        this.sendNotifications(alert);

        // イベントの発行
        this.emit('alert', alert);
      }
    }

    // アラート履歴の管理
    if (this.alerts.length > this.maxAlerts) {
      this.alerts = this.alerts.slice(-this.maxAlerts);
    }

    return triggeredAlerts;
  }

  private evaluateCondition(
    condition: AlertCondition,
    marketData: Map<string, any>,
    portfolio: any
  ): any | null {
    switch (condition.type) {
      case 'price':
        return this.evaluatePriceCondition(condition, marketData);

      case 'indicator':
        return this.evaluateIndicatorCondition(condition, marketData);

      case 'portfolio':
        return this.evaluatePortfolioCondition(condition, portfolio);

      case 'risk':
        return this.evaluateRiskCondition(condition, portfolio);

      default:
        return null;
    }
  }

  private evaluatePriceCondition(
    condition: AlertCondition,
    marketData: Map<string, any>
  ): any | null {
    if (!condition.symbol) return null;

    const data = marketData.get(condition.symbol);
    if (!data || !data.ohlcv) return null;

    const currentPrice = data.ohlcv.close;

    // 条件の評価
    const operator = this.extractOperator(condition.condition);
    const threshold = condition.threshold;

    let triggered = false;

    switch (operator) {
      case '>':
        triggered = currentPrice > threshold;
        break;
      case '<':
        triggered = currentPrice < threshold;
        break;
      case '>=':
        triggered = currentPrice >= threshold;
        break;
      case '<=':
        triggered = currentPrice <= threshold;
        break;
      case '==':
        triggered = Math.abs(currentPrice - threshold) < 0.01;
        break;
    }

    if (triggered) {
      return {
        type: 'price',
        symbol: condition.symbol,
        currentPrice,
        threshold,
        change: ((currentPrice - threshold) / threshold) * 100
      };
    }

    return null;
  }

  private evaluateIndicatorCondition(
    condition: AlertCondition,
    marketData: Map<string, any>
  ): any | null {
    if (!condition.symbol) return null;

    const data = marketData.get(condition.symbol);
    if (!data || !data.indicators) return null;

    const indicatorName = condition.condition.split('.')[0];
    const indicator = data.indicators[indicatorName];

    if (!indicator) return null;

    const currentValue = indicator.value;
    const operator = this.extractOperator(condition.condition);
    const threshold = condition.threshold;

    let triggered = false;

    switch (operator) {
      case '>':
        triggered = currentValue > threshold;
        break;
      case '<':
        triggered = currentValue < threshold;
        break;
      case '>=':
        triggered = currentValue >= threshold;
        break;
      case '<=':
        triggered = currentValue <= threshold;
        break;
    }

    if (triggered) {
      return {
        type: 'indicator',
        symbol: condition.symbol,
        indicator: indicatorName,
        currentValue,
        threshold
      };
    }

    return null;
  }

  private evaluatePortfolioCondition(
    condition: AlertCondition,
    portfolio: any
  ): any | null {
    if (!portfolio) return null;

    let currentValue: number;
    switch (condition.condition) {
      case 'totalValue':
        currentValue = portfolio.totalValue;
        break;
      case 'dailyPnL':
        currentValue = portfolio.dailyPnL;
        break;
      case 'unrealizedPnL':
        currentValue = portfolio.unrealizedPnL;
        break;
      default:
        return null;
    }

    const operator = this.extractOperator(condition.condition);
    const threshold = condition.threshold;

    let triggered = false;

    switch (operator) {
      case '>':
        triggered = currentValue > threshold;
        break;
      case '<':
        triggered = currentValue < threshold;
        break;
      case '>=':
        triggered = currentValue >= threshold;
        break;
      case '<=':
        triggered = currentValue <= threshold;
        break;
    }

    if (triggered) {
      return {
        type: 'portfolio',
        metric: condition.condition,
        currentValue,
        threshold
      };
    }

    return null;
  }

  private evaluateRiskCondition(
    condition: AlertCondition,
    portfolio: any
  ): any | null {
    if (!portfolio || !portfolio.riskMetrics) return null;

    let currentValue: number;
    switch (condition.condition) {
      case 'maxDrawdown':
        currentValue = portfolio.riskMetrics.maxDrawdown;
        break;
      case 'var95':
        currentValue = portfolio.riskMetrics.valueAtRisk;
        break;
      case 'riskExposure':
        currentValue = portfolio.riskExposure;
        break;
      default:
        return null;
    }

    const operator = this.extractOperator(condition.condition);
    const threshold = condition.threshold;

    let triggered = false;

    switch (operator) {
      case '>':
        triggered = currentValue > threshold;
        break;
      case '<':
        triggered = currentValue < threshold;
        break;
      case '>=':
        triggered = currentValue >= threshold;
        break;
      case '<=':
        triggered = currentValue <= threshold;
        break;
    }

    if (triggered) {
      return {
        type: 'risk',
        metric: condition.condition,
        currentValue,
        threshold
      };
    }

    return null;
  }

  private extractOperator(condition: string): string {
    const match = condition.match(/[><=!]+/);
    return match ? match[0] : '==';
  }

  private generateAlertMessage(condition: AlertCondition, data: any): string {
    switch (data.type) {
      case 'price':
        return `${data.symbol}の価格が${data.currentPrice.toFixed(2)}に達しました（閾値: ${data.threshold}）`;

      case 'indicator':
        return `${data.symbol}の${data.indicator}が${data.currentValue.toFixed(2)}に達しました（閾値: ${data.threshold}）`;

      case 'portfolio':
        return `ポートフォリオの${data.metric}が${data.currentValue.toFixed(2)}に達しました（閾値: ${data.threshold}）`;

      case 'risk':
        return `リスク指標${data.metric}が${data.currentValue.toFixed(2)}に達しました（閾値: ${data.threshold}）`;

      default:
        return 'アラートがトリガーされました';
    }
  }

  private determineSeverity(condition: AlertCondition, data: any): 'info' | 'warning' | 'critical' {
    // リスク関連のアラートは重要度が高い
    if (data.type === 'risk') {
      return 'critical';
    }

    // ポートフォリオの損失は重要度が高い
    if (data.type === 'portfolio' && data.metric === 'dailyPnL' && data.currentValue < 0) {
      return data.currentValue < -1000 ? 'critical' : 'warning';
    }

    // 価格の大幅な変動は警告
    if (data.type === 'price' && Math.abs(data.change) > 5) {
      return 'warning';
    }

    return 'info';
  }

  private sendNotifications(alert: Alert): void {
    for (const [channelId, channel] of this.channels.entries()) {
      if (!channel.enabled) continue;

      switch (channel.type) {
        case 'push':
          this.sendPushNotification(alert);
          break;
        case 'email':
          this.sendEmailNotification(alert, channel.config);
          break;
        case 'sms':
          this.sendSMSNotification(alert, channel.config);
          break;
        case 'webhook':
          this.sendWebhookNotification(alert, channel.config);
          break;
        case 'slack':
          this.sendSlackNotification(alert, channel.config);
          break;
      }
    }
  }

  private sendPushNotification(alert: Alert): void {
    // プッシュ通知の送信
    this.emit('push-notification', alert);
  }

  private sendEmailNotification(alert: Alert, config: any): void {
    // メール通知の送信
    this.emit('email-notification', { alert, config });
  }

  private sendSMSNotification(alert: Alert, config: any): void {
    // SMS通知の送信
    this.emit('sms-notification', { alert, config });
  }

  private sendWebhookNotification(alert: Alert, config: any): void {
    // Webhook通知の送信
    this.emit('webhook-notification', { alert, config });
  }

  private sendSlackNotification(alert: Alert, config: any): void {
    // Slack通知の送信
    this.emit('slack-notification', { alert, config });
  }

  acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      this.emit('alert-acknowledged', alert);
    }
  }

  getAlerts(severity?: 'info' | 'warning' | 'critical', acknowledged?: boolean): Alert[] {
    let filtered = [...this.alerts];

    if (severity) {
      filtered = filtered.filter(a => a.severity === severity);
    }

    if (acknowledged !== undefined) {
      filtered = filtered.filter(a => a.acknowledged === acknowledged);
    }

    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }

  getCondition(conditionId: string): AlertCondition | undefined {
    return this.conditions.get(conditionId);
  }

  getConditions(): AlertCondition[] {
    return Array.from(this.conditions.values());
  }

  addChannel(channelId: string, channel: NotificationChannel): void {
    this.channels.set(channelId, channel);
  }

  removeChannel(channelId: string): void {
    this.channels.delete(channelId);
  }

  getChannel(channelId: string): NotificationChannel | undefined {
    return this.channels.get(channelId);
  }

  getChannels(): NotificationChannel[] {
    return Array.from(this.channels.values());
  }

  private generateAlertId(): string {
    return `ALERT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

### 2. 高度なチャート可視化

```typescript
// src/ui/charts/AdvancedChartVisualization.ts
import { MarketData, Indicator } from '@/types/trading';

export interface ChartConfig {
  type: 'candlestick' | 'line' | 'area' | 'bar';
  timeFrame: '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
  indicators: IndicatorConfig[];
  overlays: OverlayConfig[];
  drawingTools: DrawingTool[];
  theme: 'light' | 'dark';
}

export interface IndicatorConfig {
  id: string;
  type: 'RSI' | 'MACD' | 'SMA' | 'EMA' | 'BollingerBands' | 'ATR' | 'Stochastic';
  parameters: any;
  visible: boolean;
  color: string;
}

export interface OverlayConfig {
  id: string;
  type: 'support' | 'resistance' | 'trendline' | 'fibonacci';
  data: any;
  visible: boolean;
  color: string;
}

export interface DrawingTool {
  id: string;
  type: 'line' | 'rectangle' | 'circle' | 'text' | 'arrow';
  data: any;
  visible: boolean;
}

export class AdvancedChartVisualization {
  private config: ChartConfig;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private marketData: MarketData[] = [];
  private indicators: Map<string, any> = new Map();

  constructor(canvas: HTMLCanvasElement, config: ChartConfig) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.config = config;
    this.resizeCanvas();
  }

  setData(data: MarketData[]): void {
    this.marketData = data;
    this.calculateIndicators();
    this.render();
  }

  updateConfig(updates: Partial<ChartConfig>): void {
    this.config = { ...this.config, ...updates };
    this.calculateIndicators();
    this.render();
  }

  private calculateIndicators(): void {
    this.indicators.clear();

    for (const indicatorConfig of this.config.indicators) {
      if (!indicatorConfig.visible) continue;

      const indicator = this.calculateIndicator(indicatorConfig);
      if (indicator) {
        this.indicators.set(indicatorConfig.id, indicator);
      }
    }
  }

  private calculateIndicator(config: IndicatorConfig): any | null {
    switch (config.type) {
      case 'RSI':
        return this.calculateRSI(config.parameters);
      case 'MACD':
        return this.calculateMACD(config.parameters);
      case 'SMA':
        return this.calculateSMA(config.parameters);
      case 'EMA':
        return this.calculateEMA(config.parameters);
      case 'BollingerBands':
        return this.calculateBollingerBands(config.parameters);
      default:
        return null;
    }
  }

  private calculateRSI(parameters: { period: number }): any {
    const { period } = parameters;
    const rsiValues: number[] = [];

    for (let i = 0; i < this.marketData.length; i++) {
      if (i < period) {
        rsiValues.push(50);
        continue;
      }

      const slice = this.marketData.slice(i - period, i + 1);
      const gains: number[] = [];
      const losses: number[] = [];

      for (let j = 1; j < slice.length; j++) {
        const change = slice[j].ohlcv.close - slice[j - 1].ohlcv.close;
        if (change > 0) {
          gains.push(change);
          losses.push(0);
        } else {
          gains.push(0);
          losses.push(-change);
        }
      }

      const avgGain = gains.reduce((sum, g) => sum + g, 0) / period;
      const avgLoss = losses.reduce((sum, l) => sum + l, 0) / period;

      if (avgLoss === 0) {
        rsiValues.push(100);
      } else {
        const rs = avgGain / avgLoss;
        rsiValues.push(100 - (100 / (1 + rs)));
      }
    }

    return {
      type: 'RSI',
      values: rsiValues,
      parameters
    };
  }

  private calculateMACD(parameters: { fast: number; slow: number; signal: number }): any {
    const { fast, slow, signal } = parameters;
    const emaFast = this.calculateEMAValues(fast);
    const emaSlow = this.calculateEMAValues(slow);

    const macdLine: number[] = [];
    for (let i = 0; i < emaFast.length; i++) {
      macdLine.push(emaFast[i] - emaSlow[i]);
    }

    const signalLine = this.calculateEMAValues(signal, macdLine);
    const histogram: number[] = [];

    for (let i = 0; i < macdLine.length; i++) {
      histogram.push(macdLine[i] - signalLine[i]);
    }

    return {
      type: 'MACD',
      macdLine,
      signalLine,
      histogram,
      parameters
    };
  }

  private calculateSMA(parameters: { period: number }): any {
    const { period } = parameters;
    const smaValues: number[] = [];

    for (let i = 0; i < this.marketData.length; i++) {
      if (i < period) {
        smaValues.push(null);
        continue;
      }

      const slice = this.marketData.slice(i - period, i + 1);
      const sum = slice.reduce((sum, d) => sum + d.ohlcv.close, 0);
      smaValues.push(sum / period);
    }

    return {
      type: 'SMA',
      values: smaValues,
      parameters
    };
  }

  private calculateEMAValues(period: number, data?: number[]): number[] {
    const prices = data || this.marketData.map(d => d.ohlcv.close);
    const emaValues: number[] = [];

    const multiplier = 2 / (period + 1);

    // 最初の値はSMA
    let sum = 0;
    for (let i = 0; i < period && i < prices.length; i++) {
      sum += prices[i];
      emaValues.push(null);
    }

    if (prices.length >= period) {
      emaValues[period - 1] = sum / period;

      for (let i = period; i < prices.length; i++) {
        const ema = (prices[i] - emaValues[i - 1]!) * multiplier + emaValues[i - 1]!;
        emaValues.push(ema);
      }
    }

    return emaValues;
  }

  private calculateEMA(parameters: { period: number }): any {
    const values = this.calculateEMAValues(parameters.period);

    return {
      type: 'EMA',
      values,
      parameters
    };
  }

  private calculateBollingerBands(parameters: { period: number; stdDev: number }): any {
    const { period, stdDev } = parameters;
    const sma = this.calculateSMA({ period });
    const upperBand: number[] = [];
    const lowerBand: number[] = [];

    for (let i = 0; i < this.marketData.length; i++) {
      if (i < period) {
        upperBand.push(null);
        lowerBand.push(null);
        continue;
      }

      const slice = this.marketData.slice(i - period, i + 1);
      const mean = sma.values[i]!;

      const variance = slice.reduce((sum, d) => sum + Math.pow(d.ohlcv.close - mean, 2), 0) / period;
      const stdDeviation = Math.sqrt(variance);

      upperBand.push(mean + stdDev * stdDeviation);
      lowerBand.push(mean - stdDev * stdDeviation);
    }

    return {
      type: 'BollingerBands',
      upperBand,
      middleBand: sma.values,
      lowerBand,
      parameters
    };
  }

  private render(): void {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);

    // テーマに基づいた背景色
    this.ctx.fillStyle = this.config.theme === 'dark' ? '#1a1a1a' : '#ffffff';
    this.ctx.fillRect(0, 0, width, height);

    // グリッドの描画
    this.drawGrid();

    // チャートの描画
    this.drawChart();

    // インジケーターの描画
    this.drawIndicators();

    // オーバーレイの描画
    this.drawOverlays();

    // 描画ツールの描画
    this.drawDrawingTools();
  }

  private drawGrid(): void {
    const { width, height } = this.canvas;
    this.ctx.strokeStyle = this.config.theme === 'dark' ? '#333' : '#e0e0e0';
    this.ctx.lineWidth = 1;

    // 垂直線
    for (let x = 0; x < width; x += 100) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, height);
      this.ctx.stroke();
    }

    // 水平線
    for (let y = 0; y < height; y += 50) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(width, y);
      this.ctx.stroke();
    }
  }

  private drawChart(): void {
    if (this.marketData.length === 0) return;

    const { width, height } = this.canvas;
    const padding = 50;

    // 価格範囲の計算
    const prices = this.marketData.map(d => d.ohlcv);
    const minPrice = Math.min(...prices.map(p => p.low));
    const maxPrice = Math.max(...prices.map(p => p.high));
    const priceRange = maxPrice - minPrice;

    // 時間範囲の計算
    const minTime = this.marketData[0].timestamp;
    const maxTime = this.marketData[this.marketData.length - 1].timestamp;
    const timeRange = maxTime - minTime;

    // キャンドルスティックの描画
    const candleWidth = (width - padding * 2) / this.marketData.length;

    for (let i = 0; i < this.marketData.length; i++) {
      const data = this.marketData[i];
      const { open, high, low, close } = data.ohlcv;

      const x = padding + (i * candleWidth);
      const yHigh = padding + ((maxPrice - high) / priceRange) * (height - padding * 2);
      const yLow = padding + ((maxPrice - low) / priceRange) * (height - padding * 2);
      const yOpen = padding + ((maxPrice - open) / priceRange) * (height - padding * 2);
      const yClose = padding + ((maxPrice - close) / priceRange) * (height - padding * 2);

      // 色の決定
      const isBullish = close >= open;
      this.ctx.fillStyle = isBullish ? '#4caf50' : '#f44336';
      this.ctx.strokeStyle = isBullish ? '#4caf50' : '#f44336';

      // ヒゲの描画
      this.ctx.beginPath();
      this.ctx.moveTo(x + candleWidth / 2, yHigh);
      this.ctx.lineTo(x + candleWidth / 2, yLow);
      this.ctx.stroke();

      // 実体の描画
      const bodyTop = Math.min(yOpen, yClose);
      const bodyHeight = Math.abs(yClose - yOpen);

      this.ctx.fillRect(x + 1, bodyTop, candleWidth - 2, Math.max(bodyHeight, 1));
    }
  }

  private drawIndicators(): void {
    // インジケーターの描画
    for (const [id, indicator] of this.indicators.entries()) {
      const config = this.config.indicators.find(i => i.id === id);
      if (!config || !config.visible) continue;

      this.ctx.strokeStyle = config.color;
      this.ctx.lineWidth = 2;

      if (indicator.type === 'SMA' || indicator.type === 'EMA') {
        this.drawLineIndicator(indicator.values);
      } else if (indicator.type === 'RSI') {
        this.drawRSIIndicator(indicator.values);
      }
    }
  }

  private drawLineIndicator(values: (number | null)[]): void {
    const { width, height } = this.canvas;
    const padding = 50;

    const validValues = values.filter((v): v is number => v !== null);
    const minValue = Math.min(...validValues);
    const maxValue = Math.max(...validValues);
    const valueRange = maxValue - minValue;

    this.ctx.beginPath();

    let started = false;
    for (let i = 0; i < values.length; i++) {
      const value = values[i];
      if (value === null) {
        started = false;
        continue;
      }

      const x = padding + (i / values.length) * (width - padding * 2);
      const y = padding + ((maxValue - value) / valueRange) * (height - padding * 2);

      if (!started) {
        this.ctx.moveTo(x, y);
        started = true;
      } else {
        this.ctx.lineTo(x, y);
      }
    }

    this.ctx.stroke();
  }

  private drawRSIIndicator(values: number[]): void {
    // RSIは別のパネルに描画
    // 実際の実装ではサブチャートを作成
  }

  private drawOverlays(): void {
    // オーバーレイの描画
    for (const overlay of this.config.overlays) {
      if (!overlay.visible) continue;

      this.ctx.strokeStyle = overlay.color;
      this.ctx.lineWidth = 2;

      switch (overlay.type) {
        case 'support':
          this.drawHorizontalLine(overlay.data.price);
          break;
        case 'resistance':
          this.drawHorizontalLine(overlay.data.price);
          break;
        case 'trendline':
          this.drawTrendLine(overlay.data.start, overlay.data.end);
          break;
      }
    }
  }

  private drawHorizontalLine(price: number): void {
    const { width, height } = this.canvas;
    const padding = 50;

    const prices = this.marketData.map(d => d.ohlcv);
    const minPrice = Math.min(...prices.map(p => p.low));
    const maxPrice = Math.max(...prices.map(p => p.high));
    const priceRange = maxPrice - minPrice;

    const y = padding + ((maxPrice - price) / priceRange) * (height - padding * 2);

    this.ctx.beginPath();
    this.ctx.setLineDash([5, 5]);
    this.ctx.moveTo(padding, y);
    this.ctx.lineTo(width - padding, y);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }

  private drawTrendLine(start: { x: number; y: number }, end: { x: number; y: number }): void {
    this.ctx.beginPath();
    this.ctx.moveTo(start.x, start.y);
    this.ctx.lineTo(end.x, end.y);
    this.ctx.stroke();
  }

  private drawDrawingTools(): void {
    // 描画ツールの描画
    for (const tool of this.config.drawingTools) {
      if (!tool.visible) continue;

      this.ctx.strokeStyle = '#ff9800';
      this.ctx.lineWidth = 2;

      switch (tool.type) {
        case 'line':
          this.ctx.beginPath();
          this.ctx.moveTo(tool.data.start.x, tool.data.start.y);
          this.ctx.lineTo(tool.data.end.x, tool.data.end.y);
          this.ctx.stroke();
          break;
        case 'rectangle':
          this.ctx.strokeRect(
            tool.data.x,
            tool.data.y,
            tool.data.width,
            tool.data.height
          );
          break;
      }
    }
  }

  private resizeCanvas(): void {
    const parent = this.canvas.parentElement;
    if (parent) {
      this.canvas.width = parent.clientWidth;
      this.canvas.height = parent.clientHeight;
    }
  }

  exportImage(format: 'png' | 'jpeg' = 'png'): string {
    return this.canvas.toDataURL(`image/${format}`);
  }
}
```

### 3. ダッシュボードカスタマイズ機能

```typescript
// src/ui/dashboard/DashboardCustomization.ts
import { EventEmitter } from 'events';

export interface DashboardWidget {
  id: string;
  type: 'chart' | 'table' | 'metric' | 'alert' | 'order-book' | 'trade-history';
  title: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  config: any;
  visible: boolean;
}

export interface DashboardLayout {
  id: string;
  name: string;
  widgets: DashboardWidget[];
  theme: 'light' | 'dark';
  gridSize: { columns: number; rows: number };
}

export interface DashboardPreset {
  id: string;
  name: string;
  description: string;
  layout: DashboardLayout;
}

export class DashboardCustomization extends EventEmitter {
  private currentLayout: DashboardLayout;
  private layouts: Map<string, DashboardLayout> = new Map();
  private presets: DashboardPreset[] = [];

  constructor() {
    super();
    this.currentLayout = this.createDefaultLayout();
    this.initializePresets();
  }

  private createDefaultLayout(): DashboardLayout {
    return {
      id: 'default',
      name: 'Default Layout',
      widgets: [
        {
          id: 'main-chart',
          type: 'chart',
          title: 'Main Chart',
          position: { x: 0, y: 0 },
          size: { width: 8, height: 6 },
          config: {
            symbol: 'AAPL',
            timeFrame: '1h',
            indicators: ['RSI', 'MACD']
          },
          visible: true
        },
        {
          id: 'portfolio-metrics',
          type: 'metric',
          title: 'Portfolio Metrics',
          position: { x: 8, y: 0 },
          size: { width: 4, height: 3 },
          config: {
            metrics: ['totalValue', 'dailyPnL', 'winRate', 'sharpeRatio']
          },
          visible: true
        },
        {
          id: 'alerts',
          type: 'alert',
          title: 'Alerts',
          position: { x: 8, y: 3 },
          size: { width: 4, height: 3 },
          config: {
            maxAlerts: 10
          },
          visible: true
        }
      ],
      theme: 'dark',
      gridSize: { columns: 12, rows: 8 }
    };
  }

  private initializePresets(): void {
    this.presets = [
      {
        id: 'trader',
        name: 'Trader Layout',
        description: '最適化されたトレーダー向けレイアウト',
        layout: this.createTraderLayout()
      },
      {
        id: 'analyst',
        name: 'Analyst Layout',
        description: '分析向けレイアウト',
        layout: this.createAnalystLayout()
      },
      {
        id: 'minimal',
        name: 'Minimal Layout',
        description: 'シンプルなレイアウト',
        layout: this.createMinimalLayout()
      }
    ];
  }

  private createTraderLayout(): DashboardLayout {
    return {
      id: 'trader',
      name: 'Trader Layout',
      widgets: [
        {
          id: 'main-chart',
          type: 'chart',
          title: 'Main Chart',
          position: { x: 0, y: 0 },
          size: { width: 8, height: 6 },
          config: {},
          visible: true
        },
        {
          id: 'order-book',
          type: 'order-book',
          title: 'Order Book',
          position: { x: 8, y: 0 },
          size: { width: 4, height: 4 },
          config: {},
          visible: true
        },
        {
          id: 'trade-history',
          type: 'table',
          title: 'Trade History',
          position: { x: 8, y: 4 },
          size: { width: 4, height: 2 },
          config: {},
          visible: true
        },
        {
          id: 'alerts',
          type: 'alert',
          title: 'Alerts',
          position: { x: 0, y: 6 },
          size: { width: 12, height: 2 },
          config: {},
          visible: true
        }
      ],
      theme: 'dark',
      gridSize: { columns: 12, rows: 8 }
    };
  }

  private createAnalystLayout(): DashboardLayout {
    return {
      id: 'analyst',
      name: 'Analyst Layout',
      widgets: [
        {
          id: 'main-chart',
          type: 'chart',
          title: 'Main Chart',
          position: { x: 0, y: 0 },
          size: { width: 6, height: 4 },
          config: {},
          visible: true
        },
        {
          id: 'secondary-chart',
          type: 'chart',
          title: 'Secondary Chart',
          position: { x: 6, y: 0 },
          size: { width: 6, height: 4 },
          config: {},
          visible: true
        },
        {
          id: 'portfolio-metrics',
          type: 'metric',
          title: 'Portfolio Metrics',
          position: { x: 0, y: 4 },
          size: { width: 4, height: 2 },
          config: {},
          visible: true
        },
        {
          id: 'performance-chart',
          type: 'chart',
          title: 'Performance',
          position: { x: 4, y: 4 },
          size: { width: 8, height: 2 },
          config: {},
          visible: true
        },
        {
          id: 'trade-history',
          type: 'table',
          title: 'Trade History',
          position: { x: 0, y: 6 },
          size: { width: 12, height: 2 },
          config: {},
          visible: true
        }
      ],
      theme: 'light',
      gridSize: { columns: 12, rows: 8 }
    };
  }

  private createMinimalLayout(): DashboardLayout {
    return {
      id: 'minimal',
      name: 'Minimal Layout',
      widgets: [
        {
          id: 'main-chart',
          type: 'chart',
          title: 'Main Chart',
          position: { x: 0, y: 0 },
          size: { width: 12, height: 6 },
          config: {},
          visible: true
        },
        {
          id: 'portfolio-metrics',
          type: 'metric',
          title: 'Portfolio Metrics',
          position: { x: 0, y: 6 },
          size: { width: 12, height: 2 },
          config: {},
          visible: true
        }
      ],
      theme: 'dark',
      gridSize: { columns: 12, rows: 8 }
    };
  }

  getCurrentLayout(): DashboardLayout {
    return this.currentLayout;
  }

  setLayout(layout: DashboardLayout): void {
    this.currentLayout = layout;
    this.emit('layout-changed', layout);
  }

  saveLayout(name: string): void {
    const layout: DashboardLayout = {
      ...this.currentLayout,
      id: `custom-${Date.now()}`,
      name
    };

    this.layouts.set(layout.id, layout);
    this.emit('layout-saved', layout);
  }

  loadLayout(layoutId: string): void {
    const layout = this.layouts.get(layoutId) || this.presets.find(p => p.layout.id === layoutId)?.layout;

    if (layout) {
      this.currentLayout = layout;
      this.emit('layout-changed', layout);
    }
  }

  deleteLayout(layoutId: string): void {
    this.layouts.delete(layoutId);
    this.emit('layout-deleted', layoutId);
  }

  addWidget(widget: DashboardWidget): void {
    this.currentLayout.widgets.push(widget);
    this.emit('widget-added', widget);
  }

  removeWidget(widgetId: string): void {
    this.currentLayout.widgets = this.currentLayout.widgets.filter(w => w.id !== widgetId);
    this.emit('widget-removed', widgetId);
  }

  updateWidget(widgetId: string, updates: Partial<DashboardWidget>): void {
    const widget = this.currentLayout.widgets.find(w => w.id === widgetId);
    if (widget) {
      Object.assign(widget, updates);
      this.emit('widget-updated', widget);
    }
  }

  moveWidget(widgetId: string, position: { x: number; y: number }): void {
    this.updateWidget(widgetId, { position });
  }

  resizeWidget(widgetId: string, size: { width: number; height: number }): void {
    this.updateWidget(widgetId, { size });
  }

  toggleWidgetVisibility(widgetId: string): void {
    const widget = this.currentLayout.widgets.find(w => w.id === widgetId);
    if (widget) {
      this.updateWidget(widgetId, { visible: !widget.visible });
    }
  }

  setTheme(theme: 'light' | 'dark'): void {
    this.currentLayout.theme = theme;
    this.emit('theme-changed', theme);
  }

  getPresets(): DashboardPreset[] {
    return [...this.presets];
  }

  getSavedLayouts(): DashboardLayout[] {
    return Array.from(this.layouts.values());
  }

  exportLayout(layoutId: string): string {
    const layout = this.layouts.get(layoutId);
    if (!layout) {
      throw new Error(`Layout not found: ${layoutId}`);
    }

    return JSON.stringify(layout, null, 2);
  }

  importLayout(layoutJson: string): void {
    const layout: DashboardLayout = JSON.parse(layoutJson);
    layout.id = `imported-${Date.now()}`;
    this.layouts.set(layout.id, layout);
    this.emit('layout-imported', layout);
  }

  resetToDefault(): void {
    this.currentLayout = this.createDefaultLayout();
    this.emit('layout-changed', this.currentLayout);
  }
}
```

### 4. キーボードショートカットの実装

```typescript
// src/ui/shortcuts/KeyboardShortcuts.ts
import { EventEmitter } from 'events';

export interface Shortcut {
  id: string;
  name: string;
  description: string;
  keys: string[];
  action: () => void;
  enabled: boolean;
  context?: string;
}

export interface ShortcutConfig {
  shortcuts: Shortcut[];
  globalShortcuts: Shortcut[];
}

export class KeyboardShortcuts extends EventEmitter {
  private shortcuts: Map<string, Shortcut> = new Map();
  private pressedKeys: Set<string> = new Set();
  private defaultShortcuts: Shortcut[] = [];

  constructor() {
    super();
    this.initializeDefaultShortcuts();
  }

  private initializeDefaultShortcuts(): void {
    this.defaultShortcuts = [
      {
        id: 'buy-order',
        name: 'Buy Order',
        description: '成行買い注文を入力',
        keys: ['b'],
        action: () => this.emit('buy-order'),
        enabled: true
      },
      {
        id: 'sell-order',
        name: 'Sell Order',
        description: '成行売り注文を入力',
        keys: ['s'],
        action: () => this.emit('sell-order'),
        enabled: true
      },
      {
        id: 'cancel-order',
        name: 'Cancel Order',
        description: '注文をキャンセル',
        keys: ['Escape'],
        action: () => this.emit('cancel-order'),
        enabled: true
      },
      {
        id: 'close-position',
        name: 'Close Position',
        description: 'ポジションを決済',
        keys: ['c'],
        action: () => this.emit('close-position'),
        enabled: true
      },
      {
        id: 'toggle-chart',
        name: 'Toggle Chart',
        description: 'チャート表示の切り替え',
        keys: ['t'],
        action: () => this.emit('toggle-chart'),
        enabled: true
      },
      {
        id: 'next-symbol',
        name: 'Next Symbol',
        description: '次の銘柄に移動',
        keys: ['ArrowRight'],
        action: () => this.emit('next-symbol'),
        enabled: true
      },
      {
        id: 'previous-symbol',
        name: 'Previous Symbol',
        description: '前の銘柄に移動',
        keys: ['ArrowLeft'],
        action: () => this.emit('previous-symbol'),
        enabled: true
      },
      {
        id: 'zoom-in',
        name: 'Zoom In',
        description: 'チャートを拡大',
        keys: ['+'],
        action: () => this.emit('zoom-in'),
        enabled: true
      },
      {
        id: 'zoom-out',
        name: 'Zoom Out',
        description: 'チャートを縮小',
        keys: ['-'],
        action: () => this.emit('zoom-out'),
        enabled: true
      },
      {
        id: 'refresh',
        name: 'Refresh',
        description: 'データを更新',
        keys: ['r'],
        action: () => this.emit('refresh'),
        enabled: true
      },
      {
        id: 'search',
        name: 'Search',
        description: '検索ボックスを開く',
        keys: ['/', 'Control'],
        action: () => this.emit('search'),
        enabled: true
      },
      {
        id: 'help',
        name: 'Help',
        description: 'ヘルプを表示',
        keys: ['?', 'Shift'],
        action: () => this.emit('help'),
        enabled: true
      },
      {
        id: 'save-layout',
        name: 'Save Layout',
        description: 'レイアウトを保存',
        keys: ['s', 'Control'],
        action: () => this.emit('save-layout'),
        enabled: true
      },
      {
        id: 'load-layout',
        name: 'Load Layout',
        description: 'レイアウトを読み込み',
        keys: ['l', 'Control'],
        action: () => this.emit('load-layout'),
        enabled: true
      },
      {
        id: 'toggle-dark-mode',
        name: 'Toggle Dark Mode',
        description: 'ダークモードの切り替え',
        keys: ['d', 'Control'],
        action: () => this.emit('toggle-dark-mode'),
        enabled: true
      },
      {
        id: 'quick-buy',
        name: 'Quick Buy',
        description: 'クイック買い',
        keys: ['Enter'],
        action: () => this.emit('quick-buy'),
        enabled: true,
        context: 'order-form'
      },
      {
        id: 'quick-sell',
        name: 'Quick Sell',
        description: 'クイック売り',
        keys: ['Enter', 'Shift'],
        action: () => this.emit('quick-sell'),
        enabled: true,
        context: 'order-form'
      }
    ];

    // デフォルトショートカットを登録
    for (const shortcut of this.defaultShortcuts) {
      this.addShortcut(shortcut);
    }
  }

  addShortcut(shortcut: Shortcut): void {
    this.shortcuts.set(shortcut.id, shortcut);
  }

  removeShortcut(shortcutId: string): void {
    this.shortcuts.delete(shortcutId);
  }

  updateShortcut(shortcutId: string, updates: Partial<Shortcut>): void {
    const shortcut = this.shortcuts.get(shortcutId);
    if (shortcut) {
      this.shortcuts.set(shortcutId, { ...shortcut, ...updates });
    }
  }

  enableShortcut(shortcutId: string): void {
    const shortcut = this.shortcuts.get(shortcutId);
    if (shortcut) {
      shortcut.enabled = true;
    }
  }

  disableShortcut(shortcutId: string): void {
    const shortcut = this.shortcuts.get(shortcutId);
    if (shortcut) {
      shortcut.enabled = false;
    }
  }

  handleKeyDown(event: KeyboardEvent): void {
    this.pressedKeys.add(event.key);

    // ショートカットのチェック
    for (const shortcut of this.shortcuts.values()) {
      if (!shortcut.enabled) continue;

      // コンテキストのチェック
      if (shortcut.context && this.currentContext !== shortcut.context) {
        continue;
      }

      // キーの一致チェック
      if (this.keysMatch(shortcut.keys, Array.from(this.pressedKeys))) {
        event.preventDefault();
        shortcut.action();
        this.emit('shortcut-triggered', shortcut);
        break;
      }
    }
  }

  handleKeyUp(event: KeyboardEvent): void {
    this.pressedKeys.delete(event.key);
  }

  private keysMatch(requiredKeys: string[], pressedKeys: string[]): boolean {
    if (requiredKeys.length !== pressedKeys.length) {
      return false;
    }

    const requiredSet = new Set(requiredKeys.map(k => k.toLowerCase()));
    const pressedSet = new Set(pressedKeys.map(k => k.toLowerCase()));

    for (const key of requiredSet) {
      if (!pressedSet.has(key)) {
        return false;
      }
    }

    return true;
  }

  getShortcut(shortcutId: string): Shortcut | undefined {
    return this.shortcuts.get(shortcutId);
  }

  getShortcuts(context?: string): Shortcut[] {
    let shortcuts = Array.from(this.shortcuts.values());

    if (context) {
      shortcuts = shortcuts.filter(s => !s.context || s.context === context);
    }

    return shortcuts;
  }

  getDefaultShortcuts(): Shortcut[] {
    return [...this.defaultShortcuts];
  }

  resetToDefaults(): void {
    this.shortcuts.clear();
    for (const shortcut of this.defaultShortcuts) {
      this.addShortcut({ ...shortcut });
    }
    this.emit('shortcuts-reset');
  }

  exportShortcuts(): string {
    const shortcuts = Array.from(this.shortcuts.values());
    return JSON.stringify(shortcuts, null, 2);
  }

  importShortcuts(shortcutsJson: string): void {
    const shortcuts: Shortcut[] = JSON.parse(shortcutsJson);

    this.shortcuts.clear();
    for (const shortcut of shortcuts) {
      this.addShortcut(shortcut);
    }

    this.emit('shortcuts-imported');
  }

  private currentContext: string | null = null;

  setContext(context: string | null): void {
    this.currentContext = context;
  }

  getContext(): string | null {
    return this.currentContext;
  }

  // グローバルショートカットの有効化
  enableGlobalShortcuts(): void {
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    document.addEventListener('keyup', this.handleKeyUp.bind(this));
  }

  // グローバルショートカットの無効化
  disableGlobalShortcuts(): void {
    document.removeEventListener('keydown', this.handleKeyDown.bind(this));
    document.removeEventListener('keyup', this.handleKeyUp.bind(this));
  }
}
```

## 実装計画

### フェーズ1: 高度なアラート通知システム（2週間）
- [ ] アラート条件の定義と実装
- [ ] 通知チャネルの実装
- [ ] アラート履歴の管理
- [ ] アラートテンプレートの作成
- [ ] ユニットテストの作成

### フェーズ2: 高度なチャート可視化（2週間）
- [ ] チャート描画エンジンの実装
- [ ] テクニカルインジケーターの実装
- [ ] 描画ツールの実装
- [ ] テーマ切り替えの実装
- [ ] 統合テストの作成

### フェーズ3: ダッシュボードカスタマイズ機能（2週間）
- [ ] ウィジェットシステムの実装
- [ ] レイアウト管理の実装
- [ ] プリセットの作成
- [ ] インポート/エクスポート機能
- [ ] パフォーマンステストの作成

### フェーズ4: キーボードショートカット（2週間）
- [ ] ショートカット定義の実装
- [ ] キーボードイベントの処理
- [ ] コンテキスト対応の実装
- [ ] カスタマイズ機能の実装
- [ ] E2Eテストの作成

## 成功基準
- アラート通知の到達率99%以上
- チャート描画のフレームレート60fps以上
- ダッシュボードカスタマイズの応答時間100ms以下
- キーボードショートカットの反応時間50ms以下

## 関連Issue
- TRADING-001: データ品質と信頼性の向上
- TRADING-005: パフォーマンス監視とメトリクスの強化

## ラベル
enhancement, ui/ux, priority:medium
