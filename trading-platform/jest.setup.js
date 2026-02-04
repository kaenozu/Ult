import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util';
import 'fake-indexeddb/auto';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Polyfill structuredClone for fake-indexeddb
if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = (val) => JSON.parse(JSON.stringify(val));
}

// Mock Request and Response for Next.js API routes testing
if (typeof Request === 'undefined') {
  global.Request = class Request {
    constructor(input, init) {
      this.url = typeof input === 'string' ? input : input.url;
      this.method = init?.method || 'GET';
      this.headers = new Map(Object.entries(init?.headers || {}));
    }
  };
}

if (typeof Response === 'undefined') {
  global.Response = class Response {
    constructor(body, init) {
      this.body = body;
      this.status = init?.status || 200;
      this.headers = new Map(Object.entries(init?.headers || {}));
    }
    
    json() {
      return Promise.resolve(typeof this.body === 'string' ? JSON.parse(this.body) : this.body);
    }
    
    static json(data, init) {
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

if (typeof Headers === 'undefined') {
  global.Headers = class Headers extends Map {};
}

// Mock fetch
if (!global.fetch) {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      json: () => Promise.resolve({}),
      ok: true,
      status: 200,
    })
  );
}

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
  HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
    fillRect: jest.fn(),
    clearRect: jest.fn(),
    getImageData: jest.fn(),
    putImageData: jest.fn(),
    createImageData: jest.fn(),
    setTransform: jest.fn(),
    drawImage: jest.fn(), // Needed for some Chart.js features
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
  }));
}

// Mock WebSocket hook removed per test refactoring (handled locally in tests)

// Mock NextResponse for API route testing
if (typeof global.NextResponse === 'undefined') {
  global.NextResponse = {
    json: (data, init) => {
      return new Response(JSON.stringify(data), {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...(init?.headers || {}),
        },
      });
    },
  };
}

// Configure TensorFlow.js for Node.js environment
process.env.TFJS_BACKEND = 'cpu';

// Mock WebGL context for TensorFlow.js to avoid warnings
if (typeof global.HTMLCanvasElement !== 'undefined') {
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function(contextType) {
    if (contextType === 'webgl' || contextType === 'webgl2') {
      return {
        getExtension: jest.fn().mockReturnValue(null),
        getParameter: jest.fn().mockReturnValue(null),
        getShaderPrecisionFormat: jest.fn().mockReturnValue({ precision: 0 }),
        isContextLost: jest.fn().mockReturnValue(false),
      };
    }
    return originalGetContext.call(this, contextType);
  };
}

// Mock Performance API
if (!global.performance) {
  global.performance = {
    now: jest.fn(() => Date.now()),
    getEntriesByType: jest.fn(() => []),
    mark: jest.fn(),
    measure: jest.fn(),
  };
} else {
  if (!global.performance.getEntriesByType) {
    global.performance.getEntriesByType = jest.fn(() => []);
  }
}
