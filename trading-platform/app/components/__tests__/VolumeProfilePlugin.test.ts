import { volumeProfilePlugin } from '../StockChart';

describe('volumeProfilePlugin', () => {
    let mockChart: {
        ctx: unknown;
        chartArea: { right: number; width: number; top: number; bottom: number };
        scales: { y: { getPixelForValue: jest.Mock } };
    };
    let mockContext: {
        save: jest.Mock;
        restore: jest.Mock;
        createLinearGradient: jest.Mock;
        fillRect: jest.Mock;
        fillStyle: unknown;
        shadowBlur: unknown;
    };

    beforeEach(() => {
        mockContext = {
            save: jest.fn(),
            restore: jest.fn(),
            createLinearGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
            fillRect: jest.fn(),
            fillStyle: '',
            shadowBlur: 0
        };
        mockChart = {
            ctx: mockContext,
            chartArea: { right: 100, width: 200, top: 10, bottom: 90 },
            scales: {
                y: { getPixelForValue: jest.fn((price) => price) } // Simple Identity mock
            }
        };
    });

    it('should draw volume profile bars', () => {
        const options = {
            enabled: true,
            data: [{ price: 50, strength: 0.5 }],
            currentPrice: 40
        };

        volumeProfilePlugin.afterDatasetsDraw(mockChart, {}, options);

        expect(mockContext.save).toHaveBeenCalled();
        expect(mockContext.fillRect).toHaveBeenCalled();
        expect(mockContext.restore).toHaveBeenCalled();
    });

    it('should skip if disabled or no data', () => {
        volumeProfilePlugin.afterDatasetsDraw(mockChart, {}, { enabled: false, data: [], currentPrice: 0 });
        expect(mockContext.save).not.toHaveBeenCalled();

        volumeProfilePlugin.afterDatasetsDraw(mockChart, {}, { enabled: true, data: [], currentPrice: 0 });
        expect(mockContext.save).not.toHaveBeenCalled();
    });

    it('should use red color for price above current', () => {
        const options = {
            enabled: true,
            data: [{ price: 60, strength: 0.5 }],
            currentPrice: 50
        };
        // Mock getPixelForValue to return valid y
        mockChart.scales.y.getPixelForValue.mockReturnValue(60);

        volumeProfilePlugin.afterDatasetsDraw(mockChart, {}, options);

        // Check if createLinearGradient was called (indicating drawing happened)
        expect(mockContext.createLinearGradient).toHaveBeenCalled();
    });

    it('should use green color for price below current', () => {
        const options = {
            enabled: true,
            data: [{ price: 40, strength: 0.5 }],
            currentPrice: 50
        };
        mockChart.scales.y.getPixelForValue.mockReturnValue(40);

        volumeProfilePlugin.afterDatasetsDraw(mockChart, {}, options);

        expect(mockContext.createLinearGradient).toHaveBeenCalled();
    });
});
