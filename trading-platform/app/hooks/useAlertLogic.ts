import { AlertSeverity, AlertType } from '@/app/lib/alertTypes';
import {
  AlertTriangle,
  Clock,
  Bell,
  Activity,
  Target,
  Zap,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';

export function getSeverityIcon(severity: AlertSeverity): string {
  switch (severity) {
    case 'HIGH':
      return '🔴';
    case 'MEDIUM':
      return '🟡';
    case 'LOW':
      return '🟢';
  }
}

export function getSeverityColor(severity: AlertSeverity): string {
  switch (severity) {
    case 'HIGH':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'MEDIUM':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'LOW':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  }
}

export function getTypeColor(type: AlertType): string {
  switch (type) {
    case 'MARKET':
      return 'text-purple-400';
    case 'STOCK':
      return 'text-green-400';
    case 'COMPOSITE':
      return 'text-orange-400';
  }
}

export function getTypeLabel(type: AlertType): string {
  switch (type) {
    case 'MARKET':
      return '市場';
    case 'STOCK':
      return '銘柄';
    case 'COMPOSITE':
      return '複合';
  }
}

export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60000) return 'たった今';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}時間前`;
  return `${Math.floor(diff / 86400000)}日前`;
}

export function useAlertLogic() {
  return {
    getSeverityIcon,
    getSeverityColor,
    getTypeColor,
    getTypeLabel,
    formatTimestamp,
    getSeverityIconComponent: (severity: AlertSeverity) => {
      switch (severity) {
        case 'HIGH':
          return AlertTriangle;
        case 'MEDIUM':
          return Clock;
        case 'LOW':
          return Bell;
      }
    },
    getTypeIconComponent: (type: AlertType) => {
      switch (type) {
        case 'MARKET':
          return Activity;
        case 'STOCK':
          return Target;
        case 'COMPOSITE':
          return Zap;
      }
    },
    getTrendIconComponent: (trend: 'UP' | 'DOWN' | 'NEUTRAL') => {
      switch (trend) {
        case 'UP':
          return TrendingUp;
        case 'DOWN':
          return TrendingDown;
        case 'NEUTRAL':
          return Minus;
      }
    }
  };
}
