/**
 * ConnectionMetrics.ts
 * 
 * Tracks WebSocket connection quality metrics including:
 * - Latency (ping-pong RTT)
 * - Packet loss
 * - Throughput (messages/sec)
 * - Connection stability
 */

export interface ConnectionMetrics {
  // Latency metrics
  latency: number; // Current latency in ms
  avgLatency: number; // Average latency over time window
  minLatency: number; // Minimum latency observed
  maxLatency: number; // Maximum latency observed
  
  // Packet loss metrics
  packetsSent: number;
  packetsReceived: number;
  packetsLost: number;
  packetLossRate: number; // Percentage (0-100)
  
  // Throughput metrics
  messagesPerSecond: number;
  bytesPerSecond: number;
  
  // Connection quality
  quality: ConnectionQuality; // Overall connection quality score
  reconnectCount: number;
  uptime: number; // Connection uptime in ms
  lastDisconnectTime: number | null;
}

export type ConnectionQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'offline';

export interface LatencyMeasurement {
  timestamp: number;
  latency: number;
  sequenceId: string;
}

export interface ThroughputMeasurement {
  timestamp: number;
  messageCount: number;
  byteCount: number;
}

/**
 * Connection metrics tracker
 */
export class ConnectionMetricsTracker {
  private latencyHistory: LatencyMeasurement[] = [];
  private throughputHistory: ThroughputMeasurement[] = [];
  private pendingPings = new Map<string, number>(); // sequenceId -> timestamp
  
  private metrics: ConnectionMetrics = {
    latency: 0,
    avgLatency: 0,
    minLatency: Infinity,
    maxLatency: 0,
    packetsSent: 0,
    packetsReceived: 0,
    packetsLost: 0,
    packetLossRate: 0,
    messagesPerSecond: 0,
    bytesPerSecond: 0,
    quality: 'offline',
    reconnectCount: 0,
    uptime: 0,
    lastDisconnectTime: null,
  };
  
  private connectionStartTime = 0;
  private lastThroughputCheck = 0;
  private messageCountSinceLastCheck = 0;
  private byteCountSinceLastCheck = 0;
  
  // Configuration
  private readonly LATENCY_HISTORY_SIZE = 30; // Keep last 30 measurements
  private readonly THROUGHPUT_WINDOW_MS = 1000; // 1 second window
  private readonly PING_TIMEOUT_MS = 10000; // 10 seconds
  
  /**
   * Record a ping sent
   */
  recordPingSent(sequenceId: string): void {
    const timestamp = Date.now();
    this.pendingPings.set(sequenceId, timestamp);
    this.metrics.packetsSent++;
    
    // Clean up old pending pings (timeout)
    const cutoff = timestamp - this.PING_TIMEOUT_MS;
    for (const [id, time] of this.pendingPings.entries()) {
      if (time < cutoff) {
        this.pendingPings.delete(id);
        this.metrics.packetsLost++;
      }
    }
    
    this.updatePacketLossRate();
  }
  
  /**
   * Record a pong received
   */
  recordPongReceived(sequenceId: string): void {
    const receiveTime = Date.now();
    const sendTime = this.pendingPings.get(sequenceId);
    
    if (sendTime) {
      const latency = receiveTime - sendTime;
      this.pendingPings.delete(sequenceId);
      this.metrics.packetsReceived++;
      
      // Update latency metrics
      this.updateLatencyMetrics(latency, sequenceId);
    }
    
    this.updatePacketLossRate();
  }
  
  /**
   * Record a message received
   */
  recordMessageReceived(messageSize: number): void {
    this.messageCountSinceLastCheck++;
    this.byteCountSinceLastCheck += messageSize;
    
    // Check if we should update throughput
    const now = Date.now();
    if (now - this.lastThroughputCheck >= this.THROUGHPUT_WINDOW_MS) {
      this.updateThroughputMetrics(now);
    }
  }
  
  /**
   * Record connection established
   */
  recordConnectionEstablished(): void {
    this.connectionStartTime = Date.now();
    this.lastThroughputCheck = this.connectionStartTime;
    this.messageCountSinceLastCheck = 0;
    this.byteCountSinceLastCheck = 0;
  }
  
  /**
   * Record connection lost
   */
  recordConnectionLost(): void {
    this.metrics.lastDisconnectTime = Date.now();
    this.metrics.uptime = 0;
    this.metrics.quality = 'offline';
    this.pendingPings.clear();
  }
  
  /**
   * Record reconnection
   */
  recordReconnection(): void {
    this.metrics.reconnectCount++;
  }
  
