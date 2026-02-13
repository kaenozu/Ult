import { useState, useMemo } from 'react';
import { useAlertStore } from '@/app/store/alertStore';
import { Alert, AlertSeverity, AlertType, AlertSettings } from '@/app/lib/alertTypes';
import { cn } from '@/app/lib/utils';
import { TrendingUp, TrendingDown, AlertTriangle, Check, X, Filter, Bell, Target, Zap, Activity, Settings } from 'lucide-react';
import {
  getSeverityColor as getSeverityColorBase,
  formatTimestamp,
  useAlertLogic
} from '@/app/hooks/useAlertLogic';

interface AlertPanelProps {
  symbol?: string;
  stockPrice?: number;
}

export function AlertPanel({ symbol, stockPrice }: AlertPanelProps) {
  const {
    alerts,
    unreadCount,
    settings,
    acknowledgeAlert,
    acknowledgeAll,
    updateSettings,
  } = useAlertStore();

  const [filterType, setFilterType] = useState<'ALL' | 'MARKET' | 'STOCK' | 'COMPOSITE'>('ALL');
  const [filterSeverity, setFilterSeverity] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [showSettings, setShowSettings] = useState(false);
  
  const {
    getSeverityIconComponent,
    getTypeIconComponent,
    getTrendIconComponent
  } = useAlertLogic();

  const getSeverityIcon = (severity: AlertSeverity) => {
    const Icon = getSeverityIconComponent(severity);
    switch (severity) {
      case 'HIGH':
        return <Icon className="w-4 h-4 text-red-400" />;
      case 'MEDIUM':
        return <Icon className="w-4 h-4 text-yellow-400" />;
      case 'LOW':
        return <Icon className="w-4 h-4 text-blue-400" />;
    }
  };

  const getSeverityColor = (severity: AlertSeverity) => {
    switch (severity) {
      case 'HIGH':
        return 'bg-red-500/20 border-red-500/30';
      case 'MEDIUM':
        return 'bg-yellow-500/20 border-yellow-500/30';
      case 'LOW':
        return 'bg-blue-500/20 border-blue-500/30';
    }
  };

  const getTypeIcon = (type: AlertType) => {
    const Icon = getTypeIconComponent(type);
    switch (type) {
      case 'MARKET':
        return <Icon className="w-4 h-4 text-purple-400" />;
      case 'STOCK':
        return <Icon className="w-4 h-4 text-green-400" />;
      case 'COMPOSITE':
        return <Icon className="w-4 h-4 text-orange-400" />;
    }
  };

  const getTrendIcon = (trend: 'UP' | 'DOWN' | 'NEUTRAL') => {
    const Icon = getTrendIconComponent(trend);
    switch (trend) {
      case 'UP':
        return <Icon className="w-3 h-3 text-green-400" />;
      case 'DOWN':
        return <Icon className="w-3 h-3 text-red-400" />;
      case 'NEUTRAL':
        return <Icon className="w-3 h-3 text-gray-400" />;
    }
  };

  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      if (symbol && alert.symbol !== symbol) return false;

      if (filterType !== 'ALL' && alert.type !== filterType) return false;

      if (filterSeverity !== 'ALL' && alert.severity !== filterSeverity) return false;

      return true;
    });
  }, [alerts, symbol, filterType, filterSeverity]);

  const unreadAlerts = useMemo(() => {
    return filteredAlerts.filter(a => !a.acknowledged);
  }, [filteredAlerts]);

  const handleAcknowledge = (id: string) => {
    acknowledgeAlert(id);
  };

  const handleAcknowledgeAll = () => {
    acknowledgeAll();
  };

  const handleUpdateSettings = (key: keyof typeof settings, value: Partial<AlertSettings[keyof typeof settings]>) => {
    updateSettings({ [key]: value } as Partial<AlertSettings>);
  };

  return (
    <div className="bg-[#141e27] rounded-lg border border-[#233648] overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-[#233648] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#92adc9]" />
          <h3 className="text-sm font-bold text-white">アラートパネル</h3>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1.5 hover:bg-[#233648] rounded transition-colors"
            title="設定"
          >
            <Settings className="w-4 h-4 text-[#92adc9]" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-4 border-b border-[#233648] bg-[#1a2632]">
          <div className="space-y-4">
            {/* Main Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white">通知機能</div>
                <div className="text-[10px] text-[#92adc9]/60">
                  全ての通知を有効/無効
                </div>
              </div>
              <button
                data-testid="notifications-enabled-toggle"
                onClick={() => handleUpdateSettings('enabled', !settings.enabled)}
                className={cn(
                  'w-14 h-7 rounded-full transition-colors relative',
                  settings.enabled ? 'bg-green-500' : 'bg-[#233648]'
                )}
              >
                <div
                  className={cn(
                    'absolute top-0.5 w-6 h-6 bg-white rounded-full transition-transform shadow-lg',
                    settings.enabled ? 'translate-x-7' : 'translate-x-0.5'
                  )}
                />
              </button>
            </div>

            {/* Type Filters */}
            <div>
              <div className="text-xs font-bold text-white mb-2">通知種類</div>
              <div className="space-y-2">
                {[
                  { key: 'MARKET', label: '市場イベント', icon: Activity },
                  { key: 'STOCK', label: '銘柄イベント', icon: Target },
                  { key: 'COMPOSITE', label: '複合シグナル', icon: Zap },
                ].map(({ key, label, icon: Icon }) => (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-[#92adc9]" />
                      <span className="text-xs text-white/80">{label}</span>
                    </div>
                    <button
                      onClick={() => handleUpdateSettings('types', {
                        ...settings.types,
                        [key]: !settings.types[key as keyof typeof settings.types]
                      })}
                      className={cn(
                        'w-11 h-6 rounded-full transition-colors relative',
                        settings.types[key as keyof typeof settings.types] ? 'bg-green-500' : 'bg-[#233648]'
                      )}
                    >
                      <div
                        className={cn(
                          'absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow',
                          settings.types[key as keyof typeof settings.types] ? 'translate-x-5.5' : 'translate-x-0.5'
                        )}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Severity Filters */}
            <div>
              <div className="text-xs font-bold text-white mb-2">優先度フィルター</div>
              <div className="space-y-2">
                {[
                  { key: 'HIGH', label: '🔴 高', color: 'red' },
                  { key: 'MEDIUM', label: '🟡 中', color: 'yellow' },
                  { key: 'LOW', label: '🟢 低', color: 'green' },
                ].map(({ key, label, color }) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-xs text-white/80">{label}</span>
                    <button
                      onClick={() => handleUpdateSettings('severities', {
                        ...settings.severities,
                        [key]: !settings.severities[key as keyof typeof settings.severities]
                      })}
                      className={cn(
                        'w-11 h-6 rounded-full transition-colors relative',
                        settings.severities[key as keyof typeof settings.severities] ? `bg-${color}-500` : 'bg-[#233648]'
                      )}
                    >
                      <div
                        className={cn(
                          'absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow',
                          settings.severities[key as keyof typeof settings.severities] ? 'translate-x-5.5' : 'translate-x-0.5'
                        )}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Notification Options */}
            <div>
              <div className="text-xs font-bold text-white mb-2">通知設定</div>
              <div className="space-y-2">
                {[
                  { key: 'sound', label: 'サウンド' },
                  { key: 'popup', label: 'ポップアップ' },
                  { key: 'push', label: 'プッシュ通知' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-xs text-white/80">{label}</span>
                    <button
                      onClick={() => handleUpdateSettings('notifications', {
                        ...settings.notifications,
                        [key]: !settings.notifications[key as keyof typeof settings.notifications]
                      })}
                      className={cn(
                        'w-11 h-6 rounded-full transition-colors relative',
                        settings.notifications[key as keyof typeof settings.notifications] ? 'bg-green-500' : 'bg-[#233648]'
                      )}
                    >
                      <div
                        className={cn(
                          'absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow',
                          settings.notifications[key as keyof typeof settings.notifications] ? 'translate-x-5.5' : 'translate-x-0.5'
                        )}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      {!showSettings && (
        <div className="p-2 border-b border-[#233648] bg-[#1a2632]">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#92adc9]" />
            <div className="flex-1 flex items-center gap-1">
              {[
                { value: 'ALL' as const, label: '全て' },
                { value: 'MARKET' as const, label: '市場' },
                { value: 'STOCK' as const, label: '銘柄' },
                { value: 'COMPOSITE' as const, label: '複合' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setFilterType(value)}
                  className={cn(
                    'px-2.5 py-1 text-xs rounded transition-colors',
                    filterType === value
                      ? 'bg-[#233648] text-white'
                      : 'text-[#92adc9] hover:bg-[#233648]/50'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="w-px h-4 bg-[#233648]/30 mx-2" />
            <div className="flex items-center gap-1">
              {[
                { value: 'ALL' as const, label: '全て' },
                { value: 'HIGH' as const, label: '🔴' },
                { value: 'MEDIUM' as const, label: '🟡' },
                { value: 'LOW' as const, label: '🟢' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setFilterSeverity(value)}
                  className={cn(
                    'px-2.5 py-1 text-xs rounded transition-colors',
                    filterSeverity === value
                      ? 'bg-[#233648] text-white'
                      : 'text-[#92adc9] hover:bg-[#233648]/50'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Unread Alerts Header */}
      {!showSettings && unreadAlerts.length > 0 && (
        <div className="px-4 py-2 bg-[#233648]/20 border-b border-[#233648]/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-orange-400" />
              <span data-testid="unread-count-text" className="text-xs font-bold text-white">
                未読アラート: {unreadAlerts.length}件
              </span>
            </div>
            <button
              onClick={handleAcknowledgeAll}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              <Check className="w-3 h-3" />
              全既読
            </button>
          </div>
        </div>
      )}

      {/* Alerts List */}
      <div className="flex-1 overflow-auto max-h-[500px]">
        {!showSettings && filteredAlerts.length === 0 ? (
          <div className="p-8 text-center">
            <Bell className="w-12 h-12 text-[#92adc9]/30 mx-auto mb-3" />
            <div className="text-sm text-[#92adc9]">アラートはありません</div>
            <div className="text-xs text-[#92adc9]/50 mt-1">
              {settings.enabled ? '新しいアラートを待機中' : '通知機能が無効です'}
            </div>
          </div>
        ) : !showSettings ? (
          filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={cn(
                'p-4 border-b border-[#233648] hover:bg-[#1a2632] transition-colors cursor-pointer',
                !alert.acknowledged && 'bg-[#233648]/30'
              )}
              onClick={() => !alert.acknowledged && handleAcknowledge(alert.id)}
            >
              {/* Alert Header */}
              <div className="flex items-start gap-3 mb-2">
                {/* Type Icon */}
                <div className="flex-shrink-0">
                  {getTypeIcon(alert.type)}
                </div>

                {/* Main Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {/* Severity Badge */}
                    <div className={cn(
                      'px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 border',
                      getSeverityColor(alert.severity)
                    )}>
                      {getSeverityIcon(alert.severity)}
                      <span>
                        {alert.severity === 'HIGH' ? '高優先度' :
                          alert.severity === 'MEDIUM' ? '中優先度' :
                            '低優先度'}
                      </span>
                    </div>

                    {/* Symbol Badge */}
                    {alert.symbol && (
                      <span className="px-2 py-0.5 bg-[#233648] rounded text-[10px] font-bold text-white">
                        {alert.symbol}
                      </span>
                    )}

                    {/* Time */}
                    <span className="text-[10px] text-[#92adc9]/60 ml-auto">
                      {formatTimestamp(alert.timestamp)}
                    </span>
                  </div>

                  {/* Title */}
                  <div className="text-sm font-bold text-white/90 mb-1">
                    {alert.title}
                  </div>

                  {/* Message */}
                  <div className="text-xs text-[#92adc9] leading-relaxed">
                    {alert.message}
                  </div>
                </div>

                {/* Acknowledge Button */}
                {!alert.acknowledged && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAcknowledge(alert.id);
                    }}
                    className="flex-shrink-0 p-1.5 hover:bg-[#233648] rounded transition-colors"
                    title="既読にする"
                  >
                    <Check className="w-4 h-4 text-green-400" />
                  </button>
                )}
              </div>

              {/* Actionable Info */}
              {alert.actionable && (
                <div className="mt-3 pt-2 border-t border-[#233648]/30">
                  <div className="flex items-center gap-2">
                    {/* Action Type */}
                    <div className={cn(
                      'px-2.5 py-1 rounded text-[10px] font-bold',
                      alert.actionable.type === 'BUY' ? 'bg-green-500/20 text-green-400' :
                        alert.actionable.type === 'SELL' ? 'bg-red-500/20 text-red-400' :
                          'bg-[#233648]/50 text-[#92adc9]'
                    )}>
                      {alert.actionable.type === 'BUY' ? '買い' :
                        alert.actionable.type === 'SELL' ? '売り' :
                          '維持'}
                    </div>

                    {/* Confidence */}
                    <div className="text-xs text-[#92adc9]">
                      信頼度: <span data-testid="alert-confidence" className="font-bold text-white">{alert.actionable.confidence}%</span>
                    </div>

                    {/* Target/Stop Loss */}
                    {alert.actionable.targetPrice && (
                      <div className="text-xs text-[#92adc9]">
                        目標: <span data-testid="alert-target-price">{alert.actionable.targetPrice.toFixed(2)}</span>
                      </div>
                    )}
                    {alert.actionable.stopLoss && (
                      <div className="text-xs text-[#92adc9]">
                        損切: <span data-testid="alert-stop-loss">{alert.actionable.stopLoss.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Acknowledged Badge */}
              {alert.acknowledged && (
                <div className="text-[10px] text-[#92adc9]/50 mt-2 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  既読
                </div>
              )}
            </div>
          ))
        ) : null}
      </div>

      {/* Footer */}
      {!showSettings && filteredAlerts.length > 0 && (
        <div className="p-2 border-t border-[#233648] bg-[#1a2632] text-center">
          <div className="text-[10px] text-[#92adc9]/60">
            最新50件を表示中
          </div>
        </div>
      )}
    </div>
  );
}
