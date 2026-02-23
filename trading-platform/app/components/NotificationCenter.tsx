import { useState, useEffect, useRef } from 'react';
import { useAlertStore } from '@/app/store/alertStore';

import { cn } from '@/app/lib/utils';
import { Bell, X, Settings, Trash2, Check, Filter, BellOff } from 'lucide-react';
import {
  getSeverityIcon,
  getSeverityColor,
  getTypeColor,
  formatTimestamp
} from '@/app/hooks/useAlertLogic';

interface NotificationCenterProps {
  _onClose?: () => void;  // Reserved for future use
}

export function NotificationCenter({ _onClose }: NotificationCenterProps) {
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
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsOpen(false);
        setShowSettings(false);
        buttonRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

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

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell Icon */}
      <button
        ref={buttonRef}
        onClick={handleToggleNotifications}
        className="relative p-2 hover:bg-[#233648] rounded-lg transition-colors"
        title="通知センター"
        aria-label="通知センター"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-controls="notification-dropdown"
      >
        {settings.enabled ? (
          <Bell className="w-5 h-5 text-[#92adc9]" />
        ) : (
          <BellOff className="w-5 h-5 text-[#92adc9]/50" />
        )}
        {unreadCount > 0 && settings.enabled && (
          <span data-testid="unread-badge" className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          id="notification-dropdown"
          className="absolute right-0 top-full mt-2 w-[480px] bg-[#141e27] rounded-lg border border-[#233648] shadow-2xl z-50 max-h-[600px] flex flex-col"
        >
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
                aria-label="設定"
              >
                <Settings className="w-4 h-4 text-[#92adc9]" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-[#233648] rounded transition-colors"
                title="閉じる"
                aria-label="閉じる"
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
                  <label htmlFor="notification-toggle" className="text-xs text-[#92adc9]">通知機能</label>
                  <button
                    id="notification-toggle"
                    role="switch"
                    aria-checked={settings.enabled}
                    onClick={() => updateSettings({ enabled: !settings.enabled })}
                    className={cn(
                      'w-12 h-6 rounded-full transition-colors relative focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-[#1a2632]',
                      settings.enabled ? 'bg-green-500' : 'bg-[#233648]'
                    )}
                  >
                    <span className="sr-only">通知機能を{settings.enabled ? '無効にする' : '有効にする'}</span>
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
                        <span id={`type-label-${key}`} className="text-xs text-white/80">{label}</span>
                        <button
                          role="switch"
                          aria-labelledby={`type-label-${key}`}
                          aria-checked={settings.types[key as keyof typeof settings.types]}
                          onClick={() => updateSettings({
                            types: { ...settings.types, [key]: !settings.types[key as keyof typeof settings.types] }
                          })}
                          className={cn(
                            'w-10 h-5 rounded-full transition-colors relative focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-[#1a2632]',
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
                        <span id={`severity-label-${key}`} className="text-xs text-white/80">{label}</span>
                        <button
                          role="switch"
                          aria-labelledby={`severity-label-${key}`}
                          aria-checked={settings.severities[key as keyof typeof settings.severities]}
                          onClick={() => updateSettings({
                            severities: { ...settings.severities, [key]: !settings.severities[key as keyof typeof settings.severities] }
                          })}
                          className={cn(
                            'w-10 h-5 rounded-full transition-colors relative focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-[#1a2632]',
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
                        <span id={`notify-label-${key}`} className="text-xs text-white/80">{label}</span>
                        <button
                          role="switch"
                          aria-labelledby={`notify-label-${key}`}
                          aria-checked={settings.notifications[key as keyof typeof settings.notifications]}
                          onClick={() => updateSettings({
                            notifications: { ...settings.notifications, [key]: !settings.notifications[key as keyof typeof settings.notifications] }
                          })}
                          className={cn(
                            'w-10 h-5 rounded-full transition-colors relative focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-[#1a2632]',
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
                  aria-pressed={filterType === value}
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
          <div className="flex-1 overflow-auto" role="list">
            {filteredAlerts.length === 0 ? (
              <div className="p-8 text-center text-[#92adc9] text-sm" role="status">
                {settings.enabled ? '通知はありません' : '通知機能が無効になっています'}
              </div>
            ) : (
              filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  role="listitem"
                  className="border-b border-[#233648]"
                >
                  <button
                    type="button"
                    className={cn(
                      'w-full text-left p-3 hover:bg-[#1a2632] transition-colors flex items-start gap-3',
                      !alert.acknowledged && 'bg-[#233648]/30',
                      alert.acknowledged ? 'cursor-default' : 'cursor-pointer'
                    )}
                    onClick={() => !alert.acknowledged && handleAcknowledge(alert.id)}
                  >
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
                          {formatTimestamp(alert.timestamp)}
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
                              信頼度: <span data-testid="alert-confidence">{alert.actionable.confidence}%</span>
                            </span>
                            {alert.actionable.targetPrice && (
                              <span className="text-xs text-[#92adc9]/60">
                                目標: <span data-testid="alert-target-price">{alert.actionable.targetPrice.toFixed(2)}</span>
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
                  </button>
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