  /**
   * Get current metrics
   */
  getMetrics(): ConnectionMetrics {
    // Update uptime if connected
    if (this.connectionStartTime > 0) {
      this.metrics.uptime = Date.now() - this.connectionStartTime;
    }
    
    return { ...this.metrics };
  }
  
  /**
   * Reset all metrics
   */
  reset(): void {
    this.latencyHistory = [];
    this.throughputHistory = [];
    this.pendingPings.clear();
    
    this.metrics = {
      latency: 0,
      avgLatency: 0,
      minLatency: Infinity,
      maxLatency: 0,
      packetsSent: 0,
      packetsReceived: 0,
      packetsLost: 0,
      packetLossRate: 0,
      messagesPerSecond: 0,
      bytesPerSecond: 0,
      quality: 'offline',
      reconnectCount: 0,
      uptime: 0,
      lastDisconnectTime: null,
    };
    
    this.connectionStartTime = 0;
    this.lastThroughputCheck = 0;
    this.messageCountSinceLastCheck = 0;
    this.byteCountSinceLastCheck = 0;
  }
  
  /**
   * Get latency history
   */
  getLatencyHistory(): LatencyMeasurement[] {
    return [...this.latencyHistory];
  }
  
  /**
   * Get throughput history
   */
  getThroughputHistory(): ThroughputMeasurement[] {
    return [...this.throughputHistory];
  }
  
  /**
   * Update latency metrics
   */
  private updateLatencyMetrics(latency: number, sequenceId: string): void {
    // Update current latency
    this.metrics.latency = latency;
    
    // Update min/max
    this.metrics.minLatency = Math.min(this.metrics.minLatency, latency);
    this.metrics.maxLatency = Math.max(this.metrics.maxLatency, latency);
    
    // Add to history
    this.latencyHistory.push({
      timestamp: Date.now(),
      latency,
      sequenceId,
    });
    
    // Trim history
    if (this.latencyHistory.length > this.LATENCY_HISTORY_SIZE) {
      this.latencyHistory.shift();
    }
    
    // Calculate average latency
    if (this.latencyHistory.length > 0) {
      const sum = this.latencyHistory.reduce((acc, m) => acc + m.latency, 0);
      this.metrics.avgLatency = sum / this.latencyHistory.length;
    }
    
    // Update connection quality
    this.updateConnectionQuality();
  }
  
  /**
   * Update throughput metrics
   */
  private updateThroughputMetrics(now: number): void {
    const elapsed = now - this.lastThroughputCheck;
    if (elapsed <= 0) return;
    
    // Calculate rates per second
    this.metrics.messagesPerSecond = (this.messageCountSinceLastCheck / elapsed) * 1000;
    this.metrics.bytesPerSecond = (this.byteCountSinceLastCheck / elapsed) * 1000;
    
    // Add to history
    this.throughputHistory.push({
      timestamp: now,
      messageCount: this.messageCountSinceLastCheck,
      byteCount: this.byteCountSinceLastCheck,
    });
    
    // Trim history (keep last 60 measurements = 1 minute)
    if (this.throughputHistory.length > 60) {
      this.throughputHistory.shift();
    }
    
    // Reset counters
    this.lastThroughputCheck = now;
    this.messageCountSinceLastCheck = 0;
    this.byteCountSinceLastCheck = 0;
  }
  
  /**
   * Update packet loss rate
   */
  private updatePacketLossRate(): void {
    const totalPackets = this.metrics.packetsSent;
    if (totalPackets > 0) {
      this.metrics.packetLossRate = (this.metrics.packetsLost / totalPackets) * 100;
    } else {
      this.metrics.packetLossRate = 0;
    }
  }
  
  /**
   * Update connection quality based on metrics
   */
  private updateConnectionQuality(): void {
    const { avgLatency, packetLossRate } = this.metrics;
    
    // If no measurements yet
    if (this.latencyHistory.length === 0) {
      this.metrics.quality = 'offline';
      return;
    }
    
    // Determine quality based on latency and packet loss
    if (avgLatency < 50 && packetLossRate < 1) {
      this.metrics.quality = 'excellent';
    } else if (avgLatency < 100 && packetLossRate < 3) {
      this.metrics.quality = 'good';
    } else if (avgLatency < 200 && packetLossRate < 5) {
      this.metrics.quality = 'fair';
    } else if (avgLatency < 500 && packetLossRate < 10) {
      this.metrics.quality = 'poor';
    } else {
      this.metrics.quality = 'poor';
    }
  }
}

/**
 * Create a new connection metrics tracker
 */
export function createConnectionMetricsTracker(): ConnectionMetricsTracker {
  return new ConnectionMetricsTracker();
}
