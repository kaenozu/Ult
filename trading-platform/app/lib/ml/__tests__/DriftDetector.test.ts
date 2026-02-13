import { DriftDetector } from '../DriftDetector';

describe('DriftDetector', () => {
  let detector: DriftDetector;

  beforeEach(() => {
    detector = new DriftDetector({ threshold: 0.1, minWindowSize: 5 });
  });

  it('should not detect drift with small data', () => {
    const drift = detector.checkDrift([0.1, 0.1, 0.1]);
    expect(drift.hasDrift).toBe(false);
  });

  it('should detect drift when error increases significantly', () => {
    // 10 points minimum (5 baseline + 5 recent)
    const errors = [0.05, 0.04, 0.05, 0.06, 0.05];
    const newErrors = [...errors, 0.2, 0.25, 0.3, 0.28, 0.32];
    
    const drift = detector.checkDrift(newErrors);
    expect(drift.hasDrift).toBe(true);
    expect(drift.severity).toBe('high');
  });
});
