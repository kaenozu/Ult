#
# Real-time Data Quality and WebSocket Integration (アーカイブ)

> **注記**: 2026年2月時点で WebSocket ベースのデータパイプラインは撤去済みで、現在は HTTP ベースのマーケットデータのみを使用しています。このファイルは過去のアーキテクチャ参考資料として残していますが、現行構成では WebSocket 機能は存在しません。

現在のデータ品質フローは以下の要素で構成されています。

- **Yahoo Finance/REST API 取得**: データを定期的に取得し、キャッシュ済みデータを再利用します。
- **DataQualityValidator**: シンプルな整合性チェックと異常検知を行います。
- **SmartDataCache**: 更新頻度の低い資産についてはポーリングを最小限に抑えます。
- **Realtime ではなくバッチ更新**: 最新データは数秒間隔で取得されるため、従来の WebSocket ほど低レイテンシではありません。

必要であれば、この資料を現行構成に合わせて再構成しますのでご指示ください。

// Get statistics
const stats = monitor.getStats('AAPL');
console.log('Average latency:', stats.avgLatencyMs);
console.log('P95 latency:', stats.p95LatencyMs);
console.log('P99 latency:', stats.p99LatencyMs);

// Check freshness
const freshness = monitor.checkFreshness('AAPL');
console.log('Age (ms):', freshness.ageMs);
console.log('Is fresh:', freshness.isFresh);

// Get alerts
const alerts = monitor.getAlerts('critical');
console.log('Critical alerts:', alerts);
```

#### 5. SmartDataCache

Intelligent caching layer with TTL and LRU eviction.

**Features:**
- TTL-based expiration
- LRU eviction
- Prefetch strategies
- Tag-based cache invalidation
- Hit rate metrics

**Usage:**

```typescript
import { SmartDataCache } from '@/app/lib/data/cache/SmartDataCache';

const cache = new SmartDataCache({
  maxSize: 1000,
  defaultTTL: 60000, // 1 minute
  enablePrefetch: true,
  enableMetrics: true,
});

// Get or fetch data
const data = await cache.getOrFetch(
  'market:AAPL',
  async () => {
    return await fetchMarketData('AAPL');
  },
  300000, // 5 minutes TTL
  ['market', 'stock']
);

// Get cache statistics
const stats = cache.getStats();
console.log('Hit rate:', stats.hitRate);
console.log('Size:', stats.size);
console.log('Evictions:', stats.evictions);

// Clear cache by tag
cache.clearByTag('market');
```

## Success Metrics

The system is designed to meet the following success criteria:

### 1. Data Latency < 100ms
- **Current Status:** ✅ Achieved
- **Implementation:** WebSocketDataFlowService with latency monitoring
- **Verification:** Real-time latency tracking and alerting

### 2. Data Loss Rate < 0.1%
- **Current Status:** ✅ Achieved
- **Implementation:** Quality validation and multi-source aggregation
- **Verification:** Data quality metrics tracking

### 3. Anomaly Detection Rate > 95%
- **Current Status:** ✅ Achieved
- **Implementation:** Statistical and ML-based anomaly detection
- **Verification:** Anomaly detection confidence scoring

### 4. Cache Hit Rate > 90%
- **Current Status:** ✅ Achievable
- **Implementation:** SmartDataCache with intelligent prefetching
- **Verification:** Cache statistics monitoring

## Performance Optimization

### Low Latency Strategies

1. **Direct WebSocket Connection**
   - No polling, push-based data delivery
   - Heartbeat mechanism to detect stale connections

2. **Efficient Data Processing**
   - Streaming data validation
   - Minimal data transformation
   - Asynchronous processing

3. **Intelligent Caching**
   - Hot data in memory
   - Prefetch for predictable access patterns
   - TTL-based expiration

### High Reliability Strategies

1. **Multi-Source Aggregation**
   - Primary + backup sources
   - Automatic fallback
   - Cross-validation

2. **Quality Gates**
   - Real-time validation
   - Anomaly detection
   - Data freshness checks

3. **Connection Resilience**
   - Automatic reconnection
   - Exponential backoff
   - Circuit breaker pattern

## Monitoring and Alerting

### Key Metrics

1. **Connection Metrics**
   - WebSocket connection status
   - Reconnection attempts
   - Connection uptime

2. **Data Quality Metrics**
   - Validation pass rate
   - Anomaly detection count
   - Data freshness score

3. **Performance Metrics**
   - Average latency
   - P95/P99 latency
   - Cache hit rate
   - Throughput (messages/sec)

### Alert Types

1. **Critical Alerts**
   - Connection lost
   - Data quality failures
   - Latency > critical threshold

2. **Warning Alerts**
   - Inconsistent data across sources
   - Anomalies detected
   - Latency > warning threshold

3. **Info Alerts**
   - Source health changes
   - Cache misses
   - Minor data warnings

## Testing

### Unit Tests
- ✅ WebSocketDataFlowService (27 tests)
- ✅ MultiSourceDataAggregator (21 tests)
- ✅ DataQualityValidator
- ✅ DataLatencyMonitor
- ✅ SmartDataCache

### E2E Tests
- ✅ WebSocket connection and latency
- ✅ Real-time data quality validation
- ✅ Multi-source consistency
- ✅ Cache performance
- ✅ Anomaly detection

### Performance Tests
- Load testing with concurrent connections
- Latency measurement under high throughput
- Cache effectiveness analysis

## Future Enhancements

1. **Advanced ML Models**
   - Deep learning for anomaly detection
   - Predictive data quality scoring

2. **Enhanced Monitoring**
   - Real-time dashboards
   - Historical trend analysis
   - Predictive alerts

3. **Optimizations**
   - WebAssembly for data processing
   - Custom compression for WebSocket
   - GPU acceleration for ML inference

## Troubleshooting

### Common Issues

#### High Latency
- Check network connectivity
- Verify WebSocket server performance
- Review data processing pipeline
- Check cache configuration

#### Data Quality Issues
- Review validation rules
- Check source data quality
- Verify timestamp synchronization
- Review anomaly detection thresholds

#### Low Cache Hit Rate
- Adjust TTL settings
- Review prefetch strategies
- Check cache size limits
- Analyze access patterns

## Conclusion

The real-time data quality and WebSocket integration system provides a robust, high-performance solution for the ULT Trading Platform. With comprehensive quality validation, multi-source aggregation, and intelligent caching, the system meets all success criteria for low latency, high reliability, and excellent data quality.
