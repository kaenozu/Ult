import { useState } from 'react';

interface Notification {
  id?: number;
  type?: string;
  title?: string;
  message?: string;
  priority?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

// useNotificationManager hook
export const useNotificationManager = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (notification: Notification) => {
    setNotifications(prev => [...prev, { ...notification, id: Date.now() }]);
  };

  const removeNotification = (id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const showTradeAlert = (title?: string, message?: string, type?: string) => {
    addNotification({
      type: 'trade',
      title: title || 'Trade Alert',
      message: message || 'Trade notification',
      priority: 'high',
    });
  };

  const showPriceAlert = (title?: string, message?: string, type?: string) => {
    addNotification({
      type: 'price',
      title: title || 'Price Alert',
      message: message || 'Price notification',
      priority: 'medium',
    });
  };

  const showPortfolioAlert = (
    title?: string,
    message?: string,
    type?: string
  ) => {
    addNotification({
      type: 'portfolio',
      title: title || 'Portfolio Alert',
      message: message || 'Portfolio notification',
      priority: 'medium',
    });
  };

  const showSystemAlert = (title?: string, message?: string, type?: string) => {
    addNotification({
      type: 'system',
      title: title || 'System Alert',
      message: message || 'System notification',
      priority: 'high',
    });
  };

  return {
    notifications,
    addNotification,
    removeNotification,
    showTradeAlert,
    showPriceAlert,
    showPortfolioAlert,
    showSystemAlert,
  };
};
