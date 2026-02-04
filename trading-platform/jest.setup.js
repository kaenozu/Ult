
// jest.setup.js
import '@testing-library/jest-dom';

// Remove manual Request/Response polyfills as Node 20 / Next 14+ provides them.
// If specific mocks are needed, they should be done per test or using standard libraries.

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock TextEncoder/TextDecoder if missing (though usually present in newer Node)
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock performance.getEntriesByType for layout tests
if (!global.performance.getEntriesByType) {
    global.performance.getEntriesByType = jest.fn().mockReturnValue([]);
}

// Suppress specific console errors/warnings during tests if necessary
// const originalError = console.error;
// console.error = (...args) => {
//   if (/Warning.*not wrapped in act/.test(args[0])) {
//     return;
//   }
//   originalError.call(console, ...args);
// };
