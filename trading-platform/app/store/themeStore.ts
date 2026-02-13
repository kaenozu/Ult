import { useUIStore } from './uiStore';

export const useThemeStore = () => {
    const theme = useUIStore((state) => state.theme);
    const toggleTheme = useUIStore((state) => state.toggleTheme);

    return {
        theme,
        toggleTheme,
    };
};
