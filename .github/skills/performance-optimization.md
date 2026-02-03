# Performance Optimization Agent

## Purpose
アプリケーション性能の分析、最適化、監視を専門とするエージェント。

## Capabilities
- レスポンスタイム分析と改善
- メモリ使用量の最適化
- バンドルサイズの削減
- データベースクエリの最適化
- キャッシュ戦略の実装
- パフォーマンス監視設定

## Performance Analysis Tools

### Frontend Performance
```bash
# Lighthouse監査
npx lighthouse http://localhost:3000 --output json --output-path ./lighthouse-report.json

# Webpackバンドル分析
npx webpack-bundle-analyzer .next/static/chunks/

# パフォーマンス計測
npm run perf:measure

# レンダリングパフォーマンス
npm run perf:lighthouse
```

### Backend Performance
```bash
# APIレスポンスタイム
npm run perf:api

# データベースクエリ分析
npm run perf:db

# メモリ使用量監視
npm run perf:memory

# CPUプロファイリング
npm run perf:cpu
```

## Performance Metrics

### Key Performance Indicators (KPIs)
- **First Contentful Paint (FCP)**: < 1.5s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **Time to Interactive (TTI)**: < 3.8s
- **Cumulative Layout Shift (CLS)**: < 0.1
- **First Input Delay (FID)**: < 100ms

### Monitoring Setup
```javascript
// lib/performance-monitor.ts
import { performance } from 'perf_hooks';

class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();

  startTimer(name: string): () => void {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.recordMetric(name, duration);
    };
  }

  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(value);
  }

  getAverage(name: string): number {
    const values = this.metrics.get(name) || [];
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  generateReport(): object {
    const report: Record<string, any> = {};
    for (const [name, values] of this.metrics.entries()) {
      report[name] = {
        count: values.length,
        average: values.reduce((a, b) => a + b, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        p95: this.percentile(values, 0.95),
        p99: this.percentile(values, 0.99)
      };
    }
    return report;
  }

  private percentile(values: number[], p: number): number {
    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[index];
  }
}

export const performanceMonitor = new PerformanceMonitor();
```

## Optimization Strategies

### React Performance
```javascript
// 1. Component Memoization
const MemoizedComponent = React.memo(({ data }) => {
  return <div>{data.value}</div>;
}, (prevProps, nextProps) => {
  return prevProps.data.value === nextProps.data.value;
});

// 2. Expensive Calculation Caching
const expensiveCalculation = useMemo(() => {
  return computeExpensiveValue(data);
}, [data.id, data.params]);

// 3. Callback Optimization
const optimizedCallback = useCallback(() => {
  doSomething(dependencies);
}, [dependencies]);

// 4. Virtual Scrolling for Large Lists
import { FixedSizeList as List } from 'react-window';

const LargeList = ({ items }) => (
  <List
    height={600}
    itemCount={items.length}
    itemSize={35}
  >
    {({ index, style }) => (
      <div style={style}>
        {items[index].content}
      </div>
    )}
  </List>
);
```

### Bundle Optimization
```javascript
// next.config.js
module.exports = {
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lodash', 'antd', 'chart.js']
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all'
          }
        }
      };
    }
    return config;
  }
};
```

### Data Fetching Optimization
```javascript
// 1. Request Deduplication
const requestCache = new Map();

async function fetchWithCache(url: string): Promise<any> {
  if (requestCache.has(url)) {
    return requestCache.get(url);
  }
  
  const response = await fetch(url);
  const data = await response.json();
  requestCache.set(url, data);
  return data;
}

// 2. Parallel Data Fetching
async function fetchMultipleData(urls: string[]): Promise<any[]> {
  return Promise.all(urls.map(url => fetchWithCache(url)));
}

// 3. Prefetching Critical Data
useEffect(() => {
  prefetchCriticalData();
}, []);

// 4. Pagination with Infinite Scroll
const useInfiniteScroll = (fetchFunction) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    const newData = await fetchFunction(data.length);
    setData(prev => [...prev, ...newData]);
    setHasMore(newData.length > 0);
    setLoading(false);
  }, [fetchFunction, data.length, loading, hasMore]);

  return { data, loading, hasMore, loadMore };
};
```

