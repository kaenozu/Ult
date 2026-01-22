/**
 * @jest-environment node
 */
import { GET } from '../api/market/route';
import YahooFinance from 'yahoo-finance2';

// Mock instance methods
const mockChart = jest.fn();
const mockQuote = jest.fn();
const mockHistorical = jest.fn();

// Mock yahoo-finance2 as a class constructor
jest.mock('yahoo-finance2', () => {
  return jest.fn().mockImplementation(() => ({
    chart: mockChart,
    quote: mockQuote,
    historical: mockHistorical,
  }));
});

describe('Market API GET', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 500 and generic error message when yahooFinance fails', async () => {
    // Arrange
    const sensitiveError = 'Sensitive database connection string failed';
    mockHistorical.mockRejectedValue(new Error(sensitiveError));

    // Construct a mock Request object
    const req = new Request('http://localhost/api/market?type=history&symbol=AAPL');

    // Act
    const response = await GET(req);
    const json = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(json.error).toBe('Failed to fetch market data'); // Expected SAFE message
    expect(json.error).not.toContain(sensitiveError);
  });
});
