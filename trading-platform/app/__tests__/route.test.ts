/**
 * @jest-environment node
 */
import { GET } from '../api/market/route';

describe('Market API GET', () => {
  let mockChart: jest.Mock;
  let mockQuote: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    mockChart = jest.fn();
    mockQuote = jest.fn();
    
    jest.doMock('yahoo-finance2', () => {
      return jest.fn(() => ({
        chart: mockChart,
        quote: mockQuote,
        historical: jest.fn(),
      }));
    });
  });

  it('should return 500 and generic error message when yahooFinance fails', async () => {
    // Re-import after mocking
    const { GET: GET_REQUAL } = require('../api/market/route');

    // Arrange
    const sensitiveError = 'Sensitive database connection string failed';
    mockChart.mockRejectedValue(new Error(sensitiveError));

    // Construct a mock Request object
    const req = new Request('http://localhost/api/market?type=history&symbol=AAPL');

    // Act
    const response = await GET_REQUAL(req);
    const json = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(json.error).toBe('Failed to fetch market data'); // Expected SAFE message
    expect(json.error).not.toContain(sensitiveError);
  });
});