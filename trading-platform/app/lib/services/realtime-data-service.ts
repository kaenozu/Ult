export interface RealTimeData {
  symbol: string;
  price: number;
  volume: number;
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface RealTimeDataCallbacks {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
  onData?: (data: RealTimeData) => void;
}

class RealTimeDataService {
  connect(callbacks: RealTimeDataCallbacks): void {
    console.log('RealTimeDataService: connect (mock)');
    if (callbacks.onConnect) callbacks.onConnect();
  }

  disconnect(): void {
    console.log('RealTimeDataService: disconnect (mock)');
  }

  subscribeMultiple(symbols: string[]): void {
    console.log('RealTimeDataService: subscribeMultiple (mock)', symbols);
  }
}

export const realTimeDataService = new RealTimeDataService();
