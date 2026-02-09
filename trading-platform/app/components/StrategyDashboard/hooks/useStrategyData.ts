/**
 * useStrategyData Hook
 * 
 * 戦略データの管理と選択状態を扱うカスタムフック
 */

import { useState, useMemo, useCallback } from 'react';
import { StrategyPerformance, ViewMode } from '../types';

interface UseStrategyDataReturn {
  /** 選択された戦略名のリスト */
  selectedStrategies: string[];
  /** 現在のビューモード */
  viewMode: ViewMode;
  /** フィルタリングされた戦略リスト */
  filteredStrategies: StrategyPerformance[];
  /** 戦略の選択状態を切り替える */
  toggleStrategy: (name: string) => void;
  /** ビューモードを設定 */
  setViewMode: (mode: ViewMode) => void;
  /** 全ての戦略を選択 */
  selectAll: () => void;
  /** 全ての戦略の選択を解除 */
  deselectAll: () => void;
}

/**
 * 戦略データ管理フック
 * 
 * @param strategies - 全戦略のリスト
 * @returns 戦略データの管理機能
 */
export function useStrategyData(strategies: StrategyPerformance[]): UseStrategyDataReturn {
  const [selectedStrategies, setSelectedStrategies] = useState<string[]>(
    () => strategies.map(s => s.name)
  );
  const [viewMode, setViewMode] = useState<ViewMode>('overview');

  const filteredStrategies = useMemo(() => {
    return strategies.filter(s => selectedStrategies.includes(s.name));
  }, [strategies, selectedStrategies]);

  const toggleStrategy = useCallback((name: string) => {
    setSelectedStrategies(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  }, []);

  const selectAll = useCallback(() => {
    setSelectedStrategies(strategies.map(s => s.name));
  }, [strategies]);

  const deselectAll = useCallback(() => {
    setSelectedStrategies([]);
  }, []);

  return {
    selectedStrategies,
    viewMode,
    filteredStrategies,
    toggleStrategy,
    setViewMode,
    selectAll,
    deselectAll,
  };
}
