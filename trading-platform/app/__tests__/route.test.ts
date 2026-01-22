/**
 * @jest-environment node
 */
import { GET } from '../api/market/route';
import yahooFinance from 'yahoo-finance2';

// Mock yahoo-finance2
jest.mock('yahoo-finance2', () => ({
  chart: jest.fn(),
  quote: jest.fn(),
}));

describe('Market API GET', () => {
  it('should return 500 and generic error message when yahooFinance fails', async () => {
    // Arrange
    const sensitiveError = 'Sensitive database connection string failed';
    (yahooFinance.chart as jest.Mock).mockRejectedValue(new Error(sensitiveError));

    // Construct a mock Request object
    // In Node environment, we might need to rely on Next.js Request/Response or polyfills
    // For now, let's try passing a simple object if the type allows, or use the global Request if available

    // We need a URL to parse searchParams
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
