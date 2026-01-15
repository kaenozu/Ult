'use client';

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { ChartDataPoint } from '@/lib/api';

import { useMemo } from 'react';

interface PriceChartProps {
    data: ChartDataPoint[];
    signal?: number; // 1: Buy, -1: Sell, 0: Wait
    targetPrice?: number;
}

export default function PriceChart({ data, signal = 0, targetPrice }: PriceChartProps) {
    // Generate Prediction Data
    // we use "close" for history (solid) and "predicted" for future (dashed).
    const predictionData = useMemo(() => {
        if (!data || data.length === 0) return [];

        // Map original data: "close" is set, "predicted" is null
        const result = data.map(d => ({ ...d, predicted: null }));

        if (signal === 0 || !targetPrice) return result;

        const lastPoint = data[data.length - 1];
        const lastDate = new Date(lastPoint.date);

        // Add connection point: The last history point should start the prediction line
        // We modify the last point in 'result' to have both 'close' and 'predicted'
        result[result.length - 1] = { ...result[result.length - 1], predicted: lastPoint.close };

        // Linear interpolation for 7 days
        for (let i = 1; i <= 7; i++) {
            const nextDate = new Date(lastDate);
            nextDate.setDate(lastDate.getDate() + i);

            // Calculate projected price
            const weight = i / 7;
            const projectedPrice = lastPoint.close + (targetPrice - lastPoint.close) * weight;

            result.push({
                date: nextDate.toISOString().split('T')[0],
                open: projectedPrice,
                high: projectedPrice,
                low: projectedPrice,
                close: null as any, // "close" is null for future points so solid line stops
                predicted: projectedPrice, // "predicted" continues
                volume: 0,
                isPrediction: true
            } as any);
        }
        return result;
    }, [data, signal, targetPrice]);

    return (
        <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={predictionData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(value) => {
                            const date = new Date(value);
                            return `${date.getMonth() + 1}/${date.getDate()}`;
                        }}
                    />
                    <YAxis
                        domain={['auto', 'auto']}
                        tick={{ fontSize: 10 }}
                        tickFormatter={(value) => `¥${value.toLocaleString()}`}
                        width={60}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
                        itemStyle={{ color: '#f3f4f6' }}
                        labelFormatter={(label) => new Date(label).toLocaleDateString('ja-JP')}
                        formatter={(value: number, name: string) => {
                            if (value === null || value === undefined) return [];
                            return [`¥${value.toLocaleString()}`, name === 'predicted' ? 'AI予測 (Target)' : '株価'];
                        }}
                    />
                    {/* Actual Data Line (Solid) */}
                    <Line
                        type="monotone"
                        dataKey="close"
                        stroke="#2563eb"
                        strokeWidth={2}
                        dot={false}
                        connectNulls={false} // Don't connect over future nulls
                    />
                    {/* Prediction Line (Dashed) */}
                    <Line
                        type="monotone"
                        dataKey="predicted"
                        stroke={signal === 1 ? "#10b981" : signal === -1 ? "#ef4444" : "#6b7280"}
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                        connectNulls={true} // vital for connection
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

