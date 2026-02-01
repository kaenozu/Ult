/**
 * ConnectionMetrics.test.ts
 * 
 * Unit tests for connection quality metrics tracking
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { 
  ConnectionMetricsTracker,
  createConnectionMetricsTracker,
  type ConnectionMetrics,
} from '../ConnectionMetrics';

describe('ConnectionMetricsTracker', () => {
  let tracker: ConnectionMetricsTracker;
  let originalDateNow: () => number;

  beforeEach(() => {
    tracker = createConnectionMetricsTracker();
    originalDateNow = Date.now;
    
    // Mock Date.now for deterministic tests
    let mockTime = 1000000;
    Date.now = jest.fn(() => mockTime) as unknown as () => number;
    (Date.now as jest.Mock).mockImplementation(() => mockTime++);
  });

  afterEach(() => {
    Date.now = originalDateNow;
    tracker.reset();
  });

  describe('Initialization', () => {
    it('should start with offline quality', () => {
      const metrics = tracker.getMetrics();
      expect(metrics.quality).toBe('offline');
    });

    it('should have zero initial metrics', () => {
      const metrics = tracker.getMetrics();
      expect(metrics.latency).toBe(0);
      expect(metrics.avgLatency).toBe(0);
      expect(metrics.packetsSent).toBe(0);
      expect(metrics.packetsReceived).toBe(0);
      expect(metrics.reconnectCount).toBe(0);
    });
  });

  describe('Latency Tracking', () => {
    it('should record ping-pong latency', () => {
      const sequenceId = 'ping-1';
      
      // Record ping
      tracker.recordPingSent(sequenceId);
      
      // Advance time by 50ms
      const sendTime = Date.now() - 1;
      (Date.now as jest.Mock).mockImplementation(() => sendTime + 50);
      
      // Record pong
      tracker.recordPongReceived(sequenceId);
      
      const metrics = tracker.getMetrics();
      expect(metrics.latency).toBe(50);
      expect(metrics.avgLatency).toBe(50);
      expect(metrics.minLatency).toBe(50);
      expect(metrics.maxLatency).toBe(50);
    });

    it('should calculate average latency over multiple measurements', () => {
      const baseTime = Date.now();
      
      // First ping-pong: 30ms
      (Date.now as jest.Mock).mockReturnValue(baseTime);
      tracker.recordPingSent('ping-1');
      (Date.now as jest.Mock).mockReturnValue(baseTime + 30);
      tracker.recordPongReceived('ping-1');
      
      // Second ping-pong: 50ms
      (Date.now as jest.Mock).mockReturnValue(baseTime + 100);
      tracker.recordPingSent('ping-2');
      (Date.now as jest.Mock).mockReturnValue(baseTime + 150);
      tracker.recordPongReceived('ping-2');
      
      // Third ping-pong: 40ms
      (Date.now as jest.Mock).mockReturnValue(baseTime + 200);
      tracker.recordPingSent('ping-3');
      (Date.now as jest.Mock).mockReturnValue(baseTime + 240);
      tracker.recordPongReceived('ping-3');
      
      const metrics = tracker.getMetrics();
      expect(metrics.avgLatency).toBe(40); // (30 + 50 + 40) / 3
      expect(metrics.minLatency).toBe(30);
      expect(metrics.maxLatency).toBe(50);
    });

    it('should update connection quality based on latency', () => {
      const baseTime = Date.now();
      
      // Excellent quality: < 50ms
      (Date.now as jest.Mock).mockReturnValue(baseTime);
      tracker.recordPingSent('ping-1');
      (Date.now as jest.Mock).mockReturnValue(baseTime + 30);
      tracker.recordPongReceived('ping-1');
      
      let metrics = tracker.getMetrics();
      expect(metrics.quality).toBe('excellent');
      
      // Good quality: 50-100ms
      (Date.now as jest.Mock).mockReturnValue(baseTime + 100);
      tracker.recordPingSent('ping-2');
      (Date.now as jest.Mock).mockReturnValue(baseTime + 170);
      tracker.recordPongReceived('ping-2');
      
      metrics = tracker.getMetrics();
      expect(metrics.quality).toBe('good');
    });
  });

  describe('Packet Loss Tracking', () => {
    it('should track sent and received packets', () => {
      tracker.recordPingSent('ping-1');
      tracker.recordPingSent('ping-2');
      tracker.recordPongReceived('ping-1');
      
      const metrics = tracker.getMetrics();
      expect(metrics.packetsSent).toBe(2);
      expect(metrics.packetsReceived).toBe(1);
    });

    it('should calculate packet loss rate', () => {
      // Send 10 packets, receive 8
      for (let i = 0; i < 10; i++) {
        tracker.recordPingSent(`ping-${i}`);
      }
      
      for (let i = 0; i < 8; i++) {
        tracker.recordPongReceived(`ping-${i}`);
      }
      
      // Manually trigger packet loss detection by advancing time
      const baseTime = Date.now();
      (Date.now as jest.Mock).mockReturnValue(baseTime + 15000); // 15 seconds later
      tracker.recordPingSent('ping-timeout'); // This will check for timeouts
      
      const metrics = tracker.getMetrics();
      expect(metrics.packetLossRate).toBeGreaterThan(0);
    });

    it('should ignore pong for unknown ping', () => {
      tracker.recordPongReceived('unknown-ping');
      
      const metrics = tracker.getMetrics();
      expect(metrics.packetsReceived).toBe(0);
      expect(metrics.packetsSent).toBe(0);
    });
  });

  describe('Throughput Tracking', () => {
    it('should track messages received', () => {
      tracker.recordConnectionEstablished();
      
      const baseTime = Date.now();
      (Date.now as jest.Mock).mockReturnValue(baseTime);
      
      // Record 5 messages
      for (let i = 0; i < 5; i++) {
        tracker.recordMessageReceived(100); // 100 bytes each
      }
      
      // Advance time by 1 second
      (Date.now as jest.Mock).mockReturnValue(baseTime + 1000);
      tracker.recordMessageReceived(100); // Trigger throughput calculation
      
      const metrics = tracker.getMetrics();
      expect(metrics.messagesPerSecond).toBeGreaterThan(0);
      expect(metrics.bytesPerSecond).toBeGreaterThan(0);
    });
  });

  describe('Connection State', () => {
    it('should record connection established', () => {
      tracker.recordConnectionEstablished();
      
      const metrics = tracker.getMetrics();
      expect(metrics.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should record connection lost', () => {
      tracker.recordConnectionEstablished();
      tracker.recordConnectionLost();
      
      const metrics = tracker.getMetrics();
      expect(metrics.quality).toBe('offline');
      expect(metrics.uptime).toBe(0);
      expect(metrics.lastDisconnectTime).toBeGreaterThan(0);
    });

    it('should track reconnection count', () => {
      tracker.recordReconnection();
      tracker.recordReconnection();
      tracker.recordReconnection();
      
      const metrics = tracker.getMetrics();
      expect(metrics.reconnectCount).toBe(3);
    });

    it('should calculate uptime when connected', () => {
      const baseTime = Date.now();
      (Date.now as jest.Mock).mockReturnValue(baseTime);
      
      tracker.recordConnectionEstablished();
      
      // Advance time by 5 seconds
      (Date.now as jest.Mock).mockReturnValue(baseTime + 5000);
      
      const metrics = tracker.getMetrics();
      expect(metrics.uptime).toBe(5000);
    });
  });

  describe('History Management', () => {
    it('should maintain latency history', () => {
      const baseTime = Date.now();
      
      for (let i = 0; i < 5; i++) {
        (Date.now as jest.Mock).mockReturnValue(baseTime + i * 100);
        tracker.recordPingSent(`ping-${i}`);
        (Date.now as jest.Mock).mockReturnValue(baseTime + i * 100 + 50);
        tracker.recordPongReceived(`ping-${i}`);
      }
      
      const history = tracker.getLatencyHistory();
      expect(history.length).toBe(5);
      expect(history[0].latency).toBe(50);
    });

    it('should limit latency history size', () => {
      const baseTime = Date.now();
      
      // Record 35 measurements (more than the limit of 30)
      for (let i = 0; i < 35; i++) {
        (Date.now as jest.Mock).mockReturnValue(baseTime + i * 100);
        tracker.recordPingSent(`ping-${i}`);
        (Date.now as jest.Mock).mockReturnValue(baseTime + i * 100 + 50);
        tracker.recordPongReceived(`ping-${i}`);
      }
      
      const history = tracker.getLatencyHistory();
      expect(history.length).toBe(30); // Should be limited to 30
    });
  });

  describe('Reset', () => {
    it('should reset all metrics', () => {
      // Record some data
      tracker.recordConnectionEstablished();
      tracker.recordPingSent('ping-1');
      tracker.recordPongReceived('ping-1');
      tracker.recordReconnection();
      
      // Reset
      tracker.reset();
      
      // Check all metrics are reset
      const metrics = tracker.getMetrics();
      expect(metrics.latency).toBe(0);
      expect(metrics.avgLatency).toBe(0);
      expect(metrics.packetsSent).toBe(0);
      expect(metrics.packetsReceived).toBe(0);
      expect(metrics.reconnectCount).toBe(0);
      expect(metrics.quality).toBe('offline');
      expect(metrics.uptime).toBe(0);
      
      const history = tracker.getLatencyHistory();
      expect(history.length).toBe(0);
    });
  });

  describe('Quality Scoring', () => {
    it('should determine excellent quality', () => {
      const baseTime = Date.now();
      
      // Low latency (30ms) and no packet loss
      (Date.now as jest.Mock).mockReturnValue(baseTime);
      tracker.recordPingSent('ping-1');
      (Date.now as jest.Mock).mockReturnValue(baseTime + 30);
      tracker.recordPongReceived('ping-1');
      
      const metrics = tracker.getMetrics();
      expect(metrics.quality).toBe('excellent');
    });

    it('should determine good quality', () => {
      const baseTime = Date.now();
      
      // Medium latency (80ms)
      (Date.now as jest.Mock).mockReturnValue(baseTime);
      tracker.recordPingSent('ping-1');
      (Date.now as jest.Mock).mockReturnValue(baseTime + 80);
      tracker.recordPongReceived('ping-1');
      
      const metrics = tracker.getMetrics();
      expect(metrics.quality).toBe('good');
    });

    it('should determine fair quality', () => {
      const baseTime = Date.now();
      
      // Higher latency (150ms)
      (Date.now as jest.Mock).mockReturnValue(baseTime);
      tracker.recordPingSent('ping-1');
      (Date.now as jest.Mock).mockReturnValue(baseTime + 150);
      tracker.recordPongReceived('ping-1');
      
      const metrics = tracker.getMetrics();
      expect(metrics.quality).toBe('fair');
    });

    it('should determine poor quality', () => {
      const baseTime = Date.now();
      
      // High latency (400ms)
      (Date.now as jest.Mock).mockReturnValue(baseTime);
      tracker.recordPingSent('ping-1');
      (Date.now as jest.Mock).mockReturnValue(baseTime + 400);
      tracker.recordPongReceived('ping-1');
      
      const metrics = tracker.getMetrics();
      expect(metrics.quality).toBe('poor');
    });
  });
});
