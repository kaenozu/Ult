/**
 * DeleteConfirmModal Component
 * 
 * Reusable confirmation modal for delete actions.
 * Provides a clear warning UI with cancel and confirm options.
 */

'use client';

export interface DeleteConfirmModalProps {
  symbol: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmModal({ symbol, onConfirm, onCancel }: DeleteConfirmModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-[#141e27] border border-[#233648] rounded-lg p-6 max-w-sm w-full mx-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="text-white font-semibold">銘柄を削除</h3>
            <p className="text-sm text-[#92adc9]">{symbol} をユニバースから削除しますか？</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 bg-[#233648] hover:bg-[#2d4159] text-white text-sm font-medium rounded-lg transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            削除
          </button>
        </div>
      </div>
    </div>
  );
}
