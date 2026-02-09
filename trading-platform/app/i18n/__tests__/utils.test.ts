import { getMessages, translate } from '../utils';

describe('i18n utilities', () => {
  describe('getMessages', () => {
    it('should return Japanese messages for ja locale', () => {
      const messages = getMessages('ja');
      expect(messages.common.loading).toBe('読み込み中...');
      expect(messages.header.title).toBe('Trader Pro - 株式取引予測プラットフォーム');
    });

    it('should return English messages for en locale', () => {
      const messages = getMessages('en');
      expect(messages.common.loading).toBe('Loading...');
      expect(messages.header.title).toBe('Trader Pro - Stock Trading Platform');
    });

    it('should fallback to Japanese for unknown locale', () => {
      const messages = getMessages('fr' as unknown);
      expect(messages.common.loading).toBe('読み込み中...');
    });
  });

  describe('translate', () => {
    it('should translate simple keys', () => {
      const messages = getMessages('ja');
      expect(translate(messages, 'common.loading')).toBe('読み込み中...');
      expect(translate(messages, 'page.noStockSelected')).toBe('銘柄が未選択です');
    });

    it('should translate keys with parameters', () => {
      const messages = getMessages('ja');
      expect(translate(messages, 'riskMetrics.targetPrice', { ratio: '2.5' })).toBe('目標価格 (R:R 2.5)');
    });

    it('should return key if translation not found', () => {
      const messages = getMessages('ja');
      expect(translate(messages, 'nonexistent.key')).toBe('nonexistent.key');
    });

    it('should handle multiple parameters', () => {
      const messages = getMessages('ja');
      expect(translate(messages, 'errorBoundary.titleWithName', { name: 'TestComponent' })).toBe('TestComponent エラー');
    });
  });
});
