/**
 * advancedOrder.ts
 * 
 * 高度なオーダータイプの型定義
 * Advanced order type definitions for sophisticated trading strategies
 */

// ============================================================================
// Base Types
// ============================================================================

export type OrderSide = 'BUY' | 'SELL';
export type TimeInForce = 'GTC' | 'IOC' | 'FOK' | 'DAY';
export type OrderStatus = 'PENDING' | 'ACTIVE' | 'FILLED' | 'PARTIALLY_FILLED' | 'CANCELLED' | 'REJECTED' | 'EXPIRED';

/**
 * Base order interface that all orders extend from
 */
export interface BaseOrder {
  id: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  timeInForce: TimeInForce;
  status: OrderStatus;
  createdAt: number;
  updatedAt: number;
  filledQuantity?: number;
  avgFillPrice?: number;
}

// ============================================================================
// Advanced Order Types
// ============================================================================

/**
 * Stop Loss Order
 * 指定価格に達したら損失を限定するための注文
 */
export interface StopLossOrder extends BaseOrder {
  type: 'STOP_LOSS';
  stopPrice: number;
  trailAmount?: number;
  trailPercent?: number;
}

/**
 * Take Profit Order
 * 指定価格に達したら利益を確定するための注文
 */
export interface TakeProfitOrder extends BaseOrder {
  type: 'TAKE_PROFIT';
  takeProfitPrice: number;
}

/**
 * OCO (One-Cancels-Other) Order
 * 2つの注文のうち1つが約定したら、もう1つを自動キャンセル
 */
export interface OCOOrder {
  id: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  order1: StopLossOrder | TakeProfitOrder;
  order2: StopLossOrder | TakeProfitOrder;
  timeInForce: TimeInForce;
  status: OrderStatus;
  createdAt: number;
  updatedAt: number;
  activeOrderId?: string;
  filledOrderId?: string;
}

/**
 * Iceberg Order
 * 大口注文を小口に分割して市場インパクトを最小化
 */
export interface IcebergOrder extends BaseOrder {
  type: 'ICEBERG';
  totalQuantity: number;
  visibleQuantity: number;
  minVisibleQuantity?: number;
  executedQuantity: number;
}

/**
 * Trailing Stop Order
 * 価格に追従してストップ価格を自動調整
 */
export interface TrailingStopOrder extends BaseOrder {
  type: 'TRAILING_STOP';
  trailAmount: number;
  trailPercent?: number;
  activationPrice?: number;
  currentStopPrice: number;
  highestPrice?: number; // For BUY side trailing
  lowestPrice?: number;  // For SELL side trailing
}

/**
 * Bracket Order
 * エントリー、ストップロス、テイクプロフィットを同時に設定
 */
export interface BracketOrder {
  id: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  entryOrder: BaseOrder;
  stopLossOrder: StopLossOrder;
  takeProfitOrder: TakeProfitOrder;
  status: OrderStatus;
  createdAt: number;
  updatedAt: number;
  entryFilled: boolean;
  exitFilled: boolean;
}

/**
 * Union type for all advanced order types
 */
export type AdvancedOrder = 
  | StopLossOrder 
  | TakeProfitOrder 
  | OCOOrder 
  | IcebergOrder 
  | TrailingStopOrder 
  | BracketOrder;

// ============================================================================
// Order Events
// ============================================================================

export type OrderEventType = 
  | 'ORDER_CREATED'
  | 'ORDER_UPDATED'
  | 'ORDER_FILLED'
  | 'ORDER_PARTIALLY_FILLED'
  | 'ORDER_CANCELLED'
  | 'ORDER_REJECTED'
  | 'ORDER_EXPIRED'
  | 'STOP_TRIGGERED'
  | 'TRAIL_UPDATED';

export interface OrderEvent {
  type: OrderEventType;
  orderId: string;
  timestamp: number;
  data?: unknown;
}

// ============================================================================
// Type Guards
// ============================================================================

export function isStopLossOrder(order: unknown): order is StopLossOrder {
  return typeof order === 'object' && order !== null && 
    (order as { type?: string }).type === 'STOP_LOSS';
}

export function isTakeProfitOrder(order: unknown): order is TakeProfitOrder {
  return typeof order === 'object' && order !== null && 
    (order as { type?: string }).type === 'TAKE_PROFIT';
}

export function isOCOOrder(order: unknown): order is OCOOrder {
  return typeof order === 'object' && order !== null && 
    'order1' in order && 'order2' in order;
}

export function isIcebergOrder(order: unknown): order is IcebergOrder {
  return typeof order === 'object' && order !== null && 
    (order as { type?: string }).type === 'ICEBERG';
}

export function isTrailingStopOrder(order: unknown): order is TrailingStopOrder {
  return typeof order === 'object' && order !== null && 
    (order as { type?: string }).type === 'TRAILING_STOP';
}

export function isBracketOrder(order: unknown): order is BracketOrder {
  return typeof order === 'object' && order !== null && 
    'entryOrder' in order && 'stopLossOrder' in order && 'takeProfitOrder' in order;
}
