/**
 * High-Frequency Data Processing Service
 *
 * このモジュールは、高頻度データ（ティックデータ、板情報など）を処理する機能を提供します。
 * リアルタイムデータの受信、フィルタリング、集約、分析、そして取引アルゴリズムへの供給を行います。
 */

import { OHLCV, Stock } from '@/app/types';
import { realTimeDataService, RealTimeData } from './realtime-data-service';
import { DataError, logError } from '@/app/lib/errors';

import { logger } from '@/app/core/logger';
export interface TickData {
  symbol: string;
  price: number;
  size: number;
  timestamp: Date;
  bid?: number;
  ask?: number;
  volume?: number;
}

export interface OrderBookData {
  symbol: string;
  bids: { price: number; size: number }[];
  asks: { price: number; size: number }[];
  timestamp: Date;
}

export interface ProcessedData {
  symbol: string;
  bar: OHLCV;
  indicators: {
    rsi?: number;
    macd?: { macd: number; signal: number; histogram: number };
    bb?: { upper: number; middle: number; lower: number };
    atr?: number;
  };
  volumeProfile?: {
    priceLevels: { price: number; volume: number; strength: number }[];
    pvp: number; // Peak Volume Price
  };
  marketMicrostructure: {
    bidAskSpread: number;
    orderFlow: number; // 売買勢い
    liquidity: number; // 流動性指標
    volatility: number; // 短期ボラティリティ
  };
}

export interface HFTProcessingConfig {
  aggregationPeriod: 'tick' | 'second' | 'minute'; // 集約期間
  volumeThreshold: number; // 処理のトリガーとなる出来高閾値
  volatilityThreshold: number; // ボラティリティに基づく処理のフィルタリング
  enableVolumeProfile: boolean; // ボリュームプロファイルの計算有効化
  enableMarketMicrostructure: boolean; // 市場マイクロストラクチャー分析の有効化
  maxBufferSize: number; // バッファの最大サイズ
  processingDelay: number; // 処理遅延（ミリ秒）
}

class HighFrequencyDataProcessingService {
  private buffer: Map<string, TickData[]> = new Map();
  private orderBooks: Map<string, OrderBookData> = new Map();
  private config: HFTProcessingConfig;
  private processors: Map<string, (data: ProcessedData) => void> = new Map();
  private isRunning: boolean = false;

  constructor(config?: Partial<HFTProcessingConfig>) {
    this.config = {
      aggregationPeriod: 'second',
      volumeThreshold: 1000,
      volatilityThreshold: 0.02,
      enableVolumeProfile: true,
      enableMarketMicrostructure: true,
      maxBufferSize: 10000,
      processingDelay: 0,
      ...config
    };
  }

  /**
   * リアルタイムデータストリームを開始
   */
  startDataStream(symbols: string[]): void {
    if (this.isRunning) {
      logger.warn('Data stream is already running');
      return;
    }

    this.isRunning = true;

    // リアルタイムデータサービスに接続
    realTimeDataService.connect({
      onConnect: () => {
        realTimeDataService.subscribeMultiple(symbols);
      },
      onDisconnect: () => {
        this.isRunning = false;
      },
      onError: (error) => {
        logger.error('Real-time data stream error:', error);
      },
      onData: (data) => {
        this.handleIncomingData(data);
      }
    });
  }

  /**
   * データストリームを停止
   */
  stopDataStream(): void {
    this.isRunning = false;
    realTimeDataService.disconnect();
  }

  /**
   * 入力データを処理
   */
  private handleIncomingData(realTimeData: RealTimeData): void {
    const tickData: TickData = {
      symbol: realTimeData.symbol,
      price: realTimeData.price,
      size: realTimeData.volume,
      timestamp: realTimeData.timestamp,
      bid: realTimeData.open,
      ask: realTimeData.high
    };

    // バッファに追加
    this.addToBuffer(tickData);

    // 集約期間に基づいて処理を実行
    if (this.shouldProcessData(tickData)) {
      setTimeout(() => {
        this.processData(tickData.symbol);
      }, this.config.processingDelay);
    }
  }

