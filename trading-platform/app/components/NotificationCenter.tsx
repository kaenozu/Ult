import { useState, useEffect, useRef } from 'react';
import { useAlertStore } from '@/app/store/alertStore';
import { Alert, AlertSeverity, AlertSettings } from '@/app/lib/alertTypes';
import { cn } from '@/app/lib/utils';
import { Bell, X, Settings, Trash2, Check, Filter, BellOff } from 'lucide-react';

interface NotificationCenterProps {
  onClose?: () => void;
}

export function NotificationCenter({ onClose }: NotificationCenterProps) {
  const {
    alerts,
    unreadCount,
    settings,
    acknowledgeAlert,
    acknowledgeAll,
    updateSettings,
    clearAcknowledged,
  } = useAlertStore();

  const [isOpen, setIsOpen] = useState(false);
  const [filterType, setFilterType] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [showSettings, setShowSettings] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowSettings(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getSeverityColor = (severity: AlertSeverity) => {
    switch (severity) {
      case 'HIGH':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'MEDIUM':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'LOW':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  const getSeverityIcon = (severity: AlertSeverity) => {
    switch (severity) {
      case 'HIGH':
        return '🔴';
      case 'MEDIUM':
        return '🟡';
      case 'LOW':
        return '🟢';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'MARKET':
        return 'text-purple-400';
      case 'STOCK':
        return 'text-green-400';
      case 'COMPOSITE':
        return 'text-orange-400';
      default:
        return 'text-gray-400';
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filterType === 'ALL') return true;
    return alert.severity === filterType;
  });

  const handleToggleNotifications = () => {
    setIsOpen(!isOpen);
    setShowSettings(false);
  };

  const handleAcknowledge = (id: string) => {
    acknowledgeAlert(id);
  };

  const handleAcknowledgeAll = () => {
    acknowledgeAll();
  };

  const handleClearAcknowledged = () => {
    clearAcknowledged();
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return 'たった今';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}時間前`;
    return `${Math.floor(diff / 86400000)}日前`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell Icon */}
      <button
        onClick={handleToggleNotifications}
        className="relative p-2 hover:bg-[#233648] rounded-lg transition-colors"
        title="通知センター"
      >
        {settings.enabled ? (
          <Bell className="w-5 h-5 text-[#92adc9]" />
        ) : (
          <BellOff className="w-5 h-5 text-[#92adc9]/50" />
        )}
        {unreadCount > 0 && settings.enabled && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[480px] bg-[#141e27] rounded-lg border border-[#233648] shadow-2xl z-50 max-h-[600px] flex flex-col">
          {/* Header */}
          <div className="p-3 border-b border-[#233648] flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Bell className="w-4 h-4" />
              通知センター
            </h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleAcknowledgeAll}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  title="すべて既読にする"
                >
                  <Check className="w-3 h-3" />
                  全既読
                </button>
              )}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-1.5 hover:bg-[#233648] rounded transition-colors"
                title="設定"
              >
                <Settings className="w-4 h-4 text-[#92adc9]" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-[#233648] rounded transition-colors"
                title="閉じる"
              >
                <X className="w-4 h-4 text-[#92adc9]" />
              </button>
            </div>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="p-3 border-b border-[#233648] bg-[#1a2632]">
              <div className="space-y-3">
                {/* Main Toggle */}
                <div className="flex items-center justify-between">
                  <label className="text-xs text-[#92adc9]">通知機能</label>
                  <button
                    onClick={() => updateSettings({ enabled: !settings.enabled })}
                    className={cn(
                      'w-12 h-6 rounded-full transition-colors relative',
                      settings.enabled ? 'bg-green-500' : 'bg-[#233648]'
                    )}
                  >
                    <div
                      className={cn(
                        'absolute top-1 w-4 h-4 bg-white rounded-full transition-transform',
                        settings.enabled ? 'translate-x-6' : 'translate-x-1'
                      )}
                    />
                  </button>
                </div>

                {/* Type Filters */}
                <div>
                  <label className="text-xs text-[#92adc9] mb-2 block">通知種類</label>
                  <div className="space-y-1">
                    {[
                      { key: 'MARKET', label: '市場イベント' },
                      { key: 'STOCK', label: '銘柄イベント' },
                      { key: 'COMPOSITE', label: '複合シグナル' },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-xs text-white/80">{label}</span>
                        <button
                          onClick={() => updateSettings({
                            types: { ...settings.types, [key]: !settings.types[key as keyof typeof settings.types] }
                          })}
                          className={cn(
                            'w-10 h-5 rounded-full transition-colors relative',
                            settings.types[key as keyof typeof settings.types] ? 'bg-green-500' : 'bg-[#233648]'
                          )}
                        >
                          <div
                            className={cn(
                              'absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform',
                              settings.types[key as keyof typeof settings.types] ? 'translate-x-5' : 'translate-x-0.5'
                            )}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Severity Filters */}
                <div>
                  <label className="text-xs text-[#92adc9] mb-2 block">優先度フィルター</label>
                  <div className="space-y-1">
                    {[
                      { key: 'HIGH', label: '🔴 高' },
                      { key: 'MEDIUM', label: '🟡 中' },
                      { key: 'LOW', label: '🟢 低' },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-xs text-white/80">{label}</span>
                        <button
                          onClick={() => updateSettings({
                            severities: { ...settings.severities, [key]: !settings.severities[key as keyof typeof settings.severities] }
                          })}
                          className={cn(
                            'w-10 h-5 rounded-full transition-colors relative',
                            settings.severities[key as keyof typeof settings.severities] ? 'bg-green-500' : 'bg-[#233648]'
                          )}
                        >
                          <div
                            className={cn(
                              'absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform',
                              settings.severities[key as keyof typeof settings.severities] ? 'translate-x-5' : 'translate-x-0.5'
                            )}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notification Settings */}
                <div>
                  <label className="text-xs text-[#92adc9] mb-2 block">通知設定</label>
                  <div className="space-y-1">
                    {[
                      { key: 'sound', label: 'サウンド' },
                      { key: 'popup', label: 'ポップアップ' },
                      { key: 'push', label: 'プッシュ通知' },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-xs text-white/80">{label}</span>
                        <button
                          onClick={() => updateSettings({
                            notifications: { ...settings.notifications, [key]: !settings.notifications[key as keyof typeof settings.notifications] }
                          })}
                          className={cn(
                            'w-10 h-5 rounded-full transition-colors relative',
                            settings.notifications[key as keyof typeof settings.notifications] ? 'bg-green-500' : 'bg-[#233648]'
                          )}
                        >
                          <div
                            className={cn(
                              'absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform',
                              settings.notifications[key as keyof typeof settings.notifications] ? 'translate-x-5' : 'translate-x-0.5'
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
            <div className="p-2 border-b border-[#233648] bg-[#1a2632] flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#92adc9]" />
              {[
                { value: 'ALL' as const, label: '全て' },
                { value: 'HIGH' as const, label: '🔴 高' },
                { value: 'MEDIUM' as const, label: '🟡 中' },
                { value: 'LOW' as const, label: '🟢 低' },
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
              <div className="flex-1" />
              {alerts.length > 0 && (
                <button
                  onClick={handleClearAcknowledged}
                  className="text-xs text-[#92adc9] hover:text-white flex items-center gap-1"
                  title="既読を削除"
                >
                  <Trash2 className="w-3 h-3" />
                  クリア
                </button>
              )}
            </div>
          )}

          {/* Alerts List */}
          <div className="flex-1 overflow-auto">
            {filteredAlerts.length === 0 ? (
              <div className="p-8 text-center text-[#92adc9] text-sm">
                {settings.enabled ? '通知はありません' : '通知機能が無効になっています'}
              </div>
            ) : (
              filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    'p-3 border-b border-[#233648] hover:bg-[#1a2632] transition-colors cursor-pointer',
                    !alert.acknowledged && 'bg-[#233648]/30'
                  )}
                  onClick={() => !alert.acknowledged && handleAcknowledge(alert.id)}
                >
                  <div className="flex items-start gap-3">
                    {/* Severity Icon */}
                    <div className={cn(
                      'w-8 h-8 rounded flex items-center justify-center text-lg flex-shrink-0',
                      getSeverityColor(alert.severity)
                    )}>
                      {getSeverityIcon(alert.severity)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {/* Type Badge */}
                        <span className={cn('text-[10px] font-bold uppercase', getTypeColor(alert.type))}>
                          {alert.type === 'MARKET' ? '市場' :
                           alert.type === 'STOCK' ? '銘柄' :
                           alert.type === 'COMPOSITE' ? '複合' : ''}
                        </span>

                        {/* Time */}
                        <span className="text-[10px] text-[#92adc9]/60 ml-auto">
                          {formatTime(alert.timestamp)}
                        </span>
                      </div>

                      {/* Symbol */}
                      {alert.symbol && (
                        <div className="text-xs font-bold text-white/90 mb-1">
                          {alert.symbol}
                        </div>
                      )}

                      {/* Title & Message */}
                      <div className="text-sm text-[#92adc9] leading-relaxed">
                        <div className="font-medium text-white/90 mb-1">{alert.title}</div>
                        <div className="text-xs">{alert.message}</div>
                      </div>

                      {/* Actionable Info */}
                      {alert.actionable && (
                        <div className="mt-2 pt-2 border-t border-[#233648]/30">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              'px-2 py-0.5 rounded text-[10px] font-bold',
                              alert.actionable.type === 'BUY' ? 'bg-green-500/20 text-green-400' :
                              alert.actionable.type === 'SELL' ? 'bg-red-500/20 text-red-400' :
                              'bg-[#233648]/50 text-[#92adc9]'
                            )}>
                              {alert.actionable.type === 'BUY' ? '買い' :
                               alert.actionable.type === 'SELL' ? '売り' :
                               '維持'}
                            </span>
                            <span className="text-xs text-[#92adc9]">
                              信頼度: {alert.actionable.confidence}%
                            </span>
                            {alert.actionable.targetPrice && (
                              <span className="text-xs text-[#92adc9]/60">
                                目標: {alert.actionable.targetPrice.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Acknowledged Status */}
                      {alert.acknowledged && (
                        <div className="text-[10px] text-[#92adc9]/50 mt-1">
                          ✓ 既読
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {filteredAlerts.length > 0 && !showSettings && (
            <div className="p-2 border-t border-[#233648] bg-[#1a2632] text-center">
              <div className="text-[10px] text-[#92adc9]/60">
                最新50件を表示中
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
