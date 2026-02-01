# TRADING-004: オーダー実行品質の向上

## 概要
高度なオーダータイプの実装、スリッページ予測・管理システム、スマートオーダールーティングの構築、執行アルゴリズムの開発を通じて、オーダー実行品質を向上させます。

## 問題の説明
現在のシステムには以下の課題があります：

1. **オーダータイプの制限**
   - 基本的な成行・指値注文のみ
   - 複雑な条件設定ができない
   - リスク管理機能が不足している

2. **スリッページの予測・管理不足**
   - 予想されるスリッページを計算できない
   - 実行コストを最適化できない
   - 大口注文の市場インパクトを予測できない

3. **オーダールーティングの単純化**
   - 単一の取引所のみ使用
   - 最適な実行場所を選択できない
   - 複数取引所の流動性を活用できない

4. **執行アルゴリズムの欠如**
   - 大口注文を分割実行できない
   - 市場状況に応じた執行調整ができない
   - 時間加重平均価格（TWAP）やボリューム加重平均価格（VWAP）を実現できない

## 影響
- 実行コストの増加
- スリッページによる損失
- 大口注文の市場インパクト
- 取引パフォーマンスの低下

## 推奨される解決策

### 1. 高度なオーダータイプの実装

```typescript
// src/execution/AdvancedOrderTypes.ts
import { Order, OrderType, OrderSide, TimeInForce } from '@/types/trading';

export interface StopLossOrder extends Order {
  type: 'STOP_LOSS';
  stopPrice: number;
  trailAmount?: number;
  trailPercent?: number;
}

export interface TakeProfitOrder extends Order {
  type: 'TAKE_PROFIT';
  takeProfitPrice: number;
}

export interface OCOOrder {
  id: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  order1: StopLossOrder | TakeProfitOrder;
  order2: StopLossOrder | TakeProfitOrder;
  timeInForce: TimeInForce;
}

export interface IcebergOrder extends Order {
  type: 'ICEBERG';
  totalQuantity: number;
  visibleQuantity: number;
  minVisibleQuantity?: number;
}

export interface TrailingStopOrder extends Order {
  type: 'TRAILING_STOP';
  trailAmount: number;
  trailPercent?: number;
  activationPrice?: number;
}

export interface BracketOrder {
  id: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  entryOrder: Order;
  stopLossOrder: StopLossOrder;
  takeProfitOrder: TakeProfitOrder;
}

export class AdvancedOrderManager {
  private orders: Map<string, Order> = new Map();
  private ocoOrders: Map<string, OCOOrder> = new Map();
  private icebergOrders: Map<string, IcebergOrder> = new Map();
  private bracketOrders: Map<string, BracketOrder> = new Map();

  createStopLossOrder(params: {
    symbol: string;
    side: OrderSide;
    quantity: number;
    stopPrice: number;
    trailAmount?: number;
    trailPercent?: number;
  }): StopLossOrder {
    return {
      id: this.generateOrderId(),
      type: 'STOP_LOSS',
      symbol: params.symbol,
      side: params.side,
      quantity: params.quantity,
      stopPrice: params.stopPrice,
      trailAmount: params.trailAmount,
      trailPercent: params.trailPercent,
      status: 'PENDING',
      createdAt: Date.now()
    };
  }

  createTakeProfitOrder(params: {
    symbol: string;
    side: OrderSide;
    quantity: number;
    takeProfitPrice: number;
  }): TakeProfitOrder {
    return {
      id: this.generateOrderId(),
      type: 'TAKE_PROFIT',
      symbol: params.symbol,
      side: params.side,
      quantity: params.quantity,
      takeProfitPrice: params.takeProfitPrice,
      status: 'PENDING',
      createdAt: Date.now()
    };
  }

  createOCOOrder(params: {
    symbol: string;
    side: OrderSide;
    quantity: number;
    stopPrice: number;
    takeProfitPrice: number;
    timeInForce?: TimeInForce;
  }): OCOOrder {
    const ocoOrder: OCOOrder = {
      id: this.generateOrderId(),
      symbol: params.symbol,
      side: params.side,
      quantity: params.quantity,
      order1: this.createStopLossOrder({
        symbol: params.symbol,
        side: params.side,
        quantity: params.quantity,
        stopPrice: params.stopPrice
      }),
      order2: this.createTakeProfitOrder({
        symbol: params.symbol,
        side: params.side,
        quantity: params.quantity,
        takeProfitPrice: params.takeProfitPrice
      }),
      timeInForce: params.timeInForce || 'GTC'
    };

    this.ocoOrders.set(ocoOrder.id, ocoOrder);
    return ocoOrder;
  }

  createIcebergOrder(params: {
    symbol: string;
    side: OrderSide;
    totalQuantity: number;
    visibleQuantity: number;
    minVisibleQuantity?: number;
    price?: number;
  }): IcebergOrder {
    const icebergOrder: IcebergOrder = {
      id: this.generateOrderId(),
      type: 'ICEBERG',
      symbol: params.symbol,
      side: params.side,
      quantity: params.visibleQuantity,
      totalQuantity: params.totalQuantity,
      visibleQuantity: params.visibleQuantity,
      minVisibleQuantity: params.minVisibleQuantity,
      price: params.price,
      status: 'PENDING',
      createdAt: Date.now()
    };

    this.icebergOrders.set(icebergOrder.id, icebergOrder);
    return icebergOrder;
  }

  createTrailingStopOrder(params: {
    symbol: string;
    side: OrderSide;
    quantity: number;
    trailAmount: number;
    trailPercent?: number;
    activationPrice?: number;
  }): TrailingStopOrder {
    return {
      id: this.generateOrderId(),
      type: 'TRAILING_STOP',
      symbol: params.symbol,
      side: params.side,
      quantity: params.quantity,
      trailAmount: params.trailAmount,
      trailPercent: params.trailPercent,
      activationPrice: params.activationPrice,
      status: 'PENDING',
      createdAt: Date.now()
    };
  }

  createBracketOrder(params: {
    symbol: string;
    side: OrderSide;
    quantity: number;
    entryPrice: number;
    stopLossPrice: number;
    takeProfitPrice: number;
  }): BracketOrder {
    const bracketOrder: BracketOrder = {
      id: this.generateOrderId(),
      symbol: params.symbol,
      side: params.side,
      quantity: params.quantity,
      entryOrder: {
        id: this.generateOrderId(),
        type: 'LIMIT',
        symbol: params.symbol,
        side: params.side,
        quantity: params.quantity,
        price: params.entryPrice,
        status: 'PENDING',
        createdAt: Date.now()
      },
      stopLossOrder: this.createStopLossOrder({
        symbol: params.symbol,
        side: params.side === 'BUY' ? 'SELL' : 'BUY',
        quantity: params.quantity,
        stopPrice: params.stopLossPrice
      }),
      takeProfitOrder: this.createTakeProfitOrder({
        symbol: params.symbol,
        side: params.side === 'BUY' ? 'SELL' : 'BUY',
        quantity: params.quantity,
        takeProfitPrice: params.takeProfitPrice
      })
    };

    this.bracketOrders.set(bracketOrder.id, bracketOrder);
    return bracketOrder;
  }

  updateTrailingStopPrice(orderId: string, currentPrice: number): void {
    const order = this.orders.get(orderId) as TrailingStopOrder;
    if (!order || order.type !== 'TRAILING_STOP') return;

    // トレイリングストップ価格の更新
    if (order.side === 'BUY') {
      const newStopPrice = currentPrice - order.trailAmount;
      if (newStopPrice > (order.stopPrice || 0)) {
        order.stopPrice = newStopPrice;
      }
    } else {
      const newStopPrice = currentPrice + order.trailAmount;
      if (newStopPrice < (order.stopPrice || Infinity)) {
        order.stopPrice = newStopPrice;
      }
    }
  }

  cancelOCOOrder(ocoOrderId: string): void {
    const ocoOrder = this.ocoOrders.get(ocoOrderId);
    if (!ocoOrder) return;

    // 関連する注文をキャンセル
    this.orders.delete(ocoOrder.order1.id);
    this.orders.delete(ocoOrder.order2.id);
    this.ocoOrders.delete(ocoOrderId);
  }

  cancelIcebergOrder(icebergOrderId: string): void {
    this.icebergOrders.delete(icebergOrderId);
  }

  cancelBracketOrder(bracketOrderId: string): void {
    const bracketOrder = this.bracketOrders.get(bracketOrderId);
    if (!bracketOrder) return;

    // 関連する注文をキャンセル
    this.orders.delete(bracketOrder.entryOrder.id);
    this.orders.delete(bracketOrder.stopLossOrder.id);
    this.orders.delete(bracketOrder.takeProfitOrder.id);
    this.bracketOrders.delete(bracketOrderId);
  }

  getOrder(orderId: string): Order | undefined {
    return this.orders.get(orderId);
  }

  getOCOOrder(ocoOrderId: string): OCOOrder | undefined {
    return this.ocoOrders.get(ocoOrderId);
  }

  getIcebergOrder(icebergOrderId: string): IcebergOrder | undefined {
    return this.icebergOrders.get(icebergOrderId);
  }

  getBracketOrder(bracketOrderId: string): BracketOrder | undefined {
    return this.bracketOrders.get(bracketOrderId);
  }

  private generateOrderId(): string {
    return `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

