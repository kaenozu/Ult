import { useMemo } from 'react';
import { OHLCV, Signal } from '@/app/types';
import { technicalIndicatorService } from '@/app/lib/TechnicalIndicatorService';
import { analyzeStock } from '@/app/lib/analysis';
import {
    GHOST_FORECAST,
    FORECAST_CONE,
    SMA_CONFIG,
    BOLLINGER_BANDS,
    OPTIMIZATION,
} from '@/app/lib/constants';

interface UseChartAnalysisProps {
    data: OHLCV[];
    indexData?: OHLCV[];
    market?: 'japan' | 'usa';
    signal?: Signal | null;
    hoveredIdx: number | null;
    showSMA?: boolean;
    showBollinger?: boolean;
}

export function useChartAnalysis({
    data,
    indexData = [],
    market = 'usa',
    signal = null,
    hoveredIdx,
    showSMA = true,
    showBollinger = false,
}: UseChartAnalysisProps) {

    // 1. Extend data with future dates for forecasting
    const extendedData = useMemo(() => {
        const labels = data.map(d => d.date);
        const prices = data.map(d => d.close);
        if (signal && data.length > 0) {
            const lastDate = new Date(data[data.length - 1].date);
            for (let i = 1; i <= FORECAST_CONE.STEPS; i++) {
                const future = new Date(lastDate);
                future.setDate(lastDate.getDate() + i);
                labels.push(future.toISOString().split('T')[0]);
                prices.push(NaN);
            }
        }
        return { labels, prices };
    }, [data, signal]);

    // 2. Normalize Index Data
    const normalizedIndexData = useMemo(() => {
        if (!indexData || indexData.length < 10 || data.length === 0) return [];

        const stockStartPrice = data[0].close;
        const targetDate = data[0].date;
        const indexStartPoint = indexData.find(d => d.date >= targetDate) || indexData[0];
        const indexStartPrice = indexStartPoint.close;

        const ratio = stockStartPrice / indexStartPrice;

        return extendedData.labels.map(label => {
            const idxPoint = indexData.find(d => d.date === label);
            return idxPoint ? idxPoint.close * ratio : NaN;
        });
    }, [data, indexData, extendedData.labels]);

    // 3. Technical Indicators
    const sma20 = useMemo(() =>
        showSMA ? technicalIndicatorService.calculateSMA(extendedData.prices, SMA_CONFIG.SHORT_PERIOD) : [],
        [extendedData.prices, showSMA]
    );

    const { upper, lower } = useMemo(() =>
        showBollinger
            ? technicalIndicatorService.calculateBollingerBands(extendedData.prices, SMA_CONFIG.SHORT_PERIOD, BOLLINGER_BANDS.STD_DEVIATION)
            : { upper: [], lower: [] },
        [extendedData.prices, showBollinger]
    );

    // 4. Ghost Forecast (Past Prediction Simulation)
    const ghostForecastDatasets = useMemo(() => {
        if (hoveredIdx === null || hoveredIdx >= data.length || data.length < OPTIMIZATION.MIN_DATA_PERIOD) return [];

        // Create a stable slice analysis to avoid frequent re-calculation
        const pastSignal = analyzeStock(data[0].symbol || '', data.slice(0, hoveredIdx + 1), market);
        if (!pastSignal) return [];

        const targetArr = new Array(extendedData.labels.length).fill(NaN);
        const stopArr = new Array(extendedData.labels.length).fill(NaN);
        const currentPrice = data[hoveredIdx].close;
        targetArr[hoveredIdx] = stopArr[hoveredIdx] = currentPrice;

        const stockATR = pastSignal.atr || (currentPrice * GHOST_FORECAST.DEFAULT_ATR_RATIO);
        const confidenceFactor = (110 - pastSignal.confidence) / 100;
        const momentum = pastSignal.predictedChange / 100;

        for (let i = 1; i <= FORECAST_CONE.STEPS; i++) {
            if (hoveredIdx + i < extendedData.labels.length) {
                const timeRatio = i / FORECAST_CONE.STEPS;
                const centerPrice = currentPrice * (1 + (momentum * timeRatio));
                const spread = (stockATR * timeRatio) * confidenceFactor;
                targetArr[hoveredIdx + i] = centerPrice + spread;
                stopArr[hoveredIdx + i] = centerPrice - spread;
            }
        }

        const color = pastSignal.type === 'BUY' ? '34, 197, 94' : pastSignal.type === 'SELL' ? '239, 68, 68' : '100, 116, 139';
        return [
            {
                label: '過去予測(上)',
                data: targetArr,
                borderColor: `rgba(${color}, ${GHOST_FORECAST.TARGET_ALPHA})`,
                backgroundColor: `rgba(${color}, ${GHOST_FORECAST.TARGET_FILL_ALPHA})`,
                borderWidth: 1,
                borderDash: [3, 3],
                pointRadius: 0,
                fill: '+1',
                order: -2
            },
            {
                label: '過去予測(下)',
                data: stopArr,
                borderColor: `rgba(${color}, ${GHOST_FORECAST.STOP_ALPHA})`,
                borderWidth: 1,
                pointRadius: 0,
                fill: false,
                order: -2
            }
        ];
    }, [hoveredIdx, data, market, extendedData.labels.length]);

    // 5. Future Forecast Cone
    const forecastDatasets = useMemo(() => {
        if (!signal || data.length === 0) return [];
        const lastIdx = data.length - 1;
        const currentPrice = data[lastIdx].close;
        const targetArr = new Array(extendedData.labels.length).fill(NaN);
        const stopArr = new Array(extendedData.labels.length).fill(NaN);

        const stockATR = signal.atr || (currentPrice * GHOST_FORECAST.DEFAULT_ATR_RATIO);
        const errorFactor = Math.min(Math.max(signal.predictionError || 1.0, 0.5), 1.5);
        const confidenceUncertainty = 0.4 + ((100 - signal.confidence) / 100) * 0.4;
        const combinedFactor = errorFactor * confidenceUncertainty;

        const momentum = signal.predictedChange ? signal.predictedChange / 100 : 0;
        const confidenceFactor = (110 - signal.confidence) / 100;

        const target = signal.targetPrice;

        // Start points
        targetArr[lastIdx] = stopArr[lastIdx] = currentPrice;

        const steps = FORECAST_CONE.STEPS;
        for (let i = 1; i <= steps; i++) {
            if (lastIdx + i < extendedData.labels.length) {
                const timeRatio = i / steps;
                const centerPrice = currentPrice * (1 + (momentum * timeRatio));
                const spread = (stockATR * timeRatio) * confidenceFactor;
                targetArr[lastIdx + i] = centerPrice + spread;
                stopArr[lastIdx + i] = centerPrice - spread;
            }
        }

        const color = signal.type === 'BUY' ? '16, 185, 129' : signal.type === 'SELL' ? '239, 68, 68' : '146, 173, 201';
        return [
            {
                label: 'ターゲット',
                data: targetArr,
                borderColor: `rgba(${color}, 1)`,
                backgroundColor: `rgba(${color}, 0.3)`,
                borderWidth: 3,
                borderDash: [6, 4],
                pointRadius: 0,
                fill: '+1',
                order: -1
            },
            {
                label: 'リスク',
                data: stopArr,
                borderColor: `rgba(${color}, 0.7)`,
                borderWidth: 3,
                borderDash: [6, 4],
                pointRadius: 0,
                fill: false,
                order: -1
            }
        ];
    }, [signal, data, extendedData]);

    return {
        extendedData,
        normalizedIndexData,
        sma20,
        upperBollinger: upper,
        lowerBollinger: lower,
        ghostForecastDatasets,
        forecastDatasets,
    };
}
