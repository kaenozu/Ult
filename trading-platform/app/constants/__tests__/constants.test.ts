import { 
  TRADING_LIMITS, 
  CHART_CONFIG, 
  API_CONFIG,
  TECHNICAL_INDICATORS
} from '../index';

describe('Constants', () => {
  describe('TRADING_LIMITS', () => {
    it('should have a default max positions limit', () => {
      expect(TRADING_LIMITS.MAX_POSITIONS).toBeGreaterThan(0);
    });
    it('should have a default risk limit per trade', () => {
      expect(TRADING_LIMITS.RISK_PER_TRADE_PERCENT).toBeGreaterThan(0);
    });
  });

  describe('CHART_CONFIG', () => {
    it('should have default colors', () => {
      expect(CHART_CONFIG.COLORS.UP).toMatch(/^#/);
      expect(CHART_CONFIG.COLORS.DOWN).toMatch(/^#/);
    });
  });

  describe('API_CONFIG', () => {
    it('should have a default timeout', () => {
      expect(API_CONFIG.DEFAULT_TIMEOUT).toBeGreaterThan(0);
    });
  });

  describe('TECHNICAL_INDICATORS', () => {
    it('should have default RSI settings', () => {
      expect(TECHNICAL_INDICATORS.RSI.DEFAULT_PERIOD).toBe(14);
    });
  });
});
