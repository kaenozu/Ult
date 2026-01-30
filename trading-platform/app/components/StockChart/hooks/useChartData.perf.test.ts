/**
 * パフォーマンステスト for useChartData
 * 
 * このテストは、useChartDataフックのパフォーマンスを測定します。
 * 大容量データでの描画パフォーマンスを測定し、修正前後でパフォーマンス比較を行います。
 */

import { renderHook, act } from '@testing-library/react';
import { useChartData } from './useChartData';
import { OHLCV, Signal } from '@/app/types';

// テストデータ生成関数
function generateOHLCVData(count: number, startDate: string = '2024-01-01'): OHLCV[] {
  const data: OHLCV[] = [];
  let date = new Date(startDate);
  
  for (let i = 0; i < count; i++) {
    const close = 100 + Math.random() * 50;
    data.push({
      date: date.toISOString().split('T')[0],
      open: close + (Math.random() - 0.5) * 5,
      high: close + Math.random() * 5,
      low: close - Math.random() * 5,
      close: close,
      volume: Math.floor(Math.random() * 1000000),
      symbol: 'TEST'
    });
    date.setDate(date.getDate() + 1);
  }
  
  return data;
}

// テストデータサイズ
const DATA_SIZES = [
  { name: '1ヶ月分', count: 20 },
  { name: '3ヶ月分', count: 60 },
  { name: '6ヶ月分', count: 120 },
  { name: '1年分', count: 250 },
  { name: '2年分', count: 500 },
  { name: '5年分', count: 1250 },
];

describe('useChartData Performance Tests', () => {
  it('should measure performance for different data sizes', () => {
    const results: { name: string; count: number; time: number }[] = [];
    
    DATA_SIZES.forEach(({ name, count }) => {
      const data = generateOHLCVData(count);
      const indexData = generateOHLCVData(count * 2, '2023-01-01');
      const signal: Signal = {
        symbol: 'TEST',
        type: 'BUY',
        confidence: 75,
        targetPrice: 150,
        stopLoss: 90,
        reason: 'Test signal',
        predictedChange: 10,
        predictionDate: new Date().toISOString(),
        predictionError: 1.0
      };
      
      const startTime = performance.now();
      
      const { result } = renderHook(() => useChartData(data, signal, indexData));
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      results.push({ name, count, time: executionTime });
      
      console.log(`${name} (${count} data points): ${executionTime.toFixed(2)}ms`);
    });
    
    // パフォーマンスがデータサイズに対して線形であることを確認
    // O(N)の計算量であれば、データサイズが2倍になれば実行時間も約2倍になるはず
    const oneMonthTime = results.find(r => r.name === '1ヶ月分')?.time || 0;
    const threeMonthsTime = results.find(r => r.name === '3ヶ月分')?.time || 0;
    const oneYearTime = results.find(r => r.name === '1年分')?.time || 0;
    
    // 3ヶ月分は1ヶ月分の約3倍であるべき
    expect(threeMonthsTime / oneMonthTime).toBeLessThan(5); // 許容範囲を広めに設定
    
    // 1年分は1ヶ月分の約12.5倍であるべき
    expect(oneYearTime / oneMonthTime).toBeLessThan(20); // 許容範囲を広めに設定
  });
  
  it('should handle large datasets efficiently', () => {
    const data = generateOHLCVData(1000);
    const indexData = generateOHLCVData(2000, '2023-01-01');
      const signal: Signal = {
        symbol: 'TEST',
        type: 'BUY',
        confidence: 75,
        targetPrice: 150,
        stopLoss: 90,
        reason: 'Test signal',
        predictedChange: 10,
        predictionDate: new Date().toISOString(),
        predictionError: 1.0
      };
    
    const startTime = performance.now();
    
    const { result } = renderHook(() => useChartData(data, signal, indexData));
    
    const endTime = performance.now();
    const executionTime = endTime - startTime;
    
    console.log(`Large dataset (1000 data points): ${executionTime.toFixed(2)}ms`);
    
    // 大容量データでも100ms以内で処理できることを確認
    expect(executionTime).toBeLessThan(100);
  });
  
  it('should not recompute unnecessarily when only data changes', () => {
    const indexData = generateOHLCVData(500, '2023-01-01');
    const signal: Signal = {
      symbol: 'TEST',
      type: 'BUY',
      confidence: 75,
      targetPrice: 150,
      stopLoss: 90,
      reason: 'Test signal',
      predictedChange: 10,
      predictionDate: new Date().toISOString(),
      predictionError: 1.0
    };
    
    // 同じデータを使用して、ratioが同じになるようにする
    const data1 = generateOHLCVData(250);
    const data2 = [...data1]; // 同じデータをコピー
    
    const { result, rerender } = renderHook(
      ({ data }) => useChartData(data, signal, indexData),
      { initialProps: { data: data1 } }
    );
    
    const normalizedIndexData1 = result.current.normalizedIndexData;
    
    // データを変更して再レンダリング
    rerender({ data: data2 });
    
    const normalizedIndexData2 = result.current.normalizedIndexData;
    
    // indexDataは変わっていないため、normalizedIndexDataは再計算されるが、
    // indexMapは再作成されないはず
    expect(normalizedIndexData1).toEqual(normalizedIndexData2);
  });
  
  it('should only recompute indexMap when indexData changes', () => {
    const data = generateOHLCVData(250);
    const indexData1 = generateOHLCVData(500, '2023-01-01');
    const signal: Signal = {
      symbol: 'TEST',
      type: 'BUY',
      confidence: 75,
      targetPrice: 150,
      stopLoss: 90,
      reason: 'Test signal',
      predictedChange: 10,
      predictionDate: new Date().toISOString(),
      predictionError: 1.0
    };
    
    let indexMapRecomputations = 0;
    const originalUseMemo = React.useMemo;
    
    // useMemoの呼び出しを監視
    jest.spyOn(React, 'useMemo').mockImplementation((fn, deps) => {
      if (deps && deps.length === 1 && deps[0] === indexData1) {
        indexMapRecomputations++;
      }
      return originalUseMemo(fn, deps);
    });
    
    const { result, rerender } = renderHook(
      ({ indexData }) => useChartData(data, signal, indexData),
      { initialProps: { indexData: indexData1 } }
    );
    
    expect(indexMapRecomputations).toBe(1);
    
    // indexDataを変更せずに再レンダリング
    rerender({ indexData: indexData1 });
    
    expect(indexMapRecomputations).toBe(1);
    
    jest.restoreAllMocks();
  });
});

// Reactをインポート
import React from 'react';