### 2. スリッページ予測・管理システム

```typescript
// src/execution/SlippageManager.ts
import { Order, MarketData, OrderBook } from '@/types/trading';

export interface SlippagePrediction {
  expectedSlippage: number; // パーセンテージ
  confidence: number;
  factors: {
    marketDepth: number;
    volatility: number;
    orderSize: number;
    timeOfDay: number;
  };
}

export interface SlippageMitigation {
  strategy: string;
  adjustedPrice: number;
  expectedSavings: number;
}

export class SlippageManager {
  private historicalSlippage: Map<string, number[]> = new Map();
  private maxHistoryLength = 100;

  predictSlippage(
    order: Order,
    marketData: MarketData,
    orderBook: OrderBook
  ): SlippagePrediction {
    const factors = this.calculateFactors(order, marketData, orderBook);
    const expectedSlippage = this.calculateExpectedSlippage(factors);
    const confidence = this.calculateConfidence(factors);

    return {
      expectedSlippage,
      confidence,
      factors
    };
  }

  private calculateFactors(
    order: Order,
    marketData: MarketData,
    orderBook: OrderBook
  ): SlippagePrediction['factors'] {
    // 市場深度
    const marketDepth = this.calculateMarketDepth(orderBook, order);

    // ボラティリティ
    const volatility = this.calculateVolatility(marketData);

    // 注文サイズ
    const orderSize = order.quantity * (order.price || marketData.ohlcv?.close || 0);

    // 時間帯
    const timeOfDay = this.calculateTimeOfDayFactor();

    return {
      marketDepth,
      volatility,
      orderSize,
      timeOfDay
    };
  }

  private calculateMarketDepth(orderBook: OrderBook, order: Order): number {
    const side = order.side === 'BUY' ? 'asks' : 'bids';
    const levels = orderBook[side];

    // 注文サイズをカバーするのに必要なレベル数
    let remainingQuantity = order.quantity;
    let levelsNeeded = 0;

    for (const [price, quantity] of levels) {
      remainingQuantity -= quantity;
      levelsNeeded++;

      if (remainingQuantity <= 0) break;
    }

    // 深度が浅いほどスリッページが大きい
    return 1 / (levelsNeeded + 1);
  }

  private calculateVolatility(marketData: MarketData): number {
    if (!marketData.ohlcv || marketData.ohlcv.history.length < 20) {
      return 0;
    }

    const prices = marketData.ohlcv.history.slice(-20).map(d => d.close);
    const returns = [];

    for (let i = 1; i < prices.length; i++) {
      returns.push(Math.log(prices[i] / prices[i - 1]));
    }

    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    return stdDev * Math.sqrt(252) * 100; // 年率化ボラティリティ
  }

  private calculateTimeOfDayFactor(): number {
    const hour = new Date().getHours();

    // 取引時間帯によるスリッページの変動
    if (hour >= 9 && hour < 10) {
      return 1.5; // 市場オープン直後はスリッページが大きい
    } else if (hour >= 10 && hour < 15) {
      return 1.0; // 通常時間
    } else if (hour >= 15 && hour < 16) {
      return 1.3; // クローズ前はスリッページが大きい
    }

    return 1.0;
  }

  private calculateExpectedSlippage(factors: SlippagePrediction['factors']): number {
    // 線形モデルでスリッページを予測
    const baseSlippage = 0.001; // 0.1%ベース

    const depthFactor = (1 - factors.marketDepth) * 0.005;
    const volatilityFactor = factors.volatility / 100 * 0.01;
    const sizeFactor = Math.log(factors.orderSize / 1000 + 1) * 0.002;
    const timeFactor = (factors.timeOfDay - 1) * 0.002;

    return Math.max(0, baseSlippage + depthFactor + volatilityFactor + sizeFactor + timeFactor);
  }

  private calculateConfidence(factors: SlippagePrediction['factors']): number {
    // データの品質に基づいて信頼度を計算
    let confidence = 1;

    // 市場深度が低い場合は信頼度を下げる
    if (factors.marketDepth < 0.3) {
      confidence *= 0.7;
    }

    // ボラティリティが高い場合は信頼度を下げる
    if (factors.volatility > 50) {
      confidence *= 0.8;
    }

    return confidence;
  }

  suggestMitigation(
    order: Order,
    prediction: SlippagePrediction,
    currentPrice: number
  ): SlippageMitigation {
    const strategies: SlippageMitigation[] = [];

    // 指値注文への切り替え
    if (order.type === 'MARKET') {
      const adjustedPrice = order.side === 'BUY'
        ? currentPrice * (1 - prediction.expectedSlippage * 0.5)
        : currentPrice * (1 + prediction.expectedSlippage * 0.5);

      strategies.push({
        strategy: 'Switch to Limit Order',
        adjustedPrice,
        expectedSavings: prediction.expectedSlippage * 0.5
      });
    }

    // 注文分割
    if (order.quantity > 100) {
      const splitSize = Math.floor(order.quantity / 2);
      const expectedSavings = prediction.expectedSlippage * 0.3;

      strategies.push({
        strategy: 'Split Order',
        adjustedPrice: currentPrice,
        expectedSavings
      });
    }

    // アルゴリズム執行の使用
    strategies.push({
      strategy: 'Use Algorithmic Execution',
      adjustedPrice: currentPrice,
      expectedSavings: prediction.expectedSlippage * 0.4
    });

    // 最も効果的な戦略を選択
    return strategies.reduce((best, current) =>
      current.expectedSavings > best.expectedSavings ? current : best
    );
  }

  recordActualSlippage(symbol: string, actualSlippage: number): void {
    const history = this.historicalSlippage.get(symbol) || [];
    history.push(actualSlippage);

    if (history.length > this.maxHistoryLength) {
      history.shift();
    }

    this.historicalSlippage.set(symbol, history);
  }

  getAverageSlippage(symbol: string): number {
    const history = this.historicalSlippage.get(symbol);
    if (!history || history.length === 0) return 0;

    return history.reduce((sum, s) => sum + s, 0) / history.length;
  }

  getSlippageHistory(symbol: string): number[] {
    return this.historicalSlippage.get(symbol) || [];
  }

  clearHistory(symbol?: string): void {
    if (symbol) {
      this.historicalSlippage.delete(symbol);
    } else {
      this.historicalSlippage.clear();
    }
  }
}
```