### Caching Strategies
```javascript
// 1. Service Worker for Caching
const CACHE_NAME = 'app-cache-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

// 2. React Query for Server State
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 3
    }
  }
});

// 3. LocalStorage Cache
class LocalCache {
  set(key: string, value: any, ttl: number): void {
    const item = {
      value,
      timestamp: Date.now(),
      ttl
    };
    localStorage.setItem(key, JSON.stringify(item));
  }

  get(key: string): any {
    const item = JSON.parse(localStorage.getItem(key) || '{}');
    if (!item.value) return null;
    
    if (Date.now() - item.timestamp > item.ttl) {
      localStorage.removeItem(key);
      return null;
    }
    
    return item.value;
  }
}
```

## Database Optimization

### Query Optimization
```sql
-- インデックス追加
CREATE INDEX idx_user_created_at ON users(created_at);
CREATE INDEX idx_stock_symbol ON stocks(symbol);

-- クエリ最適化
SELECT id, symbol, price 
FROM stocks 
WHERE symbol = 'AAPL' 
AND created_at > '2024-01-01'
ORDER BY created_at DESC
LIMIT 100;

-- 集計クエリ
SELECT 
  symbol,
  AVG(price) as avg_price,
  MAX(price) as max_price,
  MIN(price) as min_price,
  COUNT(*) as count
FROM stocks 
WHERE created_at >= date_sub(now(), interval 30 day)
GROUP BY symbol;
```

### Connection Pooling
```javascript
// lib/database.ts
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20, // 最大接続数
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Query executed', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Query error', { text, error });
    throw error;
  }
};
```

## Performance Monitoring

### Real User Monitoring (RUM)
```javascript
// lib/rum.ts
class RUM {
  private endpoint: string;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }

  trackPageView(): void {
    const metrics = {
      type: 'pageview',
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
      loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart
    };
    this.send(metrics);
  }

  trackCustomEvent(name: string, data: any): void {
    const event = {
      type: 'custom',
      name,
      data,
      timestamp: Date.now()
    };
    this.send(event);
  }

  private send(data: any): void {
    navigator.sendBeacon(this.endpoint, JSON.stringify(data));
  }
}

export const rum = new RUM('/api/analytics');
```

### Error Tracking
```javascript
// lib/error-tracking.ts
class ErrorTracker {
  trackError(error: Error, context?: any): void {
    const errorData = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(errorData)
    });
  }
}

export const errorTracker = new ErrorTracker();

// 使用例
try {
  await riskyOperation();
} catch (error) {
  errorTracker.trackError(error, { operation: 'riskyOperation' });
}
```

## Performance Tests

### Load Testing
```javascript
// tests/load/api.test.js
import { check } from 'k6';
import http from 'k6/http';

export let options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 100 },
    { duration: '2m', target: 0 },
  ],
};

export default function () {
  const response = http.get('http://localhost:3000/api/stocks');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
```

### Performance Budgets
```javascript
// scripts/performance-budget.js
const budget = {
  resourceCounts: {
    script: 15,
    stylesheet: 3,
    image: 25,
    font: 5,
    total: 48
  },
  sizes: {
    script: '300KB',
    stylesheet: '100KB',
    image: '2MB',
    font: '200KB',
    total: '2.5MB'
  },
  timings: {
    fcp: 1500,
    lcp: 2500,
    tti: 3800
  }
};

// Webpackプラグインで適用
const PerformanceBudgetPlugin = require('webpack-performance-budget-plugin');

module.exports = {
  plugins: [
    new PerformanceBudgetPlugin({
      budget
    })
  ]
};
```

## Continuous Performance Monitoring

### Alerting
```yaml
# .github/workflows/performance-monitor.yml
name: Performance Monitor

on:
  schedule:
    - cron: '0 */6 * * *'  # 6時間ごと

jobs:
  performance-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v9
        with:
          configPath: './lighthouse.config.js'
          uploadArtifacts: true
          temporaryPublicStorage: true
```

### Dashboards
```javascript
// モニタリングダッシュボードデータ
const performanceMetrics = {
  responseTime: {
    current: 245,
    average: 320,
    target: 300
  },
  errorRate: {
    current: 0.2,
    average: 0.15,
    target: 0.1
  },
  throughput: {
    current: 1250,
    average: 1100,
    target: 1000
  }
};
```

このエージェントはパフォーマンスの監視、分析、最適化を通じてアプリケーションの高速化と安定性向上を支援します。