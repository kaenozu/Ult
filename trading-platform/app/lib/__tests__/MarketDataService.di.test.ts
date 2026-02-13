import { ServiceContainer, TOKENS } from '../di/ServiceContainer';
import { MarketDataService } from '../MarketDataService';
import { IMarketDataService } from '../interfaces/IMarketDataService';

describe('MarketDataService DI Integration', () => {
  beforeEach(() => {
    ServiceContainer.reset();
  });

  it('should be able to resolve MarketDataService from container', () => {
    // Register real service
    const realService = new MarketDataService();
    ServiceContainer.register<IMarketDataService>(TOKENS.MarketDataService, realService);

    const resolved = ServiceContainer.resolve<IMarketDataService>(TOKENS.MarketDataService);
    expect(resolved).toBeInstanceOf(MarketDataService);
  });

  it('should support mocking through the container', async () => {
    const mockService: Partial<IMarketDataService> = {
      fetchMarketData: jest.fn().mockResolvedValue({ success: true, data: [], source: 'api' }),
    };

    ServiceContainer.register<IMarketDataService>(TOKENS.MarketDataService, mockService as IMarketDataService);

    const resolved = ServiceContainer.resolve<IMarketDataService>(TOKENS.MarketDataService);
    const result = await resolved.fetchMarketData('7203');
    
    expect(result.success).toBe(true);
    expect(mockService.fetchMarketData).toHaveBeenCalledWith('7203');
  });
});
