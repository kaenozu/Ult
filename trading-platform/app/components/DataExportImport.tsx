/**
 * DataExportImport.tsx
 * 
 * データのバックアップ・リストア機能
 */

'use client';

import React, { useState, useRef } from 'react';
import { useTradeHistory } from '@/app/lib/hooks/useTradeHistory';

export function DataExportImport() {
  const { exportData, importData, clearAllData } = useTradeHistory();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showClearModal, setShowClearModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setMessage(null);
      setError(null);

      const data = await exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `trading-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage('データをエクスポートしました');
    } catch {
      setError('エクスポートに失敗しました');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset the input value so the same file can be selected again if needed
    event.target.value = '';

    try {
      setIsImporting(true);
      setMessage(null);
      setError(null);

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          await importData(content);
          setMessage('データをインポートしました');
        } catch {
          setError('インポートに失敗しました。ファイル形式を確認してください');
        } finally {
          setIsImporting(false);
        }
      };
      reader.readAsText(file);
    } catch {
      setError('ファイルの読み込みに失敗しました');
      setIsImporting(false);
    }
  };

  const handleClear = async () => {
    setShowClearModal(true);
  };

  const confirmClear = async () => {
    try {
      await clearAllData();
      setMessage('全てのデータを削除しました');
    } catch {
      setError('データの削除に失敗しました');
    } finally {
      setShowClearModal(false);
    }
  };

  return (
    <div className="bg-[#101822] rounded-xl border border-[#1a3a5c] p-6">
      <h3 className="text-sm font-bold text-white mb-4">データ管理</h3>

      {message && (
        <div role="status" className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg animate-fade-in">
          <p className="text-sm text-green-400">{message}</p>
        </div>
      )}

      {error && (
        <div role="alert" className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg animate-fade-in">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {/* エクスポート */}
        <div>
          <button
            onClick={handleExport}
            disabled={isExporting}
            aria-busy={isExporting}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 
                       text-white rounded-lg text-sm font-bold transition-colors
                       flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 focus-visible:outline-none"
          >
            {isExporting ? (
              <>
                <span className="animate-spin">⟳</span>
                エクスポート中...
              </>
            ) : (
              <>
                📥 データをエクスポート（バックアップ）
              </>
            )}
          </button>
          <p className="mt-1 text-xs text-[#5f7a99]">
            取引履歴・ポジション・パフォーマンスデータをJSON形式で保存
          </p>
        </div>

        {/* インポート */}
        <div>
          <input
            type="file"
            accept=".json"
            onChange={handleImport}
            disabled={isImporting}
            className="hidden"
            ref={fileInputRef}
            aria-hidden="true"
            tabIndex={-1}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            aria-busy={isImporting}
            className="w-full px-4 py-3 bg-[#1a3a5c] hover:bg-[#234b73] disabled:bg-[#1a3a5c]/50 disabled:text-white/50
                       text-white rounded-lg text-sm font-bold transition-colors
                       cursor-pointer text-center flex items-center justify-center gap-2
                       focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 focus-visible:outline-none"
          >
            {isImporting ? (
              <>
                <span className="animate-spin">⟳</span>
                インポート中...
              </>
            ) : (
              '📤 データをインポート（リストア）'
            )}
          </button>
          <p className="mt-1 text-xs text-[#5f7a99]">
            以前にエクスポートしたJSONファイルを読み込む
          </p>
        </div>

        {/* 区切り線 */}
        <div className="border-t border-[#1a3a5c] pt-4">
          <button
            onClick={handleClear}
            className="w-full px-4 py-3 bg-red-600/20 hover:bg-red-600/30 
                       border border-red-500/50 text-red-400 rounded-lg 
                       text-sm font-bold transition-colors
                       focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500 focus-visible:outline-none"
          >
            🗑️ 全てのデータを削除
          </button>
          <p className="mt-1 text-xs text-[#5f7a99]">
            取引履歴・ポジション・パフォーマンスを全て削除（注意！）
          </p>
        </div>
      </div>

      {/* Clear Confirmation Modal */}
      {showClearModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowClearModal(false)}>
          <div className="bg-[#101822] p-6 rounded-xl border border-[#1a3a5c] shadow-xl max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">データ削除の確認</h3>
            <p className="text-[#5f7a99] mb-6">
              全てのデータを削除しますか？この操作は元に戻せません。
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowClearModal(false)}
                className="px-4 py-2 rounded-lg bg-[#1a3a5c] text-white hover:bg-[#234b73] transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={confirmClear}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors"
              >
                削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
