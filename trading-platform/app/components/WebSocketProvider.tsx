'use client';

/**
 * WebSocketProvider.tsx
 *
 * アプリケーション全体でWebSocket接続を管理するためのコンポーネント。
 * マウント時に接続を開始し、アンマウント時に切断します。
 * また、ポートフォリオ内の銘柄を自動的に購読します。
 */

import React, { useEffect } from 'react';
import { webSocketClient } from '@/app/lib/marketDataFeed/WebSocketClient';
import { useTradingStore } from '@/app/store/tradingStore';
import { useUIStore } from '@/app/store/uiStore';

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const positions = useTradingStore(state => state.portfolio.positions);
  const selectedStock = useUIStore(state => state.selectedStock);

  useEffect(() => {
    // 1. サーバーに接続
    console.log('[WebSocketProvider] Initializing connection...');
    webSocketClient.connect();

    // 2. 初期状態で持っているポジションのシンボルを購読
    const initialSymbols = new Set<string>();
    positions.forEach(p => initialSymbols.add(p.symbol));
    if (selectedStock) initialSymbols.add(selectedStock.symbol);

    if (initialSymbols.size > 0) {
      webSocketClient.subscribe(Array.from(initialSymbols));
    }

    return () => {
      // クリーンアップ：切断
      console.log('[WebSocketProvider] Disconnecting...');
      webSocketClient.disconnect();
    };
  }, []); // 初回マウント時のみ実行

  // 3. ポジションや選択銘柄が変更された場合に購読を更新
  useEffect(() => {
    const currentSymbols = new Set<string>();
    positions.forEach(p => currentSymbols.add(p.symbol));
    if (selectedStock) currentSymbols.add(selectedStock.symbol);

    if (currentSymbols.size > 0) {
      webSocketClient.subscribe(Array.from(currentSymbols));
    }
  }, [positions.length, selectedStock?.symbol]); 

  return <>{children}</>;
};
