'use client';

import { useState, useEffect } from 'react';
import { useAlertNotificationStore } from '@/app/store/alertNotificationStore';
import { Bell, Plus, Settings, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';

export function AlertConditionManager() {
  const {
    conditions,
    alerts,
    channels,
    addCondition,
    updateCondition,
    removeCondition,
    toggleCondition,
    acknowledgeAlert,
    clearAcknowledgedAlerts,
    toggleChannel,
    initialize,
  } = useAlertNotificationStore();

  const [isOpen, setIsOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'conditions' | 'alerts' | 'channels'>('conditions');

  // Form state
  const [newCondition, setNewCondition] = useState({
    name: '',
    type: 'price' as 'price' | 'indicator' | 'portfolio' | 'risk',
    symbol: '',
    condition: '',
    threshold: 0,
    enabled: true,
  });

  useEffect(() => {
    initialize();
  }, [initialize]);

  const handleAddCondition = () => {
    if (newCondition.name && newCondition.condition) {
      addCondition(newCondition);
      setNewCondition({
        name: '',
        type: 'price',
        symbol: '',
        condition: '',
        threshold: 0,
        enabled: true,
      });
      setShowAddForm(false);
    }
  };

  const unacknowledgedCount = alerts.filter(a => !a.acknowledged).length;
  const enabledChannelCount = Array.from(channels.values()).filter(c => c.enabled).length;

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsOpen(true)}
          className="relative rounded-full p-3 bg-primary hover:bg-primary/90"
        >
          <Bell className="w-6 h-6" />
          {unacknowledgedCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {unacknowledgedCount}
            </span>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-[#1a2332] rounded-lg w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Bell className="w-6 h-6" />
              Alert Management
            </h2>
            <Button
              onClick={() => setIsOpen(false)}
              variant="ghost"
              className="text-gray-400 hover:text-white"
            >
              ✕
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setActiveTab('conditions')}
              className={`px-4 py-2 rounded ${
                activeTab === 'conditions'
                  ? 'bg-primary text-white'
                  : 'bg-gray-700 text-gray-300'
              }`}
            >
              Conditions ({conditions.length})
            </button>
            <button
              onClick={() => setActiveTab('alerts')}
              className={`px-4 py-2 rounded ${
                activeTab === 'alerts'
                  ? 'bg-primary text-white'
                  : 'bg-gray-700 text-gray-300'
              }`}
            >
              Alerts ({unacknowledgedCount})
            </button>
            <button
              onClick={() => setActiveTab('channels')}
              className={`px-4 py-2 rounded ${
                activeTab === 'channels'
                  ? 'bg-primary text-white'
                  : 'bg-gray-700 text-gray-300'
              }`}
            >
              Channels ({enabledChannelCount})
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Conditions Tab */}
          {activeTab === 'conditions' && (
            <div className="space-y-4">
              {!showAddForm && (
                <Button
                  onClick={() => setShowAddForm(true)}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add New Condition
                </Button>
              )}

              {showAddForm && (
                <div className="bg-gray-800 p-4 rounded space-y-3">
                  <h3 className="font-semibold">New Alert Condition</h3>
                  <input
                    type="text"
                    placeholder="Condition Name"
                    value={newCondition.name}
                    onChange={(e) => setNewCondition({ ...newCondition, name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 rounded text-white"
                  />
                  <select
                    value={newCondition.type}
                    onChange={(e) => setNewCondition({ ...newCondition, type: e.target.value as any })}
                    className="w-full px-3 py-2 bg-gray-700 rounded text-white"
                  >
                    <option value="price">Price Alert</option>
                    <option value="indicator">Technical Indicator</option>
                    <option value="portfolio">Portfolio Alert</option>
                    <option value="risk">Risk Alert</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Symbol (optional)"
                    value={newCondition.symbol}
                    onChange={(e) => setNewCondition({ ...newCondition, symbol: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 rounded text-white"
                  />
                  <input
                    type="text"
                    placeholder="Condition (e.g., price > 150)"
                    value={newCondition.condition}
                    onChange={(e) => setNewCondition({ ...newCondition, condition: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 rounded text-white"
                  />
                  <input
                    type="number"
                    placeholder="Threshold"
                    value={newCondition.threshold}
                    onChange={(e) => setNewCondition({ ...newCondition, threshold: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-gray-700 rounded text-white"
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleAddCondition} className="flex-1">
                      Add Condition
                    </Button>
                    <Button onClick={() => setShowAddForm(false)} variant="ghost" className="flex-1">
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {conditions.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No conditions defined yet</p>
              ) : (
                <div className="space-y-2">
                  {conditions.map((condition) => (
                    <div
                      key={condition.id}
                      className="bg-gray-800 p-3 rounded flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <div className="font-semibold">{condition.name}</div>
                        <div className="text-sm text-gray-400">
                          {condition.type} • {condition.condition}
                          {condition.symbol && ` • ${condition.symbol}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleCondition(condition.id, !condition.enabled)}
                          className="p-2 hover:bg-gray-700 rounded"
                        >
                          {condition.enabled ? (
                            <ToggleRight className="w-5 h-5 text-green-500" />
                          ) : (
                            <ToggleLeft className="w-5 h-5 text-gray-500" />
                          )}
                        </button>
                        <button
                          onClick={() => removeCondition(condition.id)}
                          className="p-2 hover:bg-gray-700 rounded text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Alerts Tab */}
          {activeTab === 'alerts' && (
            <div className="space-y-4">
              {alerts.length > 0 && (
                <Button
                  onClick={clearAcknowledgedAlerts}
                  className="w-full"
                  variant="ghost"
                >
                  Clear Acknowledged
                </Button>
              )}

              {alerts.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No alerts</p>
              ) : (
                <div className="space-y-2">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-3 rounded ${
                        alert.acknowledged ? 'bg-gray-800 opacity-50' : 'bg-gray-700'
                      } ${
                        alert.severity === 'critical'
                          ? 'border-l-4 border-red-500'
                          : alert.severity === 'warning'
                          ? 'border-l-4 border-yellow-500'
                          : 'border-l-4 border-blue-500'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-sm uppercase">
                            {alert.severity}
                          </div>
                          <div className="text-sm mt-1">{alert.message}</div>
                          <div className="text-xs text-gray-400 mt-1">
                            {new Date(alert.timestamp).toLocaleString()}
                          </div>
                        </div>
                        {!alert.acknowledged && (
                          <Button
                            onClick={() => acknowledgeAlert(alert.id)}
                            size="sm"
                            variant="ghost"
                          >
                            Acknowledge
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Channels Tab */}
          {activeTab === 'channels' && (
            <div className="space-y-2">
              {Array.from(channels.entries()).map(([type, channel]) => (
                <div
                  key={type}
                  className="bg-gray-800 p-3 rounded flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Settings className="w-5 h-5" />
                    <span className="font-semibold capitalize">{type}</span>
                  </div>
                  <button
                    onClick={() => toggleChannel(type, !channel.enabled)}
                    className="p-2 hover:bg-gray-700 rounded"
                  >
                    {channel.enabled ? (
                      <ToggleRight className="w-5 h-5 text-green-500" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-gray-500" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
