/**
 * @jest-environment node
 */
import { isTSEOpen, getMarketStatusMessage, formatNextOpenTime, MarketStatus } from '../market-hours';

describe('Tokyo Stock Exchange Market Hours', () => {
  describe('isTSEOpen', () => {
    describe('Trading hours', () => {
      it('should be open during morning session (9:00-11:30)', () => {
        // Wednesday, 9:30 AM JST
        const date = new Date('2026-02-04T09:30:00+09:00');
        const status = isTSEOpen(date);
        
        expect(status.isOpen).toBe(true);
        expect(status.tradingSession).toBe('morning');
      });

      it('should be open during afternoon session (12:30-15:00)', () => {
        // Wednesday, 1:00 PM JST
        const date = new Date('2026-02-04T13:00:00+09:00');
        const status = isTSEOpen(date);
        
        expect(status.isOpen).toBe(true);
        expect(status.tradingSession).toBe('afternoon');
      });

      it('should be closed during lunch break (11:30-12:30)', () => {
        // Wednesday, 12:00 PM JST
        const date = new Date('2026-02-04T12:00:00+09:00');
        const status = isTSEOpen(date);
        
        expect(status.isOpen).toBe(false);
        expect(status.reason).toBe('昼休み（11:30-12:30）');
        expect(status.tradingSession).toBe('closed');
      });

      it('should be closed before market open (before 9:00)', () => {
        // Wednesday, 8:30 AM JST
        const date = new Date('2026-02-04T08:30:00+09:00');
        const status = isTSEOpen(date);
        
        expect(status.isOpen).toBe(false);
        expect(status.reason).toBe('取引開始前');
        expect(status.tradingSession).toBe('closed');
      });

      it('should be closed after market close (after 15:00)', () => {
        // Wednesday, 4:00 PM JST
        const date = new Date('2026-02-04T16:00:00+09:00');
        const status = isTSEOpen(date);
        
        expect(status.isOpen).toBe(false);
        expect(status.reason).toBe('取引終了後');
        expect(status.tradingSession).toBe('closed');
      });
    });

    describe('Weekends', () => {
      it('should be closed on Saturday', () => {
        // Saturday, 10:00 AM JST
        const date = new Date('2026-02-07T10:00:00+09:00');
        const status = isTSEOpen(date);
        
        expect(status.isOpen).toBe(false);
        expect(status.reason).toBe('週末のため休場');
        expect(status.tradingSession).toBe('closed');
      });

      it('should be closed on Sunday', () => {
        // Sunday, 10:00 AM JST
        const date = new Date('2026-02-08T10:00:00+09:00');
        const status = isTSEOpen(date);
        
        expect(status.isOpen).toBe(false);
        expect(status.reason).toBe('週末のため休場');
        expect(status.tradingSession).toBe('closed');
      });
    });

    describe('Holidays', () => {
      it('should be closed on New Year (Jan 1)', () => {
        // January 1, 2026, 10:00 AM JST
        const date = new Date('2026-01-01T10:00:00+09:00');
        const status = isTSEOpen(date);
        
        expect(status.isOpen).toBe(false);
        expect(status.reason).toBe('元日のため休場');
        expect(status.tradingSession).toBe('closed');
      });

      it('should be closed on Coming of Age Day', () => {
        // January 12, 2026 (Second Monday of January)
        const date = new Date('2026-01-12T10:00:00+09:00');
        const status = isTSEOpen(date);
        
        expect(status.isOpen).toBe(false);
        expect(status.reason).toBe('成人の日のため休場');
        expect(status.tradingSession).toBe('closed');
      });

      it('should be closed on National Foundation Day', () => {
        // February 11, 2026
        const date = new Date('2026-02-11T10:00:00+09:00');
        const status = isTSEOpen(date);
        
        expect(status.isOpen).toBe(false);
        expect(status.reason).toBe('建国記念の日のため休場');
        expect(status.tradingSession).toBe('closed');
      });

      it('should be closed on Emperor\'s Birthday', () => {
        // February 23, 2026
        const date = new Date('2026-02-23T10:00:00+09:00');
        const status = isTSEOpen(date);
        
        expect(status.isOpen).toBe(false);
        expect(status.reason).toBe('天皇誕生日のため休場');
        expect(status.tradingSession).toBe('closed');
      });
    });

    describe('Next open time calculation', () => {
      it('should calculate next open time during lunch break', () => {
        // Wednesday, 12:00 PM JST (lunch break)
        const date = new Date('2026-02-04T12:00:00+09:00');
        const status = isTSEOpen(date);
        
        expect(status.isOpen).toBe(false);
        expect(status.nextOpenTime).toBeDefined();
        
        if (status.nextOpenTime) {
          const nextOpen = new Date(status.nextOpenTime);
          expect(nextOpen.getHours()).toBe(12);
          expect(nextOpen.getMinutes()).toBe(30);
        }
      });

      it('should calculate next open time after market close', () => {
        // Wednesday, 4:00 PM JST (after close)
        const date = new Date('2026-02-04T16:00:00+09:00');
        const status = isTSEOpen(date);
        
        expect(status.isOpen).toBe(false);
        expect(status.nextOpenTime).toBeDefined();
        
        if (status.nextOpenTime) {
          const nextOpen = new Date(status.nextOpenTime);
          // Should be next day (Thursday) at 9:00
          expect(nextOpen.getDate()).toBe(5);
          expect(nextOpen.getHours()).toBe(9);
          expect(nextOpen.getMinutes()).toBe(0);
        }
      });

      it('should skip weekend when calculating next open time', () => {
        // Friday, 4:00 PM JST (after close)
        const date = new Date('2026-02-06T16:00:00+09:00');
        const status = isTSEOpen(date);
        
        expect(status.isOpen).toBe(false);
        expect(status.nextOpenTime).toBeDefined();
        
        if (status.nextOpenTime) {
          const nextOpen = new Date(status.nextOpenTime);
          // Should be Monday at 9:00
          expect(nextOpen.getDate()).toBe(9);
          expect(nextOpen.getDay()).toBe(1); // Monday
          expect(nextOpen.getHours()).toBe(9);
        }
      });
    });
  });

  describe('getMarketStatusMessage', () => {
    it('should return trading session message when open', () => {
      const status: MarketStatus = {
        isOpen: true,
        tradingSession: 'morning',
      };
      
      const message = getMarketStatusMessage(status);
      expect(message).toBe('取引中（前場）');
    });

    it('should return afternoon session message', () => {
      const status: MarketStatus = {
        isOpen: true,
        tradingSession: 'afternoon',
      };
      
      const message = getMarketStatusMessage(status);
      expect(message).toBe('取引中（後場）');
    });

    it('should return reason when closed', () => {
      const status: MarketStatus = {
        isOpen: false,
        reason: '週末のため休場',
        tradingSession: 'closed',
      };
      
      const message = getMarketStatusMessage(status);
      expect(message).toBe('週末のため休場');
    });
  });

  describe('formatNextOpenTime', () => {
    it('should format same day time', () => {
      const now = new Date('2026-02-04T12:00:00+09:00');
      const nextOpen = new Date('2026-02-04T12:30:00+09:00');
      
      // Mock the current time by passing it as a parameter
      const formatted = formatNextOpenTime(nextOpen);
      expect(formatted).toContain('12:30');
    });

    it('should format next day time', () => {
      const nextOpen = new Date('2026-02-05T09:00:00+09:00');
      const formatted = formatNextOpenTime(nextOpen);
      
      // Should contain time
      expect(formatted).toContain('9:00');
    });
  });

  describe('Timezone handling', () => {
    it('should correctly handle UTC to JST conversion', () => {
      // 12:00 AM UTC = 9:00 AM JST (same day)
      const utcDate = new Date('2026-02-04T00:00:00Z');
      const status = isTSEOpen(utcDate);
      
      // Should be open (9:00 AM JST is within morning session)
      expect(status.isOpen).toBe(true);
      expect(status.tradingSession).toBe('morning');
    });

    it('should handle US Eastern Time correctly', () => {
      // 7:00 PM EST (previous day) = 9:00 AM JST
      const estDate = new Date('2026-02-03T19:00:00-05:00');
      const status = isTSEOpen(estDate);
      
      // Should be open (9:00 AM JST)
      expect(status.isOpen).toBe(true);
    });
  });
});