  /**
   * バッファにデータを追加
   */
  private addToBuffer(tickData: TickData): void {
    if (!this.buffer.has(tickData.symbol)) {
      this.buffer.set(tickData.symbol, []);
    }

    const symbolBuffer = this.buffer.get(tickData.symbol)!;
    symbolBuffer.push(tickData);

    // 最大バッファサイズを超えた場合は古いデータを削除
    if (symbolBuffer.length > this.config.maxBufferSize) {
      symbolBuffer.shift(); // 最古のデータを削除
    }
  }

  /**
   * データを処理する必要があるか判断
   */
  private shouldProcessData(tickData: TickData): boolean {
    const symbolBuffer = this.buffer.get(tickData.symbol);
    if (!symbolBuffer) return false;

    // 集約期間に基づく処理
    if (this.config.aggregationPeriod === 'tick') {
      return true; // ティックごとに処理
    } else if (this.config.aggregationPeriod === 'second') {
      // 最後のデータと1秒以内であれば処理
      const lastData = symbolBuffer[symbolBuffer.length - 2]; // 1つ前のデータ
      if (lastData) {
        const timeDiff = (tickData.timestamp.getTime() - lastData.timestamp.getTime()) / 1000;
        return timeDiff >= 1;
      }
    } else if (this.config.aggregationPeriod === 'minute') {
      const lastData = symbolBuffer[symbolBuffer.length - 2];
      if (lastData) {
        const timeDiff = (tickData.timestamp.getTime() - lastData.timestamp.getTime()) / (1000 * 60);
        return timeDiff >= 1;
      }
    }

    // 出来高しきい値に基づく処理
    if (tickData.size >= this.config.volumeThreshold) {
      return true;
    }

    return false;
  }

  /**
   * データを処理
   */
  private processData(symbol: string): void {
    const symbolBuffer = this.buffer.get(symbol);
    if (!symbolBuffer || symbolBuffer.length === 0) return;

    // OHLCVバーを生成
    const bar = this.createOHLCVBar(symbolBuffer);

    // 指標を計算
    const indicators = this.calculateIndicators(bar, symbol);

    // ボリュームプロファイルを計算
    let volumeProfile;
    if (this.config.enableVolumeProfile) {
      volumeProfile = this.calculateVolumeProfile(symbolBuffer);
    }

    // 市場マイクロストラクチャー指標を計算
    let marketMicrostructure = { bidAskSpread: 0, orderFlow: 0, liquidity: 0, volatility: 0 };
    if (this.config.enableMarketMicrostructure) {
      const orderBook = this.orderBooks.get(symbol);
      if (orderBook) {
        const result = this.calculateMarketMicrostructure(bar, orderBook);
        if (result) marketMicrostructure = result;
      }
    }

    // 処理済みデータを作成
    const processedData: ProcessedData = {
      symbol,
      bar,
      indicators,
      volumeProfile,
      marketMicrostructure
    };

    // 登録されているプロセッサにデータを渡す
    const processor = this.processors.get(symbol);
    if (processor) {
      processor(processedData);
    }
  }

  /**
   * OHLCVバーを作成
   */
  private createOHLCVBar(tickData: TickData[]): OHLCV {
    if (tickData.length === 0) {
      throw new DataError('Cannot create OHLCV bar from empty tick data', { context: { type: 'tick' } });
    }

    const startTimestamp = tickData[0].timestamp;
    const endTimestamp = tickData[tickData.length - 1].timestamp;

    // 集約計算
    const open = tickData[0].price;
    const high = Math.max(...tickData.map(d => d.price));
    const low = Math.min(...tickData.map(d => d.price));
    const close = tickData[tickData.length - 1].price;
    const volume = tickData.reduce((sum, d) => sum + d.size, 0);

    return {
      date: startTimestamp.toISOString().split('T')[0],
      open,
      high,
      low,
      close,
      volume
    };
  }

