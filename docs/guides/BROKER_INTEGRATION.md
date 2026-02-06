# Broker Integration Guide

## Overview

The ULT Trading Platform now supports real broker integration for executing actual trades. This guide covers how to set up and use the broker integration system.

## Supported Brokers

### 1. Paper Trading (Default)
- **Purpose**: Testing and development
- **Features**: 
  - Simulated order execution
  - No real money involved
  - Realistic delays and slippage
  - Position tracking
  - Virtual cash management

### 2. Alpaca Markets
- **Markets**: US stocks, ETFs, and Japanese stocks
- **Documentation**: https://alpaca.markets/docs/
- **Features**:
  - Commission-free trading
  - Extended hours trading
  - Paper trading mode available
  - Real-time market data

### 3. OANDA (Coming Soon)
- **Markets**: Forex and commodities
- **Documentation**: https://www.oanda.com/
- **Features**: TBD

### 4. Interactive Brokers (Coming Soon)
- **Markets**: Global stocks and derivatives
- **Documentation**: https://www.interactivebrokers.com/
- **Features**: TBD

## Setup Instructions

### 1. Environment Configuration

Copy `.env.example` to `.env.local` and configure your broker settings:

```bash
cp .env.example .env.local
```

### 2. Configure Broker Credentials

#### For Paper Trading (No Setup Required)
```env
DEFAULT_BROKER=paper
ENABLE_PAPER_TRADING=true
```

#### For Alpaca Markets
1. Sign up at https://alpaca.markets/
2. Get your API keys from the dashboard
3. Add to `.env.local`:

```env
DEFAULT_BROKER=alpaca
ALPACA_API_KEY=your_api_key_here
ALPACA_API_SECRET=your_api_secret_here
ALPACA_PAPER_TRADING=true  # Use false for live trading
```

### 3. Initialize the Order Executor

In your application code:

```typescript
import { initializeOrderExecutor, OrderExecutorConfig } from '@/app/lib/brokers';

const config: OrderExecutorConfig = {
  defaultBroker: process.env.DEFAULT_BROKER as BrokerType || 'paper',
  brokers: [
    {
      type: 'paper',
      apiKey: 'not_required',
      apiSecret: 'not_required',
      paperTrading: true,
    },
    // Add Alpaca if configured
    ...(process.env.ALPACA_API_KEY ? [{
      type: 'alpaca' as const,
      apiKey: process.env.ALPACA_API_KEY,
      apiSecret: process.env.ALPACA_API_SECRET || '',
      paperTrading: process.env.ALPACA_PAPER_TRADING === 'true',
    }] : []),
  ],
  autoRetry: true,
  maxRetries: 3,
  retryDelay: 1000,
};

const executor = initializeOrderExecutor(config);
```

## Usage Examples

### Executing Orders

```typescript
import { getOrderExecutor } from '@/app/lib/brokers';
import { BrokerOrderRequest } from '@/app/types/broker';

const executor = getOrderExecutor();

// Execute a market order
const order: BrokerOrderRequest = {
  symbol: 'AAPL',
  side: 'buy',
  type: 'market',
  quantity: 100,
  limitPrice: 150, // For paper trading price simulation
};

const result = await executor.execute(order);

if (result.success) {
  console.log('Order executed:', result.order);
  console.log('Slippage:', result.slippage);
} else {
  console.error('Order failed:', result.error);
}
```

### Executing Limit Orders

```typescript
const limitOrder: BrokerOrderRequest = {
  symbol: 'GOOGL',
  side: 'buy',
  type: 'limit',
  quantity: 50,
  limitPrice: 2500,
  timeInForce: 'gtc', // Good till cancelled
};

const result = await executor.execute(limitOrder);
```

### Cancelling Orders

```typescript
const cancelled = await executor.cancel(orderId);
if (cancelled) {
  console.log('Order cancelled successfully');
}
```

### Getting Positions

```typescript
const positions = await executor.getPositions();
positions.forEach(pos => {
  console.log(`${pos.symbol}: ${pos.quantity} shares`);
  console.log(`P&L: $${pos.unrealizedPnL} (${pos.unrealizedPnLPercent}%)`);
});
```

### Getting Account Information

```typescript
const account = await executor.getAccount();
console.log(`Cash: $${account.cash}`);
console.log(`Buying Power: $${account.buyingPower}`);
console.log(`Portfolio Value: $${account.portfolioValue}`);
```

### Checking Open Orders

```typescript
const openOrders = await executor.getOpenOrders();
console.log(`You have ${openOrders.length} open orders`);
```

## Order Types

### Market Orders
- Execute immediately at best available price
- No price guarantee
- Fast execution
- Use for high-liquidity stocks

```typescript
{
  type: 'market',
  side: 'buy',
  quantity: 100,
}
```

### Limit Orders
- Execute only at specified price or better
- Price guarantee
- May not execute if price not reached
- Use when price is important

```typescript
{
  type: 'limit',
  side: 'buy',
  quantity: 100,
  limitPrice: 150.50,
}
```

### Stop Orders
- Trigger when price reaches stop level
- Becomes market order when triggered
- Use for stop-loss or entry strategies

```typescript
{
  type: 'stop',
  side: 'sell',
  quantity: 100,
  stopPrice: 145.00,
}
```

### Stop-Limit Orders
- Trigger at stop price
- Execute as limit order
- Most precise control
- May not execute in fast markets

```typescript
{
  type: 'stop_limit',
  side: 'sell',
  quantity: 100,
  stopPrice: 145.00,
  limitPrice: 144.50,
}
```

