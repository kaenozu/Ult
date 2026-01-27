import { useTradingStore } from './tradingStore';

export const useThemeStore = () => {
    const theme = useTradingStore((state) => state.theme);
    const toggleTheme = useTradingStore((state) => state.toggleTheme);

    return {
        theme,
        toggleTheme,
    };
};
