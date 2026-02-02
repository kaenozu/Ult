/**
 * Tests for Branded Types
 */

import {
  milliseconds,
  seconds,
  minutes,
  hours,
  days,
  percentage,
  decimalPercentage,
  ratio,
  currency,
  points,
  count,
  index,
} from '../branded';

describe('Branded Types - Time Conversions', () => {
  describe('Milliseconds', () => {
    it('should create milliseconds from number', () => {
      const ms = milliseconds(1000);
      expect(ms).toBe(1000);
    });
  });

  describe('Seconds', () => {
    it('should convert milliseconds to seconds', () => {
      const ms = milliseconds(5000);
      const sec = seconds.fromMs(ms);
      expect(sec).toBe(5);
    });

    it('should convert seconds to milliseconds', () => {
      const sec = seconds.create(5);
      const ms = seconds.toMs(sec);
      expect(ms).toBe(5000);
    });

    it('should handle decimal seconds', () => {
      const ms = milliseconds(1500);
      const sec = seconds.fromMs(ms);
      expect(sec).toBe(1.5);
    });
  });

  describe('Minutes', () => {
    it('should convert milliseconds to minutes', () => {
      const ms = milliseconds(300000); // 5 minutes
      const min = minutes.fromMs(ms);
      expect(min).toBe(5);
    });

    it('should convert minutes to milliseconds', () => {
      const min = minutes.create(5);
      const ms = minutes.toMs(min);
      expect(ms).toBe(300000);
    });

    it('should convert seconds to minutes', () => {
      const sec = seconds.create(120);
      const min = minutes.fromSeconds(sec);
      expect(min).toBe(2);
    });

    it('should convert minutes to seconds', () => {
      const min = minutes.create(2);
      const sec = minutes.toSeconds(min);
      expect(sec).toBe(120);
    });
  });

  describe('Hours', () => {
    it('should convert milliseconds to hours', () => {
      const ms = milliseconds(3600000); // 1 hour
      const hr = hours.fromMs(ms);
      expect(hr).toBe(1);
    });

    it('should convert hours to milliseconds', () => {
      const hr = hours.create(2);
      const ms = hours.toMs(hr);
      expect(ms).toBe(7200000);
    });

    it('should convert minutes to hours', () => {
      const min = minutes.create(120);
      const hr = hours.fromMinutes(min);
      expect(hr).toBe(2);
    });

    it('should convert hours to minutes', () => {
      const hr = hours.create(2);
      const min = hours.toMinutes(hr);
      expect(min).toBe(120);
    });
  });

  describe('Days', () => {
    it('should convert milliseconds to days', () => {
      const ms = milliseconds(86400000); // 1 day
      const d = days.fromMs(ms);
      expect(d).toBe(1);
    });

    it('should convert days to milliseconds', () => {
      const d = days.create(2);
      const ms = days.toMs(d);
      expect(ms).toBe(172800000);
    });

    it('should convert hours to days', () => {
      const hr = hours.create(48);
      const d = days.fromHours(hr);
      expect(d).toBe(2);
    });

    it('should convert days to hours', () => {
      const d = days.create(2);
      const hr = days.toHours(d);
      expect(hr).toBe(48);
    });
  });
});

describe('Branded Types - Percentage Conversions', () => {
  describe('Percentage', () => {
    it('should create percentage from number', () => {
      const pct = percentage.create(75);
      expect(pct).toBe(75);
    });

    it('should convert percentage to decimal', () => {
      const pct = percentage.create(75);
      const dec = percentage.toDecimal(pct);
      expect(dec).toBe(0.75);
    });

    it('should convert percentage to ratio', () => {
      const pct = percentage.create(50);
      const r = percentage.toRatio(pct);
      expect(r).toBe(0.5);
    });
  });

  describe('DecimalPercentage', () => {
    it('should create decimal percentage from number', () => {
      const dec = decimalPercentage.create(0.75);
      expect(dec).toBe(0.75);
    });

    it('should convert decimal to percentage', () => {
      const dec = decimalPercentage.create(0.75);
      const pct = decimalPercentage.toPercentage(dec);
      expect(pct).toBe(75);
    });
  });

  describe('Ratio', () => {
    it('should create ratio from number', () => {
      const r = ratio.create(0.5);
      expect(r).toBe(0.5);
    });

    it('should convert ratio to percentage', () => {
      const r = ratio.create(0.25);
      const pct = ratio.toPercentage(r);
      expect(pct).toBe(25);
    });
  });
});

describe('Branded Types - Financial Types', () => {
  describe('Currency', () => {
    it('should create currency from number', () => {
      const curr = currency.create(100.50);
      expect(curr).toBe(100.50);
    });
  });

  describe('Points', () => {
    it('should create points from number', () => {
      const pts = points.create(1500);
      expect(pts).toBe(1500);
    });
  });
});

describe('Branded Types - Count/Index Types', () => {
  describe('Count', () => {
    it('should create count from number', () => {
      const cnt = count.create(42);
      expect(cnt).toBe(42);
    });
  });

  describe('Index', () => {
    it('should create index from number', () => {
      const idx = index.create(0);
      expect(idx).toBe(0);
    });
  });
});

describe('Branded Types - Type Safety', () => {
  it('should maintain type safety at compile time', () => {
    // This test ensures types are different at compile time
    // while being compatible at runtime
    const ms = milliseconds(1000);
    const sec = seconds.create(1);
    
    // Both are numbers at runtime
    expect(typeof ms).toBe('number');
    expect(typeof sec).toBe('number');
    
    // But they're different types at compile time
    // TypeScript would prevent: const x: Seconds = ms; 
    // without proper conversion
  });

  it('should allow conversion between compatible units', () => {
    const ms = milliseconds(60000);
    const sec = seconds.fromMs(ms);
    const min = minutes.fromSeconds(sec);
    
    expect(min).toBe(1);
  });
});
