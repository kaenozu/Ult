import { Alert, AlertNotifier } from './types';
import { logger } from '@/app/core/logger';

class NotificationService implements AlertNotifier {
  async sendPushNotification(alert: Alert): Promise<void> {
    if (typeof window === 'undefined') return;
    
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(alert.title, {
          body: alert.message,
          icon: '/icon.png',
          badge: '/badge.png',
          tag: alert.id,
          requireInteraction: alert.priority === 'CRITICAL',
        });
      } catch (error) {
        logger.error('Push notification failed:', error instanceof Error ? error : new Error(String(error)));
      }
    }
  }

  sendDesktopNotification(alert: Alert): void {
    if (typeof window === 'undefined') return;
    
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      new Notification(alert.title, {
        body: alert.message,
        icon: '/icon.png',
        requireInteraction: alert.priority === 'CRITICAL',
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(alert.title, {
            body: alert.message,
            icon: '/icon.png',
          });
        }
      });
    }
  }
}

export const notificationService = new NotificationService();
export default NotificationService;
