/**
 * @jest-environment node
 */
import { GET, POST } from '../route';

// Mock auth and csrf
jest.mock('@/app/lib/auth', () => ({
  requireAuth: jest.fn(() => null),
  requireAdmin: jest.fn(() => null),
}));

jest.mock('@/app/lib/csrf/csrf-protection', () => ({
  requireCSRF: jest.fn(() => null),
}));

// Mock the sentiment integration service
jest.mock('@/app/lib/nlp/SentimentIntegrationService', () => {
  const mockService = {
    getAllMarketIntelligence: jest.fn(),
    getStatus: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    clearAllData: jest.fn(),
  };

  return {
    getGlobalSentimentIntegration: jest.fn(() => mockService),
  };
});

describe('/api/sentiment', () => {
  let mockService: {
    getAllMarketIntelligence: jest.Mock;
    getStatus: jest.Mock;
    start: jest.Mock;
    stop: jest.Mock;
    clearAllData: jest.Mock;
  };

  beforeEach(() => {
    const { getGlobalSentimentIntegration } = require('@/app/lib/nlp/SentimentIntegrationService');
    mockService = getGlobalSentimentIntegration();
    jest.clearAllMocks();
    // Reset all mocks to default implementation
    mockService.getAllMarketIntelligence.mockReset();
    mockService.getStatus.mockReset();
    mockService.start.mockReset();
    mockService.stop.mockReset();
    mockService.clearAllData.mockReset();
  });

  const createRequest = (url: string, method: string = 'GET', body?: unknown) => {
    const headers = new Headers();
    
    const options: RequestInit = {
      method,
      headers,
    };
    
    if (body) {
      options.body = JSON.stringify(body);
      headers.set('content-type', 'application/json');
    }
    
    return new Request(`http://localhost${url}`, options);
  };

  describe('GET', () => {
    it('should return all sentiment data', async () => {
      const mockIntelligence = new Map([
        ['AAPL', { symbol: 'AAPL', sentiment: {}, newsCount: 5 }],
        ['MSFT', { symbol: 'MSFT', sentiment: {}, newsCount: 3 }],
      ]);

      mockService.getAllMarketIntelligence.mockReturnValue(mockIntelligence);
      mockService.getStatus.mockReturnValue({
        isRunning: true,
        newsEnabled: true,
        socialEnabled: false,
        nlpEnabled: true,
        stats: { newsCount: 10, socialCount: 0, trackedSymbols: 2 },
      });

      const request = createRequest('/api/sentiment');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.count).toBe(2);
      expect(data.data.data.AAPL).toBeDefined();
      expect(data.data.data.MSFT).toBeDefined();
      expect(data.data.status).toBeDefined();
    });

    it('should handle errors gracefully', async () => {
      mockService.getAllMarketIntelligence.mockImplementation(() => {
        throw new Error('Test error');
      });

      // Use a unique URL to avoid cache hit
      const request = createRequest('/api/sentiment?error=test');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });

  describe('POST', () => {
    it('should start sentiment analysis', async () => {
      const request = createRequest('/api/sentiment', 'POST', { action: 'start' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.message).toBe('Sentiment analysis started');
      expect(mockService.start).toHaveBeenCalled();
    });

    it('should stop sentiment analysis', async () => {
      const request = createRequest('/api/sentiment', 'POST', { action: 'stop' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.message).toBe('Sentiment analysis stopped');
      expect(mockService.stop).toHaveBeenCalled();
    });

    it('should clear all data', async () => {
      const request = createRequest('/api/sentiment', 'POST', { action: 'clear' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.message).toBe('All data cleared');
      expect(mockService.clearAllData).toHaveBeenCalled();
    });

    it('should reject unknown actions', async () => {
      const request = createRequest('/api/sentiment', 'POST', { action: 'unknown' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toContain('Invalid action');
    });

    it('should handle errors gracefully', async () => {
      mockService.start.mockImplementation(() => {
        throw new Error('Test error');
      });

      const request = createRequest('/api/sentiment', 'POST', { action: 'start' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });
});
