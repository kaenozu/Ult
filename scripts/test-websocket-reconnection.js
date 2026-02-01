#!/usr/bin/env node
/**
 * WebSocket Reconnection Test Script
 * 
 * Tests the reconnection logic by simulating connection failures
 */

const WebSocket = require('ws');

const WS_URL = process.env.WS_URL || 'ws://localhost:3001/ws';
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_INTERVAL = 2000;

console.log('🔄 WebSocket Reconnection Test');
console.log('==============================');
console.log(`URL: ${WS_URL}`);
console.log('');

let ws = null;
let reconnectAttempts = 0;
let connectionCount = 0;
let totalDisconnections = 0;

function connect() {
  console.log(`⏳ Connection attempt #${reconnectAttempts + 1}...`);
  
  ws = new WebSocket(WS_URL, {
    headers: {
      'Origin': 'http://localhost:3000'
    }
  });
  
  ws.on('open', () => {
    connectionCount++;
    reconnectAttempts = 0;
    console.log(`✅ Connected! (Total connections: ${connectionCount})`);
    
    // Send a test message
    ws.send(JSON.stringify({
      type: 'ping',
      data: { timestamp: Date.now() }
    }));
  });
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      if (message.type === 'connection') {
        console.log(`📨 Welcome: ${message.data.message}`);
      } else if (message.type === 'pong') {
        console.log(`📥 Pong received`);
      }
    } catch (error) {
      console.error('❌ Failed to parse message:', error);
    }
  });
  
  ws.on('error', (error) => {
    console.error(`❌ Connection error: ${error.message}`);
  });
  
  ws.on('close', (code, reason) => {
    totalDisconnections++;
    console.log(`🔌 Connection closed: ${code} ${reason}`);
    
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      const delay = RECONNECT_INTERVAL * Math.pow(2, reconnectAttempts - 1);
      console.log(`⏱️  Scheduling reconnect in ${delay}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
      
      setTimeout(() => {
        connect();
      }, delay);
    } else {
      console.log('');
      console.log('📊 Test Results:');
      console.log('================');
      console.log(`✅ Total connections: ${connectionCount}`);
      console.log(`🔌 Total disconnections: ${totalDisconnections}`);
      console.log(`❌ Max reconnect attempts reached`);
      console.log('');
      process.exit(0);
    }
  });
}

// Start initial connection
connect();

// Simulate disconnection after 3 seconds
setTimeout(() => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    console.log('');
    console.log('🔪 Simulating connection failure...');
    ws.close(1000, 'Simulated network failure');
  }
}, 3000);

// Auto-exit after 20 seconds
setTimeout(() => {
  console.log('');
  console.log('⏰ Test timeout reached');
  console.log('');
  console.log('📊 Final Results:');
  console.log('================');
  console.log(`✅ Total connections: ${connectionCount}`);
  console.log(`🔌 Total disconnections: ${totalDisconnections}`);
  console.log(`🔄 Reconnect attempts: ${reconnectAttempts}`);
  console.log('');
  
  if (ws) {
    ws.close();
  }
  process.exit(0);
}, 20000);
