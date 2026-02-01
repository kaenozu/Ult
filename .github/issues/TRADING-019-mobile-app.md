---
title: モバイルアプリ開発（iOS/Android）
labels: enhancement, mobile, priority:medium
---

## 説明

### 問題
現在のシステムはWebベースのみで、ネイティブモバイルアプリがありません。これにより、ユーザーのモバイルでの取引体験が制限され、プッシュ通知やオフライン機能などのモバイル特有の機能が利用できません。

### 影響
- モバイルユーザー体験の低下
- リアルタイムアラートの受信が困難
- モバイル特化のUI/UXがない
- オフライン時の機能制限

### 推奨される解決策

#### 1. クロスプラットフォームモバイルアプリ（React Native）
```typescript
// mobile/src/App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider } from 'react-redux';
import { store } from './store';

import DashboardScreen from './screens/DashboardScreen';
import PortfolioScreen from './screens/PortfolioScreen';
import TradingScreen from './screens/TradingScreen';
import AlertsScreen from './screens/AlertsScreen';
import SettingsScreen from './screens/SettingsScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <Provider store={store}>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              // アイコン設定
            },
            tabBarActiveTintColor: '#007AFF',
            tabBarInactiveTintColor: 'gray',
          })}
        >
          <Tab.Screen name="Dashboard" component={DashboardScreen} />
          <Tab.Screen name="Portfolio" component={PortfolioScreen} />
          <Tab.Screen name="Trade" component={TradingScreen} />
          <Tab.Screen name="Alerts" component={AlertsScreen} />
          <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </Provider>
  );
}
```

#### 2. リアルタイムデータ同期
```typescript
// mobile/src/services/websocketService.ts
import { io, Socket } from 'socket.io-client';
import { store } from '../store';
import { updatePrice, updateOrderBook } from '../store/marketSlice';

class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect() {
    this.socket = io('wss://api.trading-platform.com', {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    });

    this.socket.on('price_update', (data) => {
      store.dispatch(updatePrice(data));
    });

    this.socket.on('order_book', (data) => {
      store.dispatch(updateOrderBook(data));
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  subscribeToSymbol(symbol: string) {
    if (this.socket) {
      this.socket.emit('subscribe', { symbol });
    }
  }

  unsubscribeFromSymbol(symbol: string) {
    if (this.socket) {
      this.socket.emit('unsubscribe', { symbol });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

export const websocketService = new WebSocketService();
```

#### 3. プッシュ通知システム
```typescript
// mobile/src/services/notificationService.ts
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { store } from '../store';
import { addNotification } from '../store/notificationSlice';

class NotificationService {
  async initialize() {
    // FCMトークンを取得
    const fcmToken = await messaging().getToken();
    console.log('FCM Token:', fcmToken);
    
    // サーバーにトークンを送信
    await this.registerTokenWithServer(fcmToken);

    // フォアグラウンドメッセージハンドラー
    messaging().onMessage(async remoteMessage => {
      console.log('Foreground message:', remoteMessage);
      await this.displayLocalNotification(remoteMessage);
      store.dispatch(addNotification(remoteMessage.data));
    });

    // バックグラウンドメッセージハンドラー
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      console.log('Background message:', remoteMessage);
      await this.displayLocalNotification(remoteMessage);
    });

    // 通知チャンネルを作成
    await this.createNotificationChannels();
  }

  async createNotificationChannels() {
    await notifee.createChannel({
      id: 'price_alerts',
      name: 'Price Alerts',
      importance: AndroidImportance.HIGH,
    });

    await notifee.createChannel({
      id: 'order_updates',
      name: 'Order Updates',
      importance: AndroidImportance.DEFAULT,
    });

    await notifee.createChannel({
      id: 'system_notifications',
      name: 'System Notifications',
      importance: AndroidImportance.LOW,
    });
  }

  async displayLocalNotification(remoteMessage: any) {
    const { notification, data } = remoteMessage;
    
    await notifee.displayNotification({
      title: notification?.title || 'Trading Alert',
      body: notification?.body || '',
      android: {
        channelId: data?.channelId || 'system_notifications',
        importance: AndroidImportance.HIGH,
        pressAction: {
          id: 'default',
        },
      },
      data: data,
    });
  }

  async registerTokenWithServer(token: string) {
    // APIを呼び出してトークンを登録
    // TODO: 実装
  }
}

export const notificationService = new NotificationService();
```

#### 4. オフライン機能
```typescript
// mobile/src/store/offlineMiddleware.ts
import { Middleware } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

interface QueuedAction {
  id: string;
  action: any;
  timestamp: number;
  retryCount: number;
}

const OFFLINE_QUEUE_KEY = '@offline_queue';
const MAX_RETRY_COUNT = 3;

export const offlineMiddleware: Middleware = (store) => (next) => async (action) => {
  const netInfo = await NetInfo.fetch();
  
  if (netInfo.isConnected) {
    // オンライン: キューに溜まったアクションを処理
    await processOfflineQueue(store);
    return next(action);
  } else {
    // オフライン: アクションをキューに追加
    if (isActionQueueable(action)) {
      await queueAction(action);
      store.dispatch(showOfflineNotification(action));
      return;
    }
    return next(action);
  }
};

async function queueAction(action: any) {
  const queue = await getOfflineQueue();
  queue.push({
    id: generateId(),
    action,
    timestamp: Date.now(),
    retryCount: 0,
  });
  await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

async function processOfflineQueue(store: any) {
  const queue = await getOfflineQueue();
  
  for (const queuedAction of queue) {
    try {
      await store.dispatch(queuedAction.action);
    } catch (error) {
      queuedAction.retryCount++;
      
      if (queuedAction.retryCount >= MAX_RETRY_COUNT) {
        store.dispatch(showActionFailedNotification(queuedAction));
      } else {
        // 再試行キューに戻す
        await queueAction(queuedAction.action);
      }
    }
  }
  
  // キューをクリア
  await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
}

function isActionQueueable(action: any): boolean {
  // キュー可能なアクションタイプを定義
  const queueableTypes = [
    'orders/placeOrder',
    'orders/cancelOrder',
    'alerts/createAlert',
  ];
  return queueableTypes.includes(action.type);
}
```

### 実装タスク
- [ ] React Nativeプロジェクトのセットアップ
- [ ] ナビゲーション構造の実装
- [ ] 認証・認可フローの実装
- [ ] リアルタイムデータ同期の実装
- [ ] 取引機能の実装
- [ ] プッシュ通知システムの実装
- [ ] オフライン機能の実装
- [ ] バイオメトリック認証の実装
- [ ] パフォーマンス最適化
- [ ] ユニットテストの作成
- [ ] E2Eテストの作成
- [ ] ドキュメントの作成

### 関連ファイル
- `mobile/` (新規ディレクトリ)
- `mobile/src/App.tsx` (新規ファイル)
- `mobile/src/services/websocketService.ts` (新規ファイル)
- `mobile/src/services/notificationService.ts` (新規ファイル)
- `mobile/src/store/` (新規ディレクトリ)
- `mobile/src/screens/` (新規ディレクトリ)

### 優先度
中 - モバイルユーザー体験向上に重要

### 複雑度
高

### 見積もり時間
6-8週間
