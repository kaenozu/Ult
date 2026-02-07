import { useTradingStore } from './tradingStore';

export const useUIStore = () => {
    const selectedStock = useTradingStore((state) => state.selectedStock);
    const setSelectedStock = useTradingStore((state) => state.setSelectedStock);
    const isConnected = useTradingStore((state) => state.isConnected);
    const toggleConnection = useTradingStore((state) => state.toggleConnection);

    return {
        selectedStock,
        setSelectedStock,
        isConnected,
        toggleConnection,
    };
};
