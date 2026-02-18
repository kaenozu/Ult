import React from 'react';

export default function AnalysisPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">AI市場分析</h1>
      <p>このページでは、AIによる市場トレンドの包括的な分析を提供します。</p>
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 border rounded shadow">
          <h2 className="font-semibold">センチメント分析</h2>
          <p className="text-sm text-gray-500">ニュースとSNSからの感情分析データ</p>
        </div>
        <div className="p-4 border rounded shadow">
          <h2 className="font-semibold">相関分析</h2>
          <p className="text-sm text-gray-500">銘柄間の相関関係とセクター動向</p>
        </div>
      </div>
    </div>
  );
}
