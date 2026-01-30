/**
 * ML予測ロジックのテストケース
 */

import { mlPredictionService } from '@/app/lib/mlPrediction';
import { Stock, OHLCV, Signal, TechnicalIndicator } from '@/app/types';

// モックデータの作成
const mockStock: Stock = {
  symbol: 'TEST',
  name: 'Test Stock',
  market: 'japan',
  sector: 'Technology',
  price: 1000,
  change: 50,
  changePercent: 5.0,
  volume: 1000000
};

const mockOHLCVData: OHLCV[] = [
  { date: '2023-01-01', open: 1000, high: 1020, low: 990, close: 1010, volume: 1000000 },
  { date: '2023-01-02', open: 1010, high: 1030, low: 1000, close: 1020, volume: 1200000 },
  { date: '2023-01-03', open: 1020, high: 1040, low: 1010, close: 1030, volume: 1100000 },
  { date: '2023-01-04', open: 1030, high: 1050, low: 1020, close: 1040, volume: 1300000 },
  { date: '2023-01-05', open: 1040, high: 1060, low: 1030, close: 1050, volume: 1400000 },
  { date: '2023-01-06', open: 1050, high: 1070, low: 1040, close: 1060, volume: 1500000 },
  { date: '2023-01-07', open: 1060, high: 1080, low: 1050, close: 1070, volume: 1600000 },
  { date: '2023-01-08', open: 1070, high: 1090, low: 1060, close: 1080, volume: 1700000 },
  { date: '2023-01-09', open: 1080, high: 1100, low: 1070, close: 1090, volume: 1800000 },
  { date: '2023-01-10', open: 1090, high: 1110, low: 1080, close: 1100, volume: 1900000 },
];

const mockIndicators: TechnicalIndicator & { atr: number[] } = {
  symbol: 'TEST',
  sma5: [1020, 1030, 1040, 1050, 1060, 1070, 1080, 1090, 1100, 1110],
  sma20: Array(10).fill(1000),
  sma50: Array(10).fill(950),
  rsi: [60, 62, 65, 68, 70, 72, 75, 78, 80, 82],
  macd: {
    macd: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    signal: [0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5, 8.5, 9.5],
    histogram: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]
  },
  bollingerBands: {
    upper: [1100, 1110, 1120, 1130, 1140, 1150, 1160, 1170, 1180, 1190],
    middle: [1050, 1060, 1070, 1080, 1090, 1100, 1110, 1120, 1130, 1140],
    lower: [1000, 1010, 1020, 1030, 1040, 1050, 1060, 1070, 1080, 1090]
  },
  atr: [20, 22, 25, 28, 30, 32, 35, 38, 40, 42]
};

