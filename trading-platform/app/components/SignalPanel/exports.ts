// Main component
export { SignalPanel } from './SignalPanel';

// Components
export { SignalDisplay } from './components/SignalDisplay';
export { WebSocketManager } from './components/WebSocketManager';
export { SignalFilters } from './components/SignalFilters';
export { SignalDetails } from './components/SignalDetails';

// Hooks
export { useWebSocketManager } from './hooks/useWebSocketManager';
export { useSignalData } from './hooks/useSignalData';
export { useBacktestControls } from './hooks/useBacktestControls';
export { useKellyPositionSizing } from './hooks/useKellyPositionSizing';