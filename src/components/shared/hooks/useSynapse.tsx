// Mock hooks for missing dependencies
import { useState, useEffect, useCallback } from 'react';

// Mock WebSocket hook
export function useWebSocket(channel: string) {
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  const sendMessage = useCallback((message: any) => {
    console.log('Mock WebSocket send:', message);
  }, []);

  useEffect(() => {
    setConnectionStatus('connected');
  }, [channel]);

  return {
    lastMessage,
    connectionStatus,
    sendMessage,
  };
}

// Mock Synapse hook
export function useSynapse(channel: string) {
  return useWebSocket(channel);
}

// Mock approval hooks
export function useApprovalRequests() {
  const [activeRequests, setActiveRequests] = useState<any[]>([]);

  const removeRequest = useCallback((id: string) => {
    setActiveRequests(prev => prev.filter(req => req.id !== id));
  }, []);

  return { activeRequests, removeRequest };
}

// Mock notification manager
export function useNotificationManager() {
  const [notifications, setNotifications] = useState<any[]>([]);

  const addNotification = useCallback((notification: any) => {
    setNotifications(prev => [
      ...prev,
      { ...notification, id: Date.now().toString() },
    ]);
  }, []);

  return { notifications, addNotification };
}

// Mock regime stream hook
export function useRegimeStream() {
  const [regime, setRegime] = useState<any>(null);

  useEffect(() => {
    // Mock regime data
    setRegime({ type: 'bullish', confidence: 0.75 });
  }, []);

  return regime;
}

// Mock price alerts hook
export function usePriceAlerts() {
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    // Mock alerts
    setAlerts([{ id: '1', symbol: 'AAPL', price: 150, type: 'above' }]);
  }, []);

  return alerts;
}

// Mock position row hook
export function usePositionRow() {
  return {
    isEditing: false,
    setIsEditing: () => {},
    savePosition: () => {},
    cancelEdit: () => {},
  };
}