### 3. スマートオーダールーティングの構築

```typescript
// src/execution/SmartOrderRouter.ts
import { Order, OrderBook, Exchange } from '@/types/trading';

export interface Route {
  exchange: Exchange;
  quantity: number;
  price: number;
  expectedSlippage: number;
  fee: number;
  totalCost: number;
}

export interface RoutingDecision {
  routes: Route[];
  totalQuantity: number;
  averagePrice: number;
  totalCost: number;
  estimatedSlippage: number;
}

export class SmartOrderRouter {
  private exchanges: Exchange[] = [];
  private exchangeOrderBooks: Map<string, OrderBook> = new Map();
  private exchangeFees: Map<string, number> = new Map();

  addExchange(exchange: Exchange): void {
    this.exchanges.push(exchange);
  }

  updateOrderBook(exchangeId: string, orderBook: OrderBook): void {
    this.exchangeOrderBooks.set(exchangeId, orderBook);
  }

  setExchangeFee(exchangeId: string, fee: number): void {
    this.exchangeFees.set(exchangeId, fee);
  }

  routeOrder(order: Order): RoutingDecision {
    const routes: Route[] = [];
    let remainingQuantity = order.quantity;

    // 各取引所で最適なルートを計算
    for (const exchange of this.exchanges) {
      const orderBook = this.exchangeOrderBooks.get(exchange.id);
      if (!orderBook) continue;

      const route = this.calculateRoute(order, exchange, orderBook, remainingQuantity);
      if (route) {
        routes.push(route);
        remainingQuantity -= route.quantity;
      }

      if (remainingQuantity <= 0) break;
    }

    // ルートが見つからない場合
    if (routes.length === 0) {
      throw new Error('No available routes for order');
    }

    // 総コストの計算
    const totalCost = routes.reduce((sum, route) => sum + route.totalCost, 0);
    const averagePrice = totalCost / order.quantity;
    const estimatedSlippage = routes.reduce((sum, route) => sum + route.expectedSlippage, 0) / routes.length;

    return {
      routes,
      totalQuantity: order.quantity,
      averagePrice,
      totalCost,
      estimatedSlippage
    };
  }

  private calculateRoute(
    order: Order,
    exchange: Exchange,
    orderBook: OrderBook,
    maxQuantity: number
  ): Route | null {
    const side = order.side === 'BUY' ? 'asks' : 'bids';
    const levels = orderBook[side];

    let quantity = 0;
    let totalPrice = 0;
    let expectedSlippage = 0;

    for (const [price, availableQuantity] of levels) {
      const fillQuantity = Math.min(availableQuantity, maxQuantity - quantity);

      if (fillQuantity <= 0) break;

      quantity += fillQuantity;
      totalPrice += price * fillQuantity;

      // スリッページの計算
      const midPrice = (orderBook.bids[0]?.[0] || 0 + orderBook.asks[0]?.[0] || 0) / 2;
      expectedSlippage += Math.abs(price - midPrice) * fillQuantity;

      if (quantity >= maxQuantity) break;
    }

    if (quantity === 0) return null;

    const averagePrice = totalPrice / quantity;
    const fee = this.exchangeFees.get(exchange.id) || 0;
    const totalCost = totalPrice * (1 + fee);

    return {
      exchange,
      quantity,
      price: averagePrice,
      expectedSlippage: expectedSlippage / quantity,
      fee,
      totalCost
    };
  }

  findBestExchange(order: Order): Exchange | null {
    let bestExchange: Exchange | null = null;
    let bestCost = Infinity;

    for (const exchange of this.exchanges) {
      const orderBook = this.exchangeOrderBooks.get(exchange.id);
      if (!orderBook) continue;

      const route = this.calculateRoute(order, exchange, orderBook, order.quantity);
      if (route && route.totalCost < bestCost) {
        bestCost = route.totalCost;
        bestExchange = exchange;
      }
    }

    return bestExchange;
  }

  getLiquidityDepth(symbol: string): Map<string, number> {
    const depth = new Map<string, number>();

    for (const exchange of this.exchanges) {
      const orderBook = this.exchangeOrderBooks.get(exchange.id);
      if (!orderBook) continue;

      const bidDepth = orderBook.bids.reduce((sum, [_, quantity]) => sum + quantity, 0);
      const askDepth = orderBook.asks.reduce((sum, [_, quantity]) => sum + quantity, 0);

      depth.set(exchange.id, (bidDepth + askDepth) / 2);
    }

    return depth;
  }

  getSpread(symbol: string): Map<string, number> {
    const spreads = new Map<string, number>();

    for (const exchange of this.exchanges) {
      const orderBook = this.exchangeOrderBooks.get(exchange.id);
      if (!orderBook) continue;

      const bid = orderBook.bids[0]?.[0] || 0;
      const ask = orderBook.asks[0]?.[0] || 0;

      if (bid > 0 && ask > 0) {
        spreads.set(exchange.id, (ask - bid) / bid * 100);
      }
    }

    return spreads;
  }
}
```

### 4. 執行アルゴリズムの開発

```typescript
// src/execution/ExecutionAlgorithms.ts
import { Order, MarketData, OrderBook } from '@/types/trading';

export interface AlgorithmConfig {
  type: 'TWAP' | 'VWAP' | 'POV' | 'ImplementationShortfall';
  duration: number; // ミリ秒
  sliceSize?: number;
  participationRate?: number;
  limitPrice?: number;
}

export interface ExecutionSlice {
  orderId: string;
  quantity: number;
  targetTime: number;
  price?: number;
}

export class ExecutionAlgorithm {
  private config: AlgorithmConfig;
  private startTime: number;
  private endTime: number;
  private slices: ExecutionSlice[] = [];

  constructor(config: AlgorithmConfig) {
    this.config = config;
    this.startTime = Date.now();
    this.endTime = this.startTime + config.duration;
  }

  generateSlices(order: Order, marketData: MarketData, orderBook: OrderBook): ExecutionSlice[] {
    switch (this.config.type) {
      case 'TWAP':
        return this.generateTWAPSlices(order);
      case 'VWAP':
        return this.generateVWAPSlices(order, marketData, orderBook);
      case 'POV':
        return this.generatePOVSlices(order, marketData, orderBook);
      case 'ImplementationShortfall':
        return this.generateImplementationShortfallSlices(order, marketData, orderBook);
      default:
        throw new Error(`Unknown algorithm type: ${this.config.type}`);
    }
  }

  private generateTWAPSlices(order: Order): ExecutionSlice[] {
    const slices: ExecutionSlice[] = [];
    const totalDuration = this.endTime - this.startTime;
    const numSlices = Math.ceil(totalDuration / 60000); // 1分ごと
    const sliceSize = Math.floor(order.quantity / numSlices);

    for (let i = 0; i < numSlices; i++) {
      const targetTime = this.startTime + (i + 1) * (totalDuration / numSlices);
      const quantity = i === numSlices - 1
        ? order.quantity - sliceSize * i
        : sliceSize;

      if (quantity > 0) {
        slices.push({
          orderId: this.generateSliceId(order.id, i),
          quantity,
          targetTime
        });
      }
    }

    this.slices = slices;
    return slices;
  }

  private generateVWAPSlices(
    order: Order,
    marketData: MarketData,
    orderBook: OrderBook
  ): ExecutionSlice[] {
    const slices: ExecutionSlice[] = [];
    const totalDuration = this.endTime - this.startTime;
    const numSlices = Math.ceil(totalDuration / 60000); // 1分ごと

    // ヒストリカルボリュームプロファイルの取得
    const volumeProfile = this.getVolumeProfile(marketData);
    const totalVolume = volumeProfile.reduce((sum, v) => sum + v, 0);

    let remainingQuantity = order.quantity;

    for (let i = 0; i < numSlices && remainingQuantity > 0; i++) {
      const targetTime = this.startTime + (i + 1) * (totalDuration / numSlices);
      const volumeRatio = volumeProfile[i] / totalVolume;
      const quantity = Math.floor(order.quantity * volumeRatio);

      if (quantity > 0 && quantity <= remainingQuantity) {
        slices.push({
          orderId: this.generateSliceId(order.id, i),
          quantity,
          targetTime
        });

        remainingQuantity -= quantity;
      }
    }

    // 残りの数量を最後のスライスに追加
    if (remainingQuantity > 0 && slices.length > 0) {
      slices[slices.length - 1].quantity += remainingQuantity;
    }

    this.slices = slices;
    return slices;
  }

  private generatePOVSlices(
    order: Order,
    marketData: MarketData,
    orderBook: OrderBook
  ): ExecutionSlice[] {
    const slices: ExecutionSlice[] = [];
    const participationRate = this.config.participationRate || 0.1; // デフォルト10%
    const totalDuration = this.endTime - this.startTime;
    const numSlices = Math.ceil(totalDuration / 60000); // 1分ごと

    // 推定市場ボリュームの取得
    const estimatedMarketVolume = this.estimateMarketVolume(marketData);

    for (let i = 0; i < numSlices; i++) {
      const targetTime = this.startTime + (i + 1) * (totalDuration / numSlices);
      const marketVolume = estimatedMarketVolume / numSlices;
      const quantity = Math.floor(marketVolume * participationRate);

      if (quantity > 0) {
        slices.push({
          orderId: this.generateSliceId(order.id, i),
          quantity,
          targetTime
        });
      }
    }

    this.slices = slices;
    return slices;
  }

  private generateImplementationShortfallSlices(
    order: Order,
    marketData: MarketData,
    orderBook: OrderBook
  ): ExecutionSlice[] {
    const slices: ExecutionSlice[] = [];
    const totalDuration = this.endTime - this.startTime;
    const numSlices = Math.ceil(totalDuration / 60000); // 1分ごと

    // 市場インパクトと機会コストのバランスを考慮
    const marketImpact = this.calculateMarketImpact(order, orderBook);
    const opportunityCost = this.calculateOpportunityCost(order, marketData);

    // 最適な執行スケジュールを計算
    const alpha = 0.5; // 市場インパクトの重み
    const beta = 0.5; // 機会コストの重み

    for (let i = 0; i < numSlices; i++) {
      const targetTime = this.startTime + (i + 1) * (totalDuration / numSlices);
      const timeRatio = (i + 1) / numSlices;

      // 市場インパクトを最小化するために時間をかける
      const impactFactor = Math.pow(timeRatio, alpha);

      // 機会コストを最小化するために早く執行する
      const costFactor = Math.pow(1 - timeRatio, beta);

      const quantity = Math.floor(order.quantity * (impactFactor * costFactor));

      if (quantity > 0) {
        slices.push({
          orderId: this.generateSliceId(order.id, i),
          quantity,
          targetTime
        });
      }
    }

    this.slices = slices;
    return slices;
  }

  private getVolumeProfile(marketData: MarketData): number[] {
    // ヒストリカルボリュームプロファイルを取得
    // 実際の実装ではデータベースから取得
    const profile: number[] = [];

    for (let i = 0; i < 60; i++) { // 60分
      // ランダムなボリュームを生成（簡易版）
      profile.push(Math.random() * 1000 + 500);
    }

    return profile;
  }

  private estimateMarketVolume(marketData: MarketData): number {
    // 推定市場ボリュームを計算
    // 実際の実装ではヒストリカルデータから計算
    return 100000; // 簡易版
  }

  private calculateMarketImpact(order: Order, orderBook: OrderBook): number {
    // 市場インパクトを計算
    const side = order.side === 'BUY' ? 'asks' : 'bids';
    const levels = orderBook[side];

    let impact = 0;
    let remainingQuantity = order.quantity;

    for (const [price, quantity] of levels) {
      const fillQuantity = Math.min(quantity, remainingQuantity);
      impact += Math.abs(price - levels[0][0]) * fillQuantity;
      remainingQuantity -= fillQuantity;

      if (remainingQuantity <= 0) break;
    }

    return impact / order.quantity;
  }

  private calculateOpportunityCost(order: Order, marketData: MarketData): number {
    // 機会コストを計算
    const volatility = this.calculateVolatility(marketData);
    const duration = (this.endTime - this.startTime) / 1000 / 60; // 分

    return volatility * duration * 0.01; // 簡易版
  }

  private calculateVolatility(marketData: MarketData): number {
    if (!marketData.ohlcv || marketData.ohlcv.history.length < 20) {
      return 0;
    }

    const prices = marketData.ohlcv.history.slice(-20).map(d => d.close);
    const returns = [];

    for (let i = 1; i < prices.length; i++) {
      returns.push(Math.log(prices[i] / prices[i - 1]));
    }

    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    return stdDev * Math.sqrt(252) * 100;
  }

  private generateSliceId(orderId: string, index: number): string {
    return `${orderId}-SLICE-${index}`;
  }

  getSlices(): ExecutionSlice[] {
    return this.slices;
  }

  getProgress(): number {
    const elapsed = Date.now() - this.startTime;
    return Math.min(1, elapsed / (this.endTime - this.startTime));
  }

  isComplete(): boolean {
    return Date.now() >= this.endTime;
  }
}
```

