import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
import 'fake-indexeddb/auto';
import { setupTestEnvironment, cleanupTestEnvironment } from './app/__tests__/utils/test-utils';

// --- POLYFILLS ---

// TextEncoder/Decoder
if (typeof global.TextEncoder === 'undefined') {
  (global as any).TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  (global as any).TextDecoder = TextDecoder;
}

// Crypto (needed for UUIDs)
if (typeof global.crypto === 'undefined' || !global.crypto.randomUUID) {
  const nodeCrypto = require('crypto');
  (global as any).crypto = {
    randomUUID: () => nodeCrypto.randomUUID(),
    subtle: nodeCrypto.webcrypto?.subtle,
    getRandomValues: (buffer: any) => nodeCrypto.randomFillSync(buffer),
  };
}

// structuredClone for fake-indexeddb
if (typeof global.structuredClone === 'undefined') {
  (global as any).structuredClone = (val: any) => JSON.parse(JSON.stringify(val));
}

// Request/Response for Next.js API testing
if (typeof Request === 'undefined') {
  (global as any).Request = class Request {
    url: string;
    method: string;
    headers: Map<string, string>;
    constructor(input: any, init?: any) {
      this.url = typeof input === 'string' ? input : input.url;
      this.method = init?.method || 'GET';
      this.headers = new Map(Object.entries(init?.headers || {}));
    }
  };
}

if (typeof Response === 'undefined') {
  (global as any).Response = class Response {
    body: any;
    status: number;
    headers: Map<string, string>;
    constructor(body: any, init?: any) {
      this.body = body;
      this.status = init?.status || 200;
      this.headers = new Map(Object.entries(init?.headers || {}));
    }
    json() {
      return Promise.resolve(typeof this.body === 'string' ? JSON.parse(this.body) : this.body);
    }
    static json(data: any, init?: any) {
      return new Response(JSON.stringify(data), {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...(init?.headers || {}),
        },
      });
    }
  };
}

// --- TEST ENVIRONMENT SETUP ---

setupTestEnvironment();

afterEach(() => {
  cleanupTestEnvironment();
});

// --- MOCKS ---

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() { }
  unobserve() { }
  disconnect() { }
};

// Mock ScrollTo
if (typeof window !== 'undefined') {
  window.scrollTo = jest.fn();
}

// Mock Canvas (needed for Chart.js)
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = jest.fn((contextType) => {
    if (contextType === 'webgl' || contextType === 'webgl2') {
      return {
        getExtension: jest.fn().mockReturnValue(null),
        getParameter: jest.fn().mockReturnValue(null),
        getShaderPrecisionFormat: jest.fn().mockReturnValue({ precision: 0 }),
        isContextLost: jest.fn().mockReturnValue(false),
      } as any;
    }
    return {
      fillRect: jest.fn(),
      clearRect: jest.fn(),
      getImageData: jest.fn(),
      putImageData: jest.fn(),
      createImageData: jest.fn(),
      setTransform: jest.fn(),
      drawImage: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      closePath: jest.fn(),
      stroke: jest.fn(),
      translate: jest.fn(),
      scale: jest.fn(),
      rotate: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      measureText: jest.fn(() => ({ width: 0 })),
      transform: jest.fn(),
      rect: jest.fn(),
      clip: jest.fn(),
      createLinearGradient: jest.fn(() => ({
        addColorStop: jest.fn()
      })),
    } as any;
  }) as any;
}

// Configure TensorFlow.js for Node.js environment
process.env.TFJS_BACKEND = 'cpu';

// Mock Performance API
if (!global.performance) {
  (global as any).performance = {
    now: jest.fn(() => Date.now()),
    getEntriesByType: jest.fn(() => []),
    mark: jest.fn(),
    measure: jest.fn(),
  };
} else {
  if (!global.performance.getEntriesByType) {
    (global as any).performance.getEntriesByType = jest.fn(() => []);
  }
}

// Mock lightweight-charts
jest.mock('lightweight-charts', () => ({
  createChart: jest.fn().mockReturnValue({
    addSeries: jest.fn().mockReturnValue({
      setData: jest.fn(),
      setMarkers: jest.fn(),
      applyOptions: jest.fn(),
      priceScale: jest.fn().mockReturnValue({
        applyOptions: jest.fn(),
      }),
    }),
    remove: jest.fn(),
    subscribeCrosshairMove: jest.fn(),
    unsubscribeCrosshairMove: jest.fn(),
    applyOptions: jest.fn(),
    timeScale: jest.fn().mockReturnValue({
      fitContent: jest.fn(),
      scrollToRealTime: jest.fn(),
    }),
    priceScale: jest.fn().mockReturnValue({
      applyOptions: jest.fn(),
    }),
  }),
  ColorType: { Solid: 'solid' },
  CrosshairMode: { Normal: 0 },
  LineStyle: { Solid: 0, Dotted: 1, Dashed: 2, LargeDashed: 3, SparseDotted: 4 },
  PriceScaleMode: { Normal: 0, Logarithmic: 1, Percentage: 2, IndexedTo100: 3 },
  CandlestickSeries: 'Candlestick',
  LineSeries: 'Line',
  HistogramSeries: 'Histogram',
}));