## Time in Force Options

- **day**: Order valid for current trading day
- **gtc**: Good till cancelled (default for most brokers)
- **ioc**: Immediate or cancel (execute immediately or cancel)
- **fok**: Fill or kill (execute completely or cancel)

## Error Handling

The broker integration includes comprehensive error handling:

### Validation Errors
```typescript
const result = await executor.execute(order);
if (!result.success) {
  // Handle validation or execution errors
  console.error(result.error);
}
```

### Retry Logic
Orders are automatically retried up to 3 times (configurable) with exponential backoff:

```typescript
const config: OrderExecutorConfig = {
  // ...
  autoRetry: true,
  maxRetries: 3,
  retryDelay: 1000, // milliseconds
};
```

### Connection Errors
```typescript
try {
  await executor.connect('alpaca');
} catch (error) {
  console.error('Failed to connect to broker:', error);
}
```

## Best Practices

### 1. Always Check Results
```typescript
const result = await executor.execute(order);
if (!result.success) {
  // Handle error
  return;
}
```

### 2. Use Paper Trading for Testing
```env
DEFAULT_BROKER=paper
ENABLE_PAPER_TRADING=true
```

### 3. Monitor Slippage
```typescript
if (result.slippage && result.slippage > 0.50) {
  console.warn('High slippage detected:', result.slippage);
}
```

### 4. Implement Position Limits
```typescript
const positions = await executor.getPositions();
const totalValue = positions.reduce((sum, pos) => sum + pos.marketValue, 0);

if (totalValue > MAX_POSITION_VALUE) {
  console.warn('Position limit exceeded');
  return;
}
```

### 5. Handle Rate Limits
Brokers have API rate limits. The OrderExecutor handles retries, but you should:
- Batch operations when possible
- Cache position and account data
- Use websockets for real-time updates (when available)

## Security Considerations

### 1. Never Commit API Keys
- Use `.env.local` for credentials
- Add `.env.local` to `.gitignore`
- Use environment variables in production

### 2. Use Paper Trading First
- Test all strategies with paper trading
- Verify order execution logic
- Monitor for bugs and issues

### 3. Validate All Orders
The system validates orders before submission, but you should also:
- Check available cash
- Verify position sizes
- Implement risk limits

### 4. Monitor for Anomalies
- Unusual order volumes
- Unexpected position changes
- Rapid order rejections

## Troubleshooting

### Connection Issues
```typescript
if (!executor.isConnected()) {
  await executor.connect();
}
```

### Order Rejections
Common reasons:
- Insufficient funds
- Invalid symbol
- Market closed
- Position limits exceeded

### API Rate Limits
If you hit rate limits:
- Reduce order frequency
- Use batch operations
- Cache data appropriately

## Testing

Run the broker integration tests:

```bash
# Test paper trading connector
npm test app/lib/brokers/__tests__/PaperTradingConnector.test.ts

# Test order executor
npm test app/lib/brokers/__tests__/OrderExecutor.test.ts

# Run all broker tests
npm test app/lib/brokers/__tests__/
```

## API Reference

### OrderExecutor Methods

#### `execute(order, brokerType?)`
Execute an order through the specified broker.

**Parameters:**
- `order: BrokerOrderRequest` - Order details
- `brokerType?: BrokerType` - Optional broker override

**Returns:** `Promise<OrderExecutionResult>`

#### `cancel(orderId, brokerType?)`
Cancel an open order.

**Parameters:**
- `orderId: string` - Order ID to cancel
- `brokerType?: BrokerType` - Optional broker override

**Returns:** `Promise<boolean>`

#### `getPositions(brokerType?)`
Get current positions.

**Returns:** `Promise<BrokerPosition[]>`

#### `getAccount(brokerType?)`
Get account information.

**Returns:** `Promise<BrokerAccount | null>`

#### `getOpenOrders(brokerType?)`
Get all open orders.

**Returns:** `Promise<BrokerOrderResponse[]>`

## Migration from Mock Store

To migrate from the existing mock store implementation:

1. Keep the existing Zustand store for UI state
2. Use OrderExecutor for actual order execution
3. Update store after successful broker execution
4. Handle async operations properly

Example integration:

```typescript
// In your store
executeOrder: async (order: OrderRequest) => {
  const executor = getOrderExecutor();
  
  // Execute through broker
  const result = await executor.execute({
    symbol: order.symbol,
    side: order.side === 'LONG' ? 'buy' : 'sell',
    type: order.orderType === 'MARKET' ? 'market' : 'limit',
    quantity: order.quantity,
    limitPrice: order.price,
  });
  
  if (!result.success) {
    return { success: false, error: result.error };
  }
  
  // Update local state
  set((state) => ({
    portfolio: {
      ...state.portfolio,
      // Update positions, cash, etc.
    }
  }));
  
  return { success: true, orderId: result.order?.orderId };
}
```

## Future Enhancements

- [ ] OANDA connector implementation
- [ ] Interactive Brokers connector implementation
- [ ] WebSocket support for real-time updates
- [ ] Advanced order types (OCO, bracket orders)
- [ ] Commission tracking
- [ ] Tax reporting integration
- [ ] Order history and analytics

## Support

For issues or questions:
1. Check the [troubleshooting section](#troubleshooting)
2. Review broker API documentation
3. Check the test files for usage examples
4. Open an issue on GitHub

## License

This broker integration is part of the ULT Trading Platform and follows the same license.
