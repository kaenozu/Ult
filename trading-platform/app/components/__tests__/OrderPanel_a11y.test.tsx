import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { OrderPanel } from '../OrderPanel';
import { usePortfolioStore } from '@/app/store/portfolioStore';
import { useExecuteOrder } from '@/app/store/orderExecutionStore';

// Mock stores
jest.mock('@/app/store/portfolioStore');
jest.mock('@/app/store/orderExecutionStore', () => ({
    useExecuteOrder: jest.fn()
}));

describe('OrderPanel Accessibility', () => {
    const mockStock = { symbol: '7203', name: 'Toyota', price: 2000, change: 0, changePercent: 0, market: 'japan' as const, sector: 'Automotive', volume: 1000000 };
    const mockExecuteOrder = jest.fn().mockReturnValue({ success: true });

    const mockPortfolioState = {
        portfolio: { cash: 1000000, positions: [] },
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (usePortfolioStore as unknown as jest.Mock).mockImplementation((selector) => {
            return selector ? selector(mockPortfolioState) : mockPortfolioState;
        });
        (useExecuteOrder as jest.Mock).mockReturnValue(mockExecuteOrder);
    });

    it('risk management toggles have accessible names', () => {
        render(<OrderPanel stock={mockStock} currentPrice={2000} />);

        // Open risk settings
        const settingsButton = screen.getByText('リスク管理設定');
        fireEvent.click(settingsButton);

        // Check for accessible names on toggles. If they don't have names, getByRole will fail or not find them by name.
        // We look for them specifically by name to assert they are correctly labeled.
        const trailingStopToggle = screen.getByRole('switch', { name: 'トレイリングストップ' });
        expect(trailingStopToggle).toBeInTheDocument();

        const volAdjustToggle = screen.getByRole('switch', { name: 'ボラティリティ調整' });
        expect(volAdjustToggle).toBeInTheDocument();

        const kellyToggle = screen.getByRole('switch', { name: 'ケリー基準ポジションサイジング' });
        expect(kellyToggle).toBeInTheDocument();
    });

    it('volatility level buttons communicate selection state', () => {
        render(<OrderPanel stock={mockStock} currentPrice={2000} />);

        // Open risk settings
        const settingsButton = screen.getByText('リスク管理設定');
        fireEvent.click(settingsButton);

        // Find the "Medium" (中) volatility button which is default (1.0 => 中?)
        // Default riskConfig has volatilityMultiplier: 1.5. Wait, let's check OrderPanel.tsx defaults.
        // const [riskConfig, setRiskConfig] = useState<DynamicRiskConfig>({ ... volatilityMultiplier: 1.5 ... });
        // The buttons are: 1.3 (Low), 1.0 (Medium), 0.7 (High), 0.4 (Extreme).
        // Wait, 1.5 is not in the list! So initially none are selected? Or maybe I misread the file.

        // Let's check OrderPanel.tsx again.
        // { value: 1.3, label: '低', color: 'bg-blue-500' },
        // ...
        // riskConfig.volatilityMultiplier === value ? ...

        // If initial state is 1.5, then none match. So none are selected initially.

        // Let's click one to select it.
        const mediumButton = screen.getByRole('button', { name: '中' });
        fireEvent.click(mediumButton);

        // Now it should be pressed
        expect(mediumButton).toHaveAttribute('aria-pressed', 'true');

        // And another should not be
        const lowButton = screen.getByRole('button', { name: '低' });
        expect(lowButton).toHaveAttribute('aria-pressed', 'false');
    });
});
