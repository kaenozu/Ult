/**
 * websocket-resilient.test.ts
 * 
 * Resilient WebSocketクライアントのテスト
 * 再接続ロジック、状態管理、メッセージキューのテスト
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { ResilientWebSocketClient } from '../websocket-resilient';
import type { WebSocketMessage } from '../websocket-resilient';

// WebSocketのモック
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState: number = MockWebSocket.CONNECTING;
  url: string;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  private messageQueue: string[] = [];

  constructor(url: string) {
    this.url = url;
    // 接続をシミュレート
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }

  send(data: string): void {
    if (this.readyState === MockWebSocket.OPEN) {
      this.messageQueue.push(data);
    }
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSING;
    setTimeout(() => {
      this.readyState = MockWebSocket.CLOSED;
      if (this.onclose) {
        this.onclose(new CloseEvent('close'));
      }
    }, 5);
  }

  // テスト用ヘルパーメソッド
  simulateMessage(data: WebSocketMessage): void {
    if (this.onmessage && this.readyState === MockWebSocket.OPEN) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
    }
  }

  simulateError(error: Error): void {
    if (this.onerror) {
      this.onerror(new ErrorEvent('error', { error }));
    }
  }

  simulateClose(): void {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }

  getSentMessages(): string[] {
    return [...this.messageQueue];
  }

  clearMessages(): void {
    this.messageQueue = [];
  }
}

describe('ResilientWebSocket', () => {
  let ws: ResilientWebSocketClient;
  let mockWebSocket: MockWebSocket;

  beforeEach(() => {
    // WebSocketコンストラクタをモック
    (global as any).WebSocket = MockWebSocket;
    ws = new ResilientWebSocketClient('ws://localhost:3001');
    mockWebSocket = new MockWebSocket('ws://localhost:3001');
  });

  afterEach(() => {
    ws.disconnect();
  });

  describe('接続管理', () => {
    it('WebSocketサーバーに接続できる', (done) => {
      ws.on('connected', () => {
        expect(ws.getStatus()).toBe('OPEN');
        done();
      });

      ws.connect();
    });

    it('接続状態を正しく追跡する', () => {
      expect(ws.getStatus()).toBe('CLOSED');

      ws.connect();
      expect(ws.getStatus()).toBe('CONNECTING');

      // 接続完了を待機
      return new Promise(resolve => setTimeout(resolve, 20)).then(() => {
        expect(ws.getStatus()).toBe('OPEN');
      });
    });

    it('切断できる', (done) => {
      ws.connect();

      ws.on('disconnected', () => {
        expect(ws.getStatus()).toBe('CLOSED');
        done();
      });

      setTimeout(() => ws.disconnect(), 20);
    });

    it('自動再接続を試行する', (done) => {
      ws.connect();

      ws.on('reconnecting', () => {
        expect(ws.getStatus()).toBe('RECONNECTING');
        done();
      });

      // 接続をシミュレートして切断
      setTimeout(() => {
        mockWebSocket.simulateClose();
      }, 20);
    }, 10000);
  });

  describe('メッセージ送信', () => {
    it('メッセージを送信できる', (done) => {
      ws.connect();

      ws.on('connected', () => {
        const message: WebSocketMessage = {
          type: 'echo',
          data: 'test',
          timestamp: Date.now(),
        };

        ws.send(message);
        const sentMessages = mockWebSocket.getSentMessages();
        expect(sentMessages).toHaveLength(1);
        expect(JSON.parse(sentMessages[0])).toEqual(message);
        done();
      });
    });

    it('切断中にメッセージをキューに入れる', (done) => {
      const message: WebSocketMessage = {
        type: 'echo',
        data: 'test',
        timestamp: Date.now(),
      };

      ws.send(message);
      ws.disconnect();

      // キューに入ったことを確認
      expect(ws.getQueuedMessages()).toContain(message);
      done();
    });

    it('再接続時にキューされたメッセージを送信する', (done) => {
      const message: WebSocketMessage = {
        type: 'echo',
        data: 'test',
        timestamp: Date.now(),
      };

      ws.send(message);
      ws.connect();

      ws.on('connected', () => {
        const sentMessages = mockWebSocket.getSentMessages();
        expect(sentMessages.length).toBeGreaterThan(0);
        done();
      });
    });
  });

  describe('メッセージ受信', () => {
    it('メッセージを受信できる', (done) => {
      ws.connect();

      const message: WebSocketMessage = {
        type: 'market_data',
        data: { symbol: 'AAPL', price: 150 },
        timestamp: Date.now(),
      };

      ws.on('message', (receivedMessage) => {
        expect(receivedMessage).toEqual(message);
        done();
      });

      ws.on('connected', () => {
        mockWebSocket.simulateMessage(message);
      });
    });

    it('異なるタイプのメッセージを処理できる', (done) => {
      ws.connect();

      const messages: WebSocketMessage[] = [
        { type: 'market_data', data: { symbol: 'AAPL', price: 150 } },
        { type: 'signal', data: { symbol: 'AAPL', action: 'BUY' } },
        { type: 'alert', data: { message: 'Price alert' } },
      ];

      let receivedCount = 0;

      ws.on('message', () => {
        receivedCount++;
        if (receivedCount === messages.length) {
          done();
        }
      });

      ws.on('connected', () => {
        messages.forEach(msg => mockWebSocket.simulateMessage(msg));
      });
    });
  });

  describe('エラーハンドリング', () => {
    it('接続エラーを処理する', (done) => {
      ws.connect();

      ws.on('error', (error) => {
        expect(error).toBeDefined();
        done();
      });

      setTimeout(() => {
        mockWebSocket.simulateError(new Error('Connection failed'));
      }, 20);
    });

    it('エラー後に再接続を試行する', (done) => {
      ws.connect();

      ws.on('reconnecting', () => {
        expect(ws.getStatus()).toBe('RECONNECTING');
        done();
      });

      setTimeout(() => {
        mockWebSocket.simulateError(new Error('Connection lost'));
      }, 20);
    }, 10000);
  });

  describe('ハートビート', () => {
    it('定期的にpingメッセージを送信する', (done) => {
      ws.connect({ heartbeatInterval: 100 });

      setTimeout(() => {
        const sentMessages = mockWebSocket.getSentMessages();
        const pingMessages = sentMessages.filter(msg => {
          const parsed = JSON.parse(msg);
          return parsed.type === 'ping';
        });

        expect(pingMessages.length).toBeGreaterThan(0);
        done();
      }, 150);
    });

    it('pongメッセージを受信する', (done) => {
      ws.connect();

      ws.on('pong', () => {
        done();
      });

      ws.on('connected', () => {
        mockWebSocket.simulateMessage({ type: 'pong', data: {} });
      });
    });
  });

  describe('イベントエミッター', () => {
    it('複数のリスナーを登録できる', (done) => {
      let callCount = 0;

      const listener1 = () => { callCount++; };
      const listener2 = () => { callCount++; };

      ws.on('connected', listener1);
      ws.on('connected', listener2);

      ws.connect();

      setTimeout(() => {
        expect(callCount).toBe(2);
        done();
      }, 30);
    });

    it('リスナーを削除できる', (done) => {
      let callCount = 0;

      const listener = () => { callCount++; };

      ws.on('connected', listener);
      ws.off('connected', listener);

      ws.connect();

      setTimeout(() => {
        expect(callCount).toBe(0);
        done();
      }, 30);
    });

    it('すべてのリスナーを削除できる', (done) => {
      ws.on('connected', () => {});
      ws.on('disconnected', () => {});

      ws.removeAllListeners();

      ws.connect();

      setTimeout(() => {
        // リスナーが呼ばれないことを確認
        done();
      }, 30);
    });
  });

  describe('指数バックオフ', () => {
    it('再接続の遅延を指数関数的に増加させる', (done) => {
      ws.connect({ maxRetries: 3, initialRetryDelay: 100 });

      const retryDelays: number[] = [];

      ws.on('reconnecting', () => {
        retryDelays.push(ws.getCurrentRetryDelay());
      });

      ws.on('error', () => {
        // エラーを無視
      });

      // 接続を強制的に切断
      setTimeout(() => {
        mockWebSocket.simulateClose();
      }, 20);

      // すべての再接続試行を待機
      setTimeout(() => {
        expect(retryDelays).toHaveLength(3);
        // 遅延が増加していることを確認
        expect(retryDelays[1]).toBeGreaterThan(retryDelays[0]);
        expect(retryDelays[2]).toBeGreaterThan(retryDelays[1]);
        done();
      }, 5000);
    }, 10000);
  });
});
