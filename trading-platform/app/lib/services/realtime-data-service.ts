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
    if (callbacks.onConnect) callbacks.onConnect();
  }

  disconnect(): void {
  }

  subscribeMultiple(symbols: string[]): void {
  }
}

export const realTimeDataService = new RealTimeDataService();
