/**
 * @jest-environment node
 */
/**
 * @jest-environment node
 */

describe('Market API GET', () => {
  let GET: any;
  let mockChart: any;

  beforeEach(() => {
    jest.resetModules();
    mockChart = jest.fn();
    
    jest.doMock('yahoo-finance2', () => {
      return jest.fn(() => ({
        chart: mockChart,
        quote: jest.fn(),
        historical: jest.fn(),
      }));
    });

    // Import route after mocking
    const route = require('../api/market/route');
    GET = route.GET;
  });

  it('should return 500 and generic error message when yahooFinance fails', async () => {
    // Arrange
    const sensitiveError = 'Sensitive database connection string failed';
    mockChart.mockRejectedValue(new Error(sensitiveError));

    // Construct a mock Request object
    const req = new Request('http://localhost/api/market?type=history&symbol=AAPL');

    // Act
    const response = await GET(req);
    const json = await response.json();

    // Assert
    expect(response.status).toBe(502);
    expect(json.error).toBe('Failed to fetch historical data'); 
  });
});
