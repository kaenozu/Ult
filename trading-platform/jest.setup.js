import '@testing-library/jest-dom'

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

// Mock IndexedDB
const mockIDB = {
  open: jest.fn().mockReturnValue({
    onupgradeneeded: null,
    onsuccess: null,
    onerror: null,
  }),
  deleteDatabase: jest.fn(),
};

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'indexedDB', {
    value: mockIDB,
  });
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock ScrollTo
if (typeof window !== 'undefined') {
  window.scrollTo = jest.fn();
}

// Mock Canvas (needed for Chart.js)
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = jest.fn();
}
