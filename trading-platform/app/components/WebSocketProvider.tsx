'use client';

/**
 * WebSocketProvider.tsx
 *
 * アプリケーション全体でWebSocket接続を管理するためのコンポーネント。
 * マウント時に接続を開始し、アンマウント時に切断します。
 * また、ポートフォリオ内の銘柄を自動的に購読します。
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { webSocketClient } from '@/app/lib/marketDataFeed/WebSocketClient';
import { useTradingStore } from '@/app/store/tradingStore';
import { useUIStore } from '@/app/store/uiStore';

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const positions = useTradingStore(state => state.portfolio.positions);
  const { selectedStock } = useUIStore();

  // シンボルリストをメモ化して変更を検知
  const currentSymbols = useMemo(() => {
    const symbols = new Set<string>();
    positions.forEach(p => symbols.add(p.symbol.toUpperCase()));
    if (selectedStock) symbols.add(selectedStock.symbol.toUpperCase());
    return symbols;
  }, [positions, selectedStock]);

  const prevSymbolsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // 1. サーバーに接続
    console.log('[WebSocketProvider] Initializing connection...');
    webSocketClient.connect();

    return () => {
      // クリーンアップ：切断
      console.log('[WebSocketProvider] Disconnecting...');
      webSocketClient.disconnect();
    };
  }, []); // 初回マウント時のみ実行

  // 3. ポジションや選択銘柄が変更された場合に購読を更新
  useEffect(() => {
    const prevSymbols = prevSymbolsRef.current;
    
    // 新しく追加された銘柄を特定して購読
    const toSubscribe = Array.from(currentSymbols).filter(s => !prevSymbols.has(s));
    if (toSubscribe.length > 0) {
      webSocketClient.subscribe(toSubscribe);
    }
    
    // 削除された銘柄を特定して購読解除
    const toUnsubscribe = Array.from(prevSymbols).filter(s => !currentSymbols.has(s));
    if (toUnsubscribe.length > 0) {
      webSocketClient.unsubscribe(toUnsubscribe);
    }
    
    // 現在の状態を保存
    prevSymbolsRef.current = new Set(currentSymbols);
  }, [currentSymbols]); 

  return <>{children}</>;
};
