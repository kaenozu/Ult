import { OHLCV } from '../types';
import { TECHNICAL_INDICATORS, DATA_REQUIREMENTS } from './constants';

export interface VolumeProfile {
  price: number;
  volume: number;
  strength: number;
}

export interface ResistanceLevel {
  price: number;
  volume: number;
  strength: number;
  type: 'support' | 'resistance';
  level: 'strong' | 'medium' | 'weak';
}

export interface VolumeAnalysisResult {
  profile: VolumeProfile[];
  resistanceLevels: ResistanceLevel[];
  supportLevels: ResistanceLevel[];
  volumeProfileStrength: number;
}

export class VolumeAnalysisService {
  private readonly PROFILE_BINS = TECHNICAL_INDICATORS.VOLUME_PROFILE_BINS;
  private readonly MIN_PROFILE_DAYS = TECHNICAL_INDICATORS.VOLUME_PROFILE_MIN_DAYS;

  calculateVolumeProfile(data: OHLCV[]): VolumeProfile[] {
    if (data.length === 0) return [];

    const recentData = data.slice(-this.MIN_PROFILE_DAYS);
    const totalVolume = recentData.reduce((sum, d) => sum + d.volume, 0);

    if (totalVolume === 0) return [];

    const prices = recentData.map(d => d.close);
    const min = Math.min(...prices);
    const max = Math.max(...prices);

    if (max === min) return [];

    const step = (max - min) / this.PROFILE_BINS;
    const profile: VolumeProfile[] = Array.from({ length: this.PROFILE_BINS }, (_, i) => ({
      price: min + step * i,
      volume: 0,
      strength: 0,
    }));

    recentData.forEach(d => {
      if (d.close >= min && d.close < max) {
        const binIndex = Math.min(Math.floor((d.close - min) / step), this.PROFILE_BINS - 1);
        if (binIndex >= 0 && binIndex < this.PROFILE_BINS) {
          profile[binIndex].volume += d.volume;
        }
      }
    });

    const maxVol = Math.max(...profile.map(p => p.volume));
    if (maxVol > 0) {
      profile.forEach(p => {
        p.strength = maxVol > 0 ? p.volume / maxVol : 0;
      });
    }

    return profile.filter(p => p.volume > 0);
  }

  calculateResistanceLevels(data: OHLCV[]): ResistanceLevel[] {
    if (data.length < this.MIN_PROFILE_DAYS) return [];

    const profile = this.calculateVolumeProfile(data);

    if (profile.length < 3) return [];

    const levels: ResistanceLevel[] = [];

    for (let i = 0; i < profile.length; i++) {
      const prev = profile[i - 1];
      const current = profile[i];
      const next = profile[i + 1];

      if (!prev || !next) continue;

      const isPeak = current.strength > prev.strength && current.strength > next.strength;
      const isValley = current.strength < prev.strength && current.strength < next.strength;

      if (isPeak || isValley) {
        let level: 'strong' | 'medium' | 'weak';

        if (current.strength >= 0.7) {
          level = 'strong';
        } else if (current.strength >= 0.4) {
          level = 'medium';
        } else {
          level = 'weak';
        }

        levels.push({
          price: current.price,
          volume: current.volume,
          strength: current.strength,
          type: isPeak ? 'resistance' : 'support',
          level,
        });
      }
    }

    return levels.sort((a, b) => {
      // Strongest levels first
      const levelOrder: Record<string, number> = { 'strong': 0, 'medium': 1, 'weak': 2 };
      return levelOrder[a.level] - levelOrder[b.level];
    });
  }

  calculateSupportLevels(data: OHLCV[]): ResistanceLevel[] {
    const levels = this.calculateResistanceLevels(data);
    return levels.filter(l => l.type === 'support');
  }

  detectBreakout(
    currentPrice: number,
    recentData: OHLCV[],
    resistanceLevels: ResistanceLevel[]
  ): {
    broken: boolean;
    level?: ResistanceLevel;
    confidence: 'low' | 'medium' | 'high';
  } {
    if (resistanceLevels.length === 0) {
      return { broken: false, confidence: 'low' };
    }

    for (const level of resistanceLevels) {
      const priceDiff = currentPrice - level.price;
      const priceDiffPercent = Math.abs(priceDiff / level.price);

      // Strong levels within 2%
      if (level.level === 'strong' && priceDiffPercent < 0.02) {
        return { broken: true, level, confidence: 'high' };
      }

      // Medium levels within 1%
      if (level.level === 'medium' && priceDiffPercent < 0.01) {
        return { broken: true, level, confidence: 'medium' };
      }
    }

    return { broken: false, confidence: 'low' };
  }

  analyzeVolumeProfile(data: OHLCV[]): VolumeAnalysisResult {
    const profile = this.calculateVolumeProfile(data);
    const resistanceLevels = this.calculateResistanceLevels(data);
    const supportLevels = this.calculateSupportLevels(data);

    const totalProfileStrength = profile.reduce((sum, p) => sum + p.strength, 0) / profile.length;

    return {
      profile,
      resistanceLevels,
      supportLevels,
      volumeProfileStrength: totalProfileStrength,
    };
  }

  getVolumeProfileStrength(strength: number): 'strong' | 'medium' | 'weak' {
    if (strength >= 0.6) return 'strong';
    if (strength >= 0.3) return 'medium';
    return 'weak';
  }
}

export const volumeAnalysisService = new VolumeAnalysisService();