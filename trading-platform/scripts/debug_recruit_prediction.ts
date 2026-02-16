
import YahooFinance from 'yahoo-finance2';
import { Stock, OHLCV } from '../app/types';
import { mlPredictionService } from '../app/lib/mlPrediction';

async function finalInspect() {
    const symbol = '6098.T';
    const yf = new YahooFinance();

    try {
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        const period1 = startDate.toISOString().split('T')[0];

        const rawResult = await yf.chart(symbol, { period1, interval: '1d' });
        const data: OHLCV[] = rawResult.quotes.map((q: any) => ({
            symbol,
            date: q.date.toISOString().split('T')[0],
            open: q.open,
            high: q.high,
            low: q.low,
            close: q.close,
            volume: q.volume || 0
        }));

        const indicators = mlPredictionService.calculateIndicators(data);

        console.log('\n--- Indicators (Last Value) ---');
        console.log(`RSI: ${indicators.rsi[indicators.rsi.length - 1]}`);
        console.log(`MACD Signal: ${indicators.macd.signal[indicators.macd.signal.length - 1]}`);

        const stock: Stock = {
            symbol: '6098',
            name: 'リクルート',
            market: 'japan',
            sector: 'Service',
            price: data[data.length - 1].close,
            change: 0,
            changePercent: 0,
            volume: data[data.length - 1].volume,
            marketCap: 0
        };

        const prediction = await mlPredictionService.predict(stock, data, indicators);
        console.log('\n--- Prediction ---');
        console.log(prediction);

        const signal = mlPredictionService.generateSignal(stock, data, prediction, { ...indicators, atr: indicators.atr });
        console.log('\n--- Signal ---');
        console.log(`Type: ${signal.type}`);
        console.log(`PredictedChange: ${signal.predictedChange}`);

    } catch (error) {
        console.error('Debug failed:', error);
    }
}

finalInspect();
