import { getAlphaVantageClient } from '../alpha-vantage';

describe('AlphaVantageClient Security', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should throw error when initialized in client-side environment', () => {
    // Set the API key to ensure it's not failing because of missing key
    process.env.ALPHA_VANTAGE_API_KEY = 'test-key';

    // JSDOM environment defines window by default, simulating client
    expect(typeof window).not.toBe('undefined');

    expect(() => {
      getAlphaVantageClient();
    }).toThrow('AlphaVantageClient must be used on server side only');
  });
});