## 実装計画

### フェーズ1: 高度なオーダータイプ（2週間）
- [ ] ストップロス注文の実装
- [ ] テイクプロフィット注文の実装
- [ ] OCO注文の実装
- [ ] アイスバーグ注文の実装
- [ ] ユニットテストの作成

### フェーズ2: スリッページ予測・管理（2週間）
- [ ] スリッページ予測モデルの実装
- [ ] 市場深度分析の実装
- [ ] 軽減戦略の提案機能
- [ ] 履歴データの収集
- [ ] 統合テストの作成

### フェーズ3: スマートオーダールーティング（2週間）
- [ ] 取引所管理の実装
- [ ] 最適ルート計算の実装
- [ ] 流動性分析の実装
- [ ] 手数料考慮の実装
- [ ] パフォーマンステストの作成

### フェーズ4: 執行アルゴリズム（2週間）
- [ ] TWAPアルゴリズムの実装
- [ ] VWAPアルゴリズムの実装
- [ ] POVアルゴリズムの実装
- [ ] 実装ショートフォールの実装
- [ ] E2Eテストの作成

## 成功基準
- 高度なオーダータイプの実装率100%
- スリッページ予測の精度85%以上
- スマートルーティングのコスト削減20%以上
- 執行アルゴリズムの市場インパクト低減30%以上

## 関連Issue
- TRADING-001: データ品質と信頼性の向上
- TRADING-003: リスク管理システムの高度化

## ラベル
enhancement, execution-quality, priority:high