  /**
   * 技術指標を計算
   */
  private calculateIndicators(bar: OHLCV, symbol: string): ProcessedData['indicators'] {
    // 実際には過去のバーが必要なため、ここでは簡略化
    // 通常はより多くの履歴データが必要
    return {
      // RSI, MACD, Bollinger Bands, ATRなどの計算
      // これらは実際には過去のデータを使って計算する必要がある
    };
  }

  /**
   * ボリュームプロファイルを計算
   */
  private calculateVolumeProfile(tickData: TickData[]): ProcessedData['volumeProfile'] {
    if (!this.config.enableVolumeProfile) return undefined;

    // 価格レベルごとの出来高を集計
    const priceVolumeMap = new Map<number, number>();
    for (const tick of tickData) {
      const roundedPrice = Math.round(tick.price * 100) / 100; // 2桁の小数点まで
      const currentVolume = priceVolumeMap.get(roundedPrice) || 0;
      priceVolumeMap.set(roundedPrice, currentVolume + tick.size);
    }

    // 各価格レベルの強度を計算（相対的な出来高）
    const totalVolume = Array.from(priceVolumeMap.values()).reduce((sum, vol) => sum + vol, 0);
    const priceLevels = Array.from(priceVolumeMap.entries()).map(([price, volume]) => ({
      price,
      volume,
      strength: totalVolume > 0 ? volume / totalVolume : 0
    }));

    // PVP（Peak Volume Price）を計算
    const pvp = priceLevels.length > 0 
      ? priceLevels.reduce((max, level) => level.strength > max.strength ? level : max, priceLevels[0]).price 
      : 0;

    return {
      priceLevels,
      pvp
    };
  }

  /**
   * 市場マイクロストラクチャー指標を計算
   */
  private calculateMarketMicrostructure(bar: OHLCV, orderBook: OrderBookData): ProcessedData['marketMicrostructure'] | undefined {
    if (!this.config.enableMarketMicrostructure) return undefined;

    // ベッド・アスクスプレッドを計算
    const bestBid = orderBook.bids.length > 0 ? orderBook.bids[0].price : 0;
    const bestAsk = orderBook.asks.length > 0 ? orderBook.asks[0].price : 0;
    const bidAskSpread = bestAsk - bestBid;

    // 注文フロー（売買勢い）を計算（簡略化）
    const bidVolume = orderBook.bids.reduce((sum, level) => sum + level.size, 0);
    const askVolume = orderBook.asks.reduce((sum, level) => sum + level.size, 0);
    const orderFlow = bidVolume - askVolume;

    // 流動性指標（スプレッドの逆数）
    const liquidity = bidAskSpread > 0 ? 1 / bidAskSpread : 0;

    // 短期ボラティリティ（簡略化）
    const volatility = (bar.high - bar.low) / bar.open;

    return {
      bidAskSpread,
      orderFlow,
      liquidity,
      volatility
    };
  }

  /**
   * データプロセッサを登録
   */
  registerProcessor(symbol: string, processor: (data: ProcessedData) => void): void {
    this.processors.set(symbol, processor);
  }

  /**
   * データプロセッサを解除
   */
  unregisterProcessor(symbol: string): void {
    this.processors.delete(symbol);
  }

  /**
   * 現在のバッファ状態を取得
   */
  getBufferData(symbol: string): TickData[] {
    return this.buffer.get(symbol) || [];
  }

  /**
   * バッファをクリア
   */
  clearBuffer(symbol?: string): void {
    if (symbol) {
      this.buffer.delete(symbol);
    } else {
      this.buffer.clear();
    }
  }

  /**
   * 現在の板情報を取得
   */
  getOrderBook(symbol: string): OrderBookData | undefined {
    return this.orderBooks.get(symbol);
  }

  /**
   * 板情報を更新
   */
  updateOrderBook(orderBookData: OrderBookData): void {
    this.orderBooks.set(orderBookData.symbol, orderBookData);
  }

  /**
   * 処理設定を更新
   */
  updateConfig(newConfig: Partial<HFTProcessingConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 現在の設定を取得
   */
  getConfig(): HFTProcessingConfig {
    return this.config;
  }
}

export const highFrequencyDataProcessingService = new HighFrequencyDataProcessingService();