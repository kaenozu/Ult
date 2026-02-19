/**
 * メモリ使用状況監視ユーティリティ
 * 
 * パフォーマンス最適化のためのメモリ監視とリーク検出
 */


interface MemorySnapshot {
  timestamp: number;
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface MemoryLeakWarning {
  type: 'GRADUAL_INCREASE' | 'SUDDEN_SPIKE' | 'LIMIT_APPROACHING';
  message: string;
  severity: 'low' | 'medium' | 'high';
  currentUsage: number;
  trend: 'increasing' | 'stable' | 'decreasing';
}

class MemoryMonitor {
  private snapshots: MemorySnapshot[] = [];
  private readonly maxSnapshots = 50;
  private checkInterval: NodeJS.Timeout | null = null;
  private warningCallbacks: Array<(warning: MemoryLeakWarning) => void> = [];
  
  // 閾値設定
  private readonly THRESHOLDS = {
    GRADUAL_INCREASE_MB: 50,    // 50MB以上の増加を検出
    SUDDEN_SPIKE_MB: 100,       // 100MB以上の急激な増加
    LIMIT_APPROACHING_PERCENT: 0.8, // 上限の80%で警告
    CHECK_INTERVAL_MS: 30000,   // 30秒ごとにチェック
  };

  /**
   * メモリスナップショットを取得
   */
  private getMemorySnapshot(): MemorySnapshot | null {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        timestamp: Date.now(),
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
      };
    }
    return null;
  }

  /**
   * メモリ監視を開始
   */
  start(): void {
    if (this.checkInterval) return;
    
    this.checkInterval = setInterval(() => {
      this.checkMemory();
    }, this.THRESHOLDS.CHECK_INTERVAL_MS);
  }

  /**
   * メモリ監視を停止
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * メモリチェック実行
   */
  private checkMemory(): void {
    const snapshot = this.getMemorySnapshot();
    if (!snapshot) return;

    // スナップショットを保存（上限を超えたら古いものを削除）
    this.snapshots.push(snapshot);
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots.shift();
    }

    // リーク検出
    this.detectMemoryLeak();
  }

  /**
   * メモリリークを検出
   */
  private detectMemoryLeak(): void {
    if (this.snapshots.length < 2) return;

    const current = this.snapshots[this.snapshots.length - 1];
    const previous = this.snapshots[this.snapshots.length - 2];
    const first = this.snapshots[0];

    const currentMB = current.usedJSHeapSize / 1024 / 1024;
    const previousMB = previous.usedJSHeapSize / 1024 / 1024;
    const firstMB = first.usedJSHeapSize / 1024 / 1024;
    const limitMB = current.jsHeapSizeLimit / 1024 / 1024;

    // 1. 上限への接近チェック
    if (currentMB > limitMB * this.THRESHOLDS.LIMIT_APPROACHING_PERCENT) {
      this.emitWarning({
        type: 'LIMIT_APPROACHING',
        message: `メモリ上限に接近中: ${currentMB.toFixed(1)}MB / ${limitMB.toFixed(1)}MB`,
        severity: 'high',
        currentUsage: currentMB,
        trend: 'increasing',
      });
      return;
    }

    // 2. 急激な増加チェック
    const increaseMB = currentMB - previousMB;
    if (increaseMB > this.THRESHOLDS.SUDDEN_SPIKE_MB) {
      this.emitWarning({
        type: 'SUDDEN_SPIKE',
        message: `メモリ使用量が急激に増加: +${increaseMB.toFixed(1)}MB`,
        severity: 'high',
        currentUsage: currentMB,
        trend: 'increasing',
      });
      return;
    }

    // 3. 徐々な増加チェック（最初からの変化）
    const totalIncreaseMB = currentMB - firstMB;
    const timeSpanMinutes = (current.timestamp - first.timestamp) / 1000 / 60;
    
    if (timeSpanMinutes > 5 && totalIncreaseMB > this.THRESHOLDS.GRADUAL_INCREASE_MB) {
      this.emitWarning({
        type: 'GRADUAL_INCREASE',
        message: `メモリ使用量が徐々に増加: +${totalIncreaseMB.toFixed(1)}MB (${timeSpanMinutes.toFixed(0)}分間)`,
        severity: 'medium',
        currentUsage: currentMB,
        trend: 'increasing',
      });
    }
  }

  /**
   * 警告を発行
   */
  private emitWarning(warning: MemoryLeakWarning): void {
    this.warningCallbacks.forEach(callback => callback(warning));
    
    // 開発環境ではコンソールにも出力
    if (process.env.NODE_ENV === 'development') {
      devWarn('[MemoryMonitor]', warning);
    }
  }

  /**
   * 警告コールバックを登録
   */
  onWarning(callback: (warning: MemoryLeakWarning) => void): () => void {
    this.warningCallbacks.push(callback);
    return () => {
      const index = this.warningCallbacks.indexOf(callback);
      if (index > -1) {
        this.warningCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * 現在のメモリ使用状況を取得
   */
  getCurrentMemoryUsage(): { used: number; total: number; limit: number } | null {
    const snapshot = this.getMemorySnapshot();
    if (!snapshot) return null;

    return {
      used: snapshot.usedJSHeapSize,
      total: snapshot.totalJSHeapSize,
      limit: snapshot.jsHeapSizeLimit,
    };
  }

  /**
   * メモリ使用履歴を取得
   */
  getMemoryHistory(): MemorySnapshot[] {
    return [...this.snapshots];
  }

  /**
   * 手動でガベージコレクションを促す（開発時のみ）
   */
  suggestGarbageCollection(): void {
    if ('gc' in window && process.env.NODE_ENV === 'development') {
      (window as any).gc();
      devLog('[MemoryMonitor] Garbage collection suggested');
    }
  }

  /**
   * 大きなオブジェクトがメモリに与える影響を推定
   */
  estimateObjectSize(obj: any): number {
    const str = JSON.stringify(obj);
    // UTF-8では1文字あたり1-4バイト、平均2バイトと仮定
    return str.length * 2;
  }
}

// シングルトンインスタンス
export const memoryMonitor = new MemoryMonitor();

/**
 * React hook for memory monitoring
 */
export function useMemoryMonitor(
  onWarning?: (warning: MemoryLeakWarning) => void
) {
  React.useEffect(() => {
    if (onWarning) {
      return memoryMonitor.onWarning(onWarning);
    }
  }, [onWarning]);

  return {
    getCurrentUsage: () => memoryMonitor.getCurrentMemoryUsage(),
    getHistory: () => memoryMonitor.getMemoryHistory(),
    suggestGC: () => memoryMonitor.suggestGarbageCollection(),
  };
}

/**
 * コンポーネントマウント時のメモリスナップショットを取得
 */
export function useMemorySnapshot(componentName: string) {
  React.useEffect(() => {
    const before = memoryMonitor.getCurrentMemoryUsage();
    
    return () => {
      const after = memoryMonitor.getCurrentMemoryUsage();
      if (before && after) {
        const diff = (after.used - before.used) / 1024 / 1024;
        if (diff > 10) {
          devWarn(
            `[MemorySnapshot] ${componentName} が ${diff.toFixed(1)}MB のメモリを使用`
          );
        }
      }
    };
  }, [componentName]);
}

// Reactインポート
import React from 'react';
import { devLog, devWarn } from '@/app/lib/utils/dev-logger';
