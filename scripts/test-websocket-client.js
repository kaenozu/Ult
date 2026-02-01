#!/usr/bin/env node
/**
 * WebSocket Client Test Script
 * 
 * Tests the WebSocket server connection and basic functionality
 */

const WebSocket = require('ws');

const WS_URL = process.env.WS_URL || 'ws://localhost:3001/ws';
const TEST_DURATION = 10000; // 10 seconds

console.log('🧪 WebSocket Client Test');
console.log('========================');
console.log(`URL: ${WS_URL}`);
console.log('');

let messageCount = 0;
let pingsSent = 0;
let pongsReceived = 0;
let connectionTime = 0;

const ws = new WebSocket(WS_URL, {
  headers: {
    'Origin': 'http://localhost:3000'
  }
});

ws.on('open', () => {
  console.log('✅ Connected to WebSocket server');
  connectionTime = Date.now();
  
  // Send a ping every 2 seconds
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      pingsSent++;
      ws.send(JSON.stringify({
        type: 'ping',
        data: { timestamp: Date.now() }
      }));
      console.log(`📤 Sent ping #${pingsSent}`);
    }
  }, 2000);
  
  // Stop after test duration
  setTimeout(() => {
    clearInterval(pingInterval);
    console.log('');
    console.log('📊 Test Results:');
    console.log('================');
    console.log(`✅ Connection duration: ${Date.now() - connectionTime}ms`);
    console.log(`📨 Messages received: ${messageCount}`);
    console.log(`📤 Pings sent: ${pingsSent}`);
    console.log(`📥 Pongs received: ${pongsReceived}`);
    console.log(`✅ Success rate: ${Math.round((pongsReceived / pingsSent) * 100)}%`);
    console.log('');
    
    ws.close();
    process.exit(0);
  }, TEST_DURATION);
});

ws.on('message', (data) => {
  messageCount++;
  try {
    const message = JSON.parse(data.toString());
    
    if (message.type === 'pong') {
      pongsReceived++;
      console.log(`📥 Received pong #${pongsReceived} (latency: ${Date.now() - message.data.timestamp}ms)`);
    } else if (message.type === 'connection') {
      console.log(`📨 Welcome message: ${message.data.message}`);
    } else {
      console.log(`📨 Received ${message.type}:`, message.data);
    }
  } catch (error) {
    console.error('❌ Failed to parse message:', error);
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error.message);
  process.exit(1);
});

ws.on('close', (code, reason) => {
  console.log(`🔌 Connection closed: ${code} ${reason}`);
});

console.log('⏳ Connecting...');
