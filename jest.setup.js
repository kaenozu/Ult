require('@testing-library/jest-dom');
const React = require('react');

// Make screen available globally for convenience
global.screen = require('@testing-library/react').screen;

// Mock react-force-graph-3d
jest.mock('react-force-graph-3d', () => {
    return function MockForceGraph3D() {
        return React.createElement('div', { 'data-testid': 'force-graph' }, 'Force Graph 3D');
    };
}, { virtual: true });

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
};

// Mock react-window
jest.mock('react-window', () => ({
    FixedSizeList: () => React.createElement('div', { 'data-testid': 'virt-list' }, 'List'),
}), { virtual: true });
