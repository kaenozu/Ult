/**
 * Broker Integration Usage Examples
 * 
 * This file demonstrates how to use the broker integration system.
 * Run with: npx ts-node -r tsconfig-paths/register examples/broker-usage.ts
 */

import { 
  initializeOrderExecutor, 
  getOrderExecutor,
  loadBrokerConfigFromEnv,
} from '../app/lib/brokers';

/**
 * Example 1: Initialize the broker system
 */
async function example1_Initialize() {
  console.log('\n=== Example 1: Initialize Broker System ===\n');

  // Load configuration from environment variables
  const config = loadBrokerConfigFromEnv();
  
  console.log('Configuration loaded:');
  console.log(`- Default broker: ${config.defaultBroker}`);
  console.log(`- Number of brokers: ${config.brokers.length}`);
  console.log(`- Auto-retry enabled: ${config.autoRetry}`);
  
  // Initialize the order executor
  const executor = initializeOrderExecutor(config);
  
  // Connect to all brokers
  await executor.connectAll();
  
  console.log('\n✓ Broker system initialized and connected');
}

/**
 * Example 2: Execute a market order
 */
async function example2_MarketOrder() {
  console.log('\n=== Example 2: Execute Market Order ===\n');

  const executor = getOrderExecutor();
  
  const order = {
    symbol: 'AAPL',
    side: 'buy' as const,
    type: 'market' as const,
    quantity: 10,
    limitPrice: 150, // For paper trading simulation
  };
  
  console.log('Executing order:', order);
  
  const result = await executor.execute(order);
  
  if (result.success && result.order) {
    console.log('\n✓ Order executed successfully!');
    console.log(`- Order ID: ${result.order.orderId}`);
    console.log(`- Status: ${result.order.status}`);
    console.log(`- Filled: ${result.order.filledQuantity} shares`);
    console.log(`- Price: $${result.order.averageFillPrice?.toFixed(2)}`);
    console.log(`- Slippage: $${result.slippage?.toFixed(2)}`);
  } else {
    console.error('\n✗ Order failed:', result.error);
  }
}

/**
 * Example 3: Get positions and account info
 */
async function example3_GetPositions() {
  console.log('\n=== Example 3: Get Current Positions ===\n');

  const executor = getOrderExecutor();
  
  const positions = await executor.getPositions();
  const account = await executor.getAccount();
  
  if (positions.length === 0) {
    console.log('No positions found.');
  } else {
    console.log(`Found ${positions.length} position(s):\n`);
    
    positions.forEach((pos, index) => {
      console.log(`${index + 1}. ${pos.symbol}`);
      console.log(`   - Quantity: ${pos.quantity}`);
      console.log(`   - P&L: $${pos.unrealizedPnL.toFixed(2)} (${pos.unrealizedPnLPercent.toFixed(2)}%)\n`);
    });
  }
  
  if (account) {
    console.log('Account Summary:');
    console.log(`- Cash: $${account.cash.toFixed(2)}`);
    console.log(`- Portfolio Value: $${account.portfolioValue.toFixed(2)}`);
  }
}

/**
 * Main function to run all examples
 */
async function main() {
  try {
    console.log('='.repeat(60));
    console.log('Broker Integration Usage Examples');
    console.log('='.repeat(60));
    
    await example1_Initialize();
    await example2_MarketOrder();
    await example3_GetPositions();
    
    console.log('\n' + '='.repeat(60));
    console.log('All examples completed!');
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('\n❌ Error running examples:', error);
    process.exit(1);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { example1_Initialize, example2_MarketOrder, example3_GetPositions };
