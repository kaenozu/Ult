
import { mlPredictionService } from '../app/lib/mlPrediction';
import { OHLCV, Stock } from '../app/types';

async function debug() {
    const mockData: OHLCV[] = [];
    const basePrice = 5000;
    // Create a slight uptrend
    for (let i = 0; i < 100; i++) {
        const price = basePrice + i * 5;
        mockData.push({
            date: new Date(2024, 0, i + 1).toISOString().split('T')[0],
            open: price - 2,
            high: price + 10,
            low: price - 10,
            close: price,
            volume: 1000000 + (Math.random() * 500000)
        });
    }

    const mockStock: Stock = {
        symbol: '6098.T',
        name: 'Recruit',
        market: 'japan',
        sector: 'Service'
    };

    const indicators = mlPredictionService.calculateIndicators(mockData) as any;
    const prediction = mlPredictionService.predict(mockStock, mockData, indicators);
    const signal = mlPredictionService.generateSignal(mockStock, mockData, prediction, indicators, []);

    console.log('--- Prediction Result ---');
    console.log('Symbol:', signal.symbol);
    console.log('Signal Type:', signal.type);
    console.log('Confidence:', signal.confidence);
    console.log('Predicted Change:', signal.predictedChange);
    console.log('Target Price:', signal.targetPrice);
    console.log('Stop Loss:', signal.stopLoss);
    console.log('Ensemble Prediction:', prediction.ensemblePrediction);
    console.log('Reason:', signal.reason);
}

debug().catch(console.error);
