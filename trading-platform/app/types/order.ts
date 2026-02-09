/**
 * 注文リクエストの型定義
 */
import { OrderSide, OrderType, MarketType } from './shared';

export interface RiskConfig {
  enableTrailingStop: boolean;
  trailingStopATRMultiple: number;
  trailingStopMinPercent: number;
  enableVolatilityAdjustment: boolean;
  volatilityMultiplier: number;
  enableDynamicPositionSizing: boolean;
  maxRiskPerTrade: number;
  minRiskRewardRatio: number;
  maxPositionPercent?: number;
}

export interface OrderRequest {
  /** 銘柄シンボル */
  symbol: string;
  /** 銘柄名 */
  name: string;
  /** 市場区分 */
  market: MarketType;
  /** 注文サイド */
  side: 'LONG' | 'SHORT';
  /** 数量 */
  quantity: number;
  /** 価格 */
  price: number;
  /** 注文種別 */
  orderType: OrderType;
  /** ストップロス価格（オプション） */
  stopLoss?: number;
  /** 利確価格（オプション） */
  takeProfit?: number;
  /** リスク管理設定（オプション） */
  riskConfig?: RiskConfig;
  /** リスク管理をスキップするかどうか（テスト用） */
  skipRiskManagement?: boolean;
}

/**
 * 注文結果の型定義
 */
export interface OrderResult {
  /** 注文が成功したかどうか */
  success: boolean;
  /** 注文ID */
  orderId?: string;
  /** エラーメッセージ */
  error?: string;
  /** 残高 */
  remainingCash?: number;
  /** 新しいポジション */
  newPosition?: {
    symbol: string;
    name: string;
    market: 'japan' | 'usa';
    side: 'LONG' | 'SHORT';
    quantity: number;
    avgPrice: number;
    currentPrice: number;
    change: number;
    entryDate: string;
  };
}