describe('MLPredictionService', () => {
  describe('calculateIndicators', () => {
    it('should calculate all technical indicators correctly', () => {
      const result = mlPredictionService.calculateIndicators(mockOHLCVData);

      // 結果の検証
      expect(result).toHaveProperty('sma5');
      expect(result).toHaveProperty('sma20');
      expect(result).toHaveProperty('sma50');
      expect(result).toHaveProperty('rsi');
      expect(result).toHaveProperty('macd');
      expect(result).toHaveProperty('bollingerBands');
      expect(result).toHaveProperty('atr');

      // 配列の長さを検証
      expect(result.sma5).toHaveLength(mockOHLCVData.length);
      expect(result.sma20).toHaveLength(mockOHLCVData.length);
      expect(result.sma50).toHaveLength(mockOHLCVData.length);
      expect(result.rsi).toHaveLength(mockOHLCVData.length);
      expect(result.atr).toHaveLength(mockOHLCVData.length);

      // MACDの構造を検証
      expect(result.macd).toHaveProperty('macd');
      expect(result.macd).toHaveProperty('signal');
      expect(result.macd).toHaveProperty('histogram');
      expect(result.macd.macd).toHaveLength(mockOHLCVData.length);
      expect(result.macd.signal).toHaveLength(mockOHLCVData.length);
      expect(result.macd.histogram).toHaveLength(mockOHLCVData.length);

      // ボリンジャーバンドの構造を検証
      expect(result.bollingerBands).toHaveProperty('upper');
      expect(result.bollingerBands).toHaveProperty('middle');
      expect(result.bollingerBands).toHaveProperty('lower');
      expect(result.bollingerBands.upper).toHaveLength(mockOHLCVData.length);
      expect(result.bollingerBands.middle).toHaveLength(mockOHLCVData.length);
      expect(result.bollingerBands.lower).toHaveLength(mockOHLCVData.length);
    });

    it('should return indicators with correct values', () => {
      const result = mlPredictionService.calculateIndicators(mockOHLCVData);

      // SMAの計算結果を検証（簡易的に最初の値のみ）
      expect(result.sma5[0]).toBeGreaterThanOrEqual(0);
      expect(result.sma20[0]).toBeGreaterThanOrEqual(0);
      expect(result.sma50[0]).toBeGreaterThanOrEqual(0);

      // RSIの値域を検証（0-100の範囲内）
      result.rsi.forEach(rsiValue => {
        expect(rsiValue).toBeGreaterThanOrEqual(0);
        expect(rsiValue).toBeLessThanOrEqual(100);
      });

      // ATRの値を検証（正の値）
      result.atr.forEach(atrValue => {
        expect(atrValue).toBeGreaterThan(0);
      });
    });
  });

  describe('predict', () => {
    it('should generate prediction with all model outputs', () => {
      const result = mlPredictionService.predict(mockStock, mockOHLCVData, mockIndicators);

      // 結果の構造を検証
      expect(result).toHaveProperty('rfPrediction');
      expect(result).toHaveProperty('xgbPrediction');
      expect(result).toHaveProperty('lstmPrediction');
      expect(result).toHaveProperty('ensemblePrediction');
      expect(result).toHaveProperty('confidence');

      // 数値であることを検証
      expect(typeof result.rfPrediction).toBe('number');
      expect(typeof result.xgbPrediction).toBe('number');
      expect(typeof result.lstmPrediction).toBe('number');
      expect(typeof result.ensemblePrediction).toBe('number');
      expect(typeof result.confidence).toBe('number');

      // 信頼度の範囲を検証
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
    });

    it('should handle edge cases in prediction', () => {
      // 空のデータでテスト
      const emptyData: OHLCV[] = [];
      const emptyIndicators: TechnicalIndicator & { atr: number[] } = {
        symbol: 'TEST',
        sma5: [],
        sma20: [],
        sma50: [],
        rsi: [],
        macd: { macd: [], signal: [], histogram: [] },
        bollingerBands: { upper: [], middle: [], lower: [] },
        atr: []
      };

      const result = mlPredictionService.predict(mockStock, emptyData, emptyIndicators);

      // 空データに対する処理を検証
      expect(typeof result.rfPrediction).toBe('number');
      expect(typeof result.xgbPrediction).toBe('number');
      expect(typeof result.lstmPrediction).toBe('number');
      expect(typeof result.ensemblePrediction).toBe('number');
      expect(typeof result.confidence).toBe('number');
    });
  });

  describe('generateSignal', () => {
    it('should generate signal with all required properties', () => {
      const prediction = mlPredictionService.predict(mockStock, mockOHLCVData, mockIndicators);
      const result = mlPredictionService.generateSignal(mockStock, mockOHLCVData, prediction, mockIndicators);

      // シグナルの構造を検証
      expect(result).toHaveProperty('symbol');
      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('targetPrice');
      expect(result).toHaveProperty('stopLoss');
      expect(result).toHaveProperty('reason');
      expect(result).toHaveProperty('predictedChange');
      expect(result).toHaveProperty('predictionDate');

      // 値の検証
      expect(result.symbol).toBe(mockStock.symbol);
      expect(['BUY', 'SELL', 'HOLD']).toContain(result.type);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
      expect(typeof result.targetPrice).toBe('number');
      expect(typeof result.stopLoss).toBe('number');
      expect(typeof result.reason).toBe('string');
      expect(typeof result.predictedChange).toBe('number');
      expect(typeof result.predictionDate).toBe('string');

      // 価格関連の検証
      const currentPrice = mockOHLCVData[mockOHLCVData.length - 1].close;
      if (result.type === 'BUY') {
        expect(result.targetPrice).toBeGreaterThanOrEqual(currentPrice);
        expect(result.stopLoss).toBeLessThanOrEqual(currentPrice);
      } else if (result.type === 'SELL') {
        expect(result.targetPrice).toBeLessThanOrEqual(currentPrice);
        expect(result.stopLoss).toBeGreaterThanOrEqual(currentPrice);
      }
      // HOLDの場合は特別な処理があるか確認
    });

    it('should generate BUY signal for strong positive prediction', () => {
      // 強い買いサインが出るようなデータを準備
      const strongBuyIndicators: TechnicalIndicator & { atr: number[] } = {
        ...mockIndicators,
        rsi: [25, 30, 35, 40, 45, 50, 55, 60, 65, 70], // RSIが低位から上昇
        sma5: [950, 960, 970, 980, 990, 1000, 1010, 1020, 1030, 1040], // 短期SMAが上昇トレンド
      };

      const prediction = mlPredictionService.predict(mockStock, mockOHLCVData, strongBuyIndicators);
      // 予測値を意図的に高く設定
      const adjustedPrediction = {
        ...prediction,
        ensemblePrediction: 5.0, // 強い買いサイン
        confidence: 85
      };

      const result = mlPredictionService.generateSignal(mockStock, mockOHLCVData, adjustedPrediction, strongBuyIndicators);

      // 強い買いサインに対する期待値
      expect(result.type).toBe('BUY');
      expect(result.confidence).toBeGreaterThanOrEqual(80);
      expect(result.predictedChange).toBeGreaterThan(0);
    });

    it('should generate SELL signal for strong negative prediction', () => {
      // 強い売りサインが出るようなデータを準備
      const strongSellIndicators: TechnicalIndicator & { atr: number[] } = {
        ...mockIndicators,
        rsi: [75, 70, 65, 60, 55, 50, 45, 40, 35, 30], // RSIが高位から下降
        sma5: [1050, 1040, 1030, 1020, 1010, 1000, 990, 980, 970, 960], // 短期SMAが下降トレンド
      };

      const prediction = mlPredictionService.predict(mockStock, mockOHLCVData, strongSellIndicators);
      // 予測値を意図的に低く設定
      const adjustedPrediction = {
        ...prediction,
        ensemblePrediction: -5.0, // 強い売りサイン
        confidence: 85
      };

      const result = mlPredictionService.generateSignal(mockStock, mockOHLCVData, adjustedPrediction, strongSellIndicators);

      // 強い売りサインに対する期待値
      expect(result.type).toBe('SELL');
      expect(result.confidence).toBeGreaterThanOrEqual(80);
      expect(result.predictedChange).toBeLessThan(0);
    });

    it('should generate HOLD signal for neutral prediction', () => {
      // ニュートラルなサインが出るようなデータを準備
      const neutralIndicators: TechnicalIndicator & { atr: number[] } = {
        ...mockIndicators,
        rsi: [45, 48, 50, 52, 48, 50, 52, 48, 50, 48], // RSIが50付近で推移
        sma5: [1000, 1005, 1000, 1005, 1000, 1005, 1000, 1005, 1000, 1005], // SMAが横ばい
      };

      const prediction = mlPredictionService.predict(mockStock, mockOHLCVData, neutralIndicators);
      // 予測値を意図的にゼロに近づける
      const adjustedPrediction = {
        ...prediction,
        ensemblePrediction: 0.1, // ニュートラル
        confidence: 45 // 低い信頼度
      };

      const result = mlPredictionService.generateSignal(mockStock, mockOHLCVData, adjustedPrediction, neutralIndicators);

      // ニュートラルサインに対する期待値
      expect(result.type).toBe('HOLD');
      expect(Math.abs(result.predictedChange)).toBeLessThan(1);
    });
  });

  describe('analyzeMarketCorrelation', () => {
    it('should handle market correlation analysis', () => {
      const indexData: OHLCV[] = [
        { date: '2023-01-01', open: 28000, high: 28200, low: 27900, close: 28100, volume: 100000000 },
        { date: '2023-01-02', open: 28100, high: 28300, low: 28000, close: 28200, volume: 110000000 },
        { date: '2023-01-03', open: 28200, high: 28400, low: 28100, close: 28300, volume: 120000000 },
      ];

      // プライベートメソッドをテストするためのラッパー関数を定義
      const analyzeMarketCorrelation = (stock: Stock, data: OHLCV[], indexDataInput: OHLCV[] | undefined, prediction: number) => {
        return (mlPredictionService as any).analyzeMarketCorrelation(stock, data, indexDataInput, prediction);
      };

      const result = analyzeMarketCorrelation(mockStock, mockOHLCVData, indexData, 2.5);

      // 戻り値の構造を検証
      expect(result).toHaveProperty('marketInfo');
      expect(result).toHaveProperty('confidenceAdj');
      expect(result).toHaveProperty('marketComment');

      // 型を検証
      expect(typeof result.confidenceAdj).toBe('number');
      expect(typeof result.marketComment).toBe('string');

      if (result.marketInfo) {
        expect(result.marketInfo).toHaveProperty('indexSymbol');
        expect(result.marketInfo).toHaveProperty('correlation');
        expect(result.marketInfo).toHaveProperty('indexTrend');
        expect(typeof result.marketInfo.correlation).toBe('number');
        expect(['UP', 'DOWN', 'NEUTRAL']).toContain(result.marketInfo.indexTrend);
      }
    });

    it('should handle undefined index data', () => {
      const analyzeMarketCorrelation = (stock: Stock, data: OHLCV[], indexDataInput: OHLCV[] | undefined, prediction: number) => {
        return (mlPredictionService as any).analyzeMarketCorrelation(stock, data, indexDataInput, prediction);
      };

      const result = analyzeMarketCorrelation(mockStock, mockOHLCVData, undefined, 2.5);

      // 戻り値の構造を検証
      expect(result).toHaveProperty('marketInfo');
      expect(result).toHaveProperty('confidenceAdj');
      expect(result).toHaveProperty('marketComment');

      // marketInfoがundefinedになることを検証
      expect(result.marketInfo).toBeUndefined();
      expect(typeof result.confidenceAdj).toBe('number');
      expect(typeof result.marketComment).toBe('string');
    });
  });
});