/**
 * DataExportImport.tsx
 * 
 * データのバックアップ・リストア機能
 */

'use client';

import React, { useState } from 'react';
import { useTradeHistory } from '@/app/lib/hooks/useTradeHistory';

export function DataExportImport() {
  const { exportData, importData, clearAllData } = useTradeHistory();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err) {
      setError('エクスポートに失敗しました');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

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
        } catch (err) {
          setError('インポートに失敗しました。ファイル形式を確認してください');
        } finally {
          setIsImporting(false);
        }
      };
      reader.readAsText(file);
    } catch (err) {
      setError('ファイルの読み込みに失敗しました');
      setIsImporting(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('全てのデータを削除しますか？この操作は元に戻せません。')) {
      return;
    }

    try {
      await clearAllData();
      setMessage('全てのデータを削除しました');
    } catch (err) {
      setError('データの削除に失敗しました');
    }
  };

  return (
    <div className="bg-[#101822] rounded-xl border border-[#1a3a5c] p-6">
      <h3 className="text-sm font-bold text-white mb-4">データ管理</h3>

      {message && (
        <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg">
          <p className="text-sm text-green-400">{message}</p>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {/* エクスポート */}
        <div>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 
                       text-white rounded-lg text-sm font-bold transition-colors
                       flex items-center justify-center gap-2"
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
          <label className="block w-full px-4 py-3 bg-[#1a3a5c] hover:bg-[#234b73] 
                          text-white rounded-lg text-sm font-bold transition-colors
                          cursor-pointer text-center">
            {isImporting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⟳</span>
                インポート中...
              </span>
            ) : (
              '📤 データをインポート（リストア）'
            )}
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              disabled={isImporting}
              className="hidden"
            />
          </label>
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
                       text-sm font-bold transition-colors"
          >
            🗑️ 全てのデータを削除
          </button>
          <p className="mt-1 text-xs text-[#5f7a99]">
            取引履歴・ポジション・パフォーマンスを全て削除（注意！）
          </p>
        </div>
      </div>
    </div>
  );
}
