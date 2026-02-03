# Broker Integration Module

This module provides a unified interface for connecting to multiple broker APIs for executing real trades.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Application Layer                       │
│                    (Zustand Store / UI)                      │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   OrderExecutor Service                      │
│  • Order routing                                             │
│  • Retry logic                                               │
│  • Error handling                                            │
└───────────────────────┬─────────────────────────────────────┘
                        │
          ┌─────────────┼─────────────┬─────────────┐
          ▼             ▼             ▼             ▼
    ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
    │  Paper  │   │ Alpaca  │   │ OANDA   │   │   IB    │
    │ Trading │   │         │   │         │   │         │
    └─────────┘   └─────────┘   └─────────┘   └─────────┘
```

## Components

### 1. Type Definitions (`../../types/broker.ts`)
- **BrokerType**: Supported broker types
- **BrokerOrderRequest**: Order request format
- **BrokerOrderResponse**: Order execution response
- **BrokerPosition**: Position information
- **BrokerAccount**: Account information
- **IBrokerConnector**: Interface all brokers must implement

### 2. Base Connector (`BaseBrokerConnector.ts`)
Abstract base class providing:
- Order validation
- Error handling
- Retry logic
- Common utilities

### 3. Broker Implementations

#### Paper Trading (`PaperTradingConnector.ts`)
- Mock broker for testing
- Simulates order execution
- Realistic delays and slippage
- Position tracking
- No real money involved

#### Alpaca Markets (`AlpacaConnector.ts`)
- US stocks and ETFs
- Paper and live trading modes
- Extended hours support
- REST API integration

#### OANDA (Coming Soon)
- Forex and commodities trading
- Practice and live accounts

#### Interactive Brokers (Coming Soon)
- Global stocks and derivatives
- TWS integration

### 4. Order Executor (`OrderExecutor.ts`)
Central service that:
- Manages multiple broker connections
- Routes orders to appropriate broker
- Handles retry logic
- Provides unified API

### 5. Configuration (`config.ts`)
Utilities for:
- Loading config from environment
- Validating configuration
- Broker status checks
- Display helpers

### 6. Store Integration (`storeIntegration.ts`)
Bridge between Zustand store and brokers:
- Format conversion
- Async order execution
- Position synchronization

## Usage

### Basic Setup

```typescript
import { initializeOrderExecutor, loadBrokerConfigFromEnv } from '@/app/lib/brokers';

// Load configuration from environment variables
const config = loadBrokerConfigFromEnv();

// Initialize executor
const executor = initializeOrderExecutor(config);

// Connect to brokers
await executor.connectAll();
```

### Execute Orders

```typescript
import { getOrderExecutor } from '@/app/lib/brokers';

const executor = getOrderExecutor();

const result = await executor.execute({
  symbol: 'AAPL',
  side: 'buy',
  type: 'market',
  quantity: 100,
  limitPrice: 150,
});

if (result.success) {
  console.log('Order executed:', result.order);
}
```

### Manage Positions

```typescript
// Get current positions
const positions = await executor.getPositions();

// Get account information
const account = await executor.getAccount();

// Get open orders
const openOrders = await executor.getOpenOrders();

// Cancel an order
await executor.cancel(orderId);
```

## Testing

All components have comprehensive test coverage:

```bash
# Run all broker tests
npm test app/lib/brokers/__tests__/

# Test specific component
npm test app/lib/brokers/__tests__/PaperTradingConnector.test.ts
npm test app/lib/brokers/__tests__/OrderExecutor.test.ts
```

## Configuration

### Environment Variables

```env
# Default broker
DEFAULT_BROKER=paper

# Paper trading
ENABLE_PAPER_TRADING=true

# Alpaca
ALPACA_API_KEY=your_key
ALPACA_API_SECRET=your_secret
ALPACA_PAPER_TRADING=true

# Retry settings
ORDER_RETRY_ENABLED=true
ORDER_MAX_RETRIES=3
ORDER_RETRY_DELAY=1000
```

See `.env.example` for complete configuration.

## Adding a New Broker

To add a new broker:

1. **Create Connector Class**
   ```typescript
   export class NewBrokerConnector extends BaseBrokerConnector {
     async connect() { /* ... */ }
     async executeOrder(order) { /* ... */ }
     // Implement other methods
   }
   ```

2. **Update BrokerType**
   ```typescript
   // In types/broker.ts
   export type BrokerType = 'paper' | 'alpaca' | 'new_broker';
   ```

3. **Add to OrderExecutor**
   ```typescript
   // In OrderExecutor.ts createConnector method
   case 'new_broker':
     return new NewBrokerConnector(config);
   ```

4. **Add Configuration**
   ```typescript
   // In config.ts loadBrokerConfigFromEnv
   if (process.env.NEW_BROKER_API_KEY) {
     brokers.push({ /* ... */ });
   }
   ```

5. **Write Tests**
   ```typescript
   // __tests__/NewBrokerConnector.test.ts
   describe('NewBrokerConnector', () => {
     // Test all interface methods
   });
   ```

## Error Handling

The system provides multiple layers of error handling:

1. **Validation**: Orders are validated before submission
2. **Retry Logic**: Failed orders are retried with exponential backoff
3. **Error Messages**: Descriptive error messages for debugging
4. **Connection Management**: Automatic reconnection on disconnect

## Best Practices

1. **Always use Paper Trading first** - Test strategies before live trading
2. **Validate Orders** - Check funds and limits before submission
3. **Handle Errors** - Always check result.success
4. **Monitor Slippage** - Track execution vs expected prices
5. **Use Appropriate Order Types** - Match order type to strategy
6. **Implement Position Limits** - Prevent over-exposure
7. **Log Important Events** - Track orders, fills, rejections

## Security

⚠️ **Important Security Notes**:

- Never commit API keys to version control
- Use environment variables for credentials
- Enable 2FA on broker accounts
- Use paper trading for development
- Implement position and loss limits
- Monitor for unusual activity
- Rotate API keys regularly

## Future Enhancements

- [ ] WebSocket support for real-time updates
- [ ] Advanced order types (OCO, bracket)
- [ ] Commission tracking
- [ ] Tax reporting
- [ ] Order analytics
- [ ] Performance metrics
- [ ] Risk management integration

## Support

For issues or questions:
- Check the [main documentation](../../../docs/BROKER_INTEGRATION.md)
- Review test files for usage examples
- Check broker API documentation
- Open an issue on GitHub

## License

Part of the ULT Trading Platform. See main LICENSE file.
