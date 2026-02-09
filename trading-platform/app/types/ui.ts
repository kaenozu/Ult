/**
 * UI and State Related Type Definitions
 */

import { Stock } from './stock';

export interface HeatmapSector {
  name: string;
  change: number;
  stocks: Stock[];
}

export interface ScreenerFilter {
  minPrice?: number;
  maxPrice?: number;
  minChange?: number;
  maxChange?: number;
  minVolume?: number;
  sectors?: string[];
  markets?: ('japan' | 'usa')[];
}

export type Theme = 'dark' | 'light';

/**
 * Alert configuration
 */
export interface AlertConfig {
  enabled: boolean;
  priceThreshold?: number;
  volumeThreshold?: number;
  changeThreshold?: number;
  indicators?: Record<string, number>;
  condition?: 'above' | 'below' | 'equals' | 'crosses';
  notificationChannels?: string[];
  cooldown?: number; // Minutes between alerts
}

/**
 * Alert data payload
 */
export interface AlertData {
  symbol: string;
  type: 'PRICE' | 'VOLUME' | 'INDICATOR' | 'SIGNAL';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  value?: number;
  threshold?: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}
