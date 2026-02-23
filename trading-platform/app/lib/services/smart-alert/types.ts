import { OHLCV } from '@/app/types';
import type { TechnicalIndicators } from '@/app/types';
import { ProcessedData } from '../high-frequency-data-processing-service';

export interface AlertCondition {
  type: 'price' | 'indicator' | 'volume' | 'pattern' | 'volatility' | 'correlation' | 'custom';
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'cross_above' | 'cross_below';
  threshold: number | string;
  source: 'current' | 'historical' | 'calculated';
  lookbackPeriod?: number;
  symbol?: string;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  conditions: AlertCondition[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  cooldownPeriod: number;
  enabled: boolean;
  actions: ('notify' | 'email' | 'sms' | 'execute_order' | 'log')[];
  createdAt: Date;
}

export interface AlertTrigger {
  ruleId: string;
  symbol: string;
  timestamp: Date;
  currentValue: number;
  threshold: number;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  notified: boolean;
}

export interface AlertNotification {
  id: string;
  trigger: AlertTrigger;
  method: 'popup' | 'email' | 'sms' | 'push';
  sentAt: Date;
  delivered: boolean;
  content: string;
}

export type { OHLCV, TechnicalIndicators, ProcessedData };
