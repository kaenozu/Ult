'use client';

import { useState } from 'react';
import { useDashboardStore, WidgetType } from '@/app/store/dashboardStore';
import { Layout, Plus, Settings, Eye, EyeOff, Trash2 } from 'lucide-react';
import { Button } from '@/app/components/ui/Button';

const WIDGET_TYPES: { type: WidgetType; label: string }[] = [
  { type: 'chart', label: 'Price Chart' },
  { type: 'orderBook', label: 'Order Book' },
  { type: 'trades', label: 'Recent Trades' },
  { type: 'portfolio', label: 'Portfolio' },
  { type: 'watchlist', label: 'Watchlist' },
  { type: 'news', label: 'News Feed' },
  { type: 'signals', label: 'Trading Signals' },
  { type: 'performance', label: 'Performance' },
  { type: 'risk', label: 'Risk Metrics' },
];

export function DashboardCustomizer() {
  const {
    layouts,
    currentLayoutId,
    createLayout,
    deleteLayout,
    setCurrentLayout,
    addWidget,
    removeWidget,
    toggleWidgetVisibility,
    getCurrentLayout,
  } = useDashboardStore();

  const [isOpen, setIsOpen] = useState(false);
  const [showAddWidget, setShowAddWidget] = useState(false);
  const [newLayoutName, setNewLayoutName] = useState('');
  const [showCreateLayout, setShowCreateLayout] = useState(false);

  const currentLayout = getCurrentLayout();

  const handleCreateLayout = () => {
    if (newLayoutName.trim()) {
      createLayout(newLayoutName);
      setNewLayoutName('');
      setShowCreateLayout(false);
    }
  };

  const handleAddWidget = (type: WidgetType) => {
    if (currentLayoutId) {
      addWidget(currentLayoutId, {
        type,
        title: WIDGET_TYPES.find(w => w.type === type)?.label || type,
        x: 0,
        y: 0,
        width: 6,
        height: 4,
        visible: true,
      });
      setShowAddWidget(false);
    }
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        variant="ghost"
        className="fixed bottom-4 left-4 z-40"
      >
        <Layout className="w-5 h-5" />
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-[#1a2332] rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Layout className="w-6 h-6" />
              Dashboard Customization
            </h2>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Layouts Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Layouts</h3>
              {!showCreateLayout && (
                <Button
                  onClick={() => setShowCreateLayout(true)}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  New Layout
                </Button>
              )}
            </div>

            {showCreateLayout && (
              <div className="mb-3 p-3 bg-gray-800 rounded space-y-2">
                <input
                  type="text"
                  placeholder="Layout Name"
                  value={newLayoutName}
                  onChange={(e) => setNewLayoutName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 rounded text-white"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateLayout()}
                />
                <div className="flex gap-2">
                  <Button onClick={handleCreateLayout} size="sm" className="flex-1">
                    Create
                  </Button>
                  <Button
                    onClick={() => {
                      setShowCreateLayout(false);
                      setNewLayoutName('');
                    }}
                    size="sm"
                    variant="ghost"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {layouts.map((layout) => (
                <div
                  key={layout.id}
                  className={`p-3 rounded flex items-center justify-between ${
                    layout.id === currentLayoutId
                      ? 'bg-primary/20 border border-primary'
                      : 'bg-gray-800'
                  }`}
                >
                  <div>
                    <div className="font-semibold">{layout.name}</div>
                    <div className="text-xs text-gray-400">
                      {layout.widgets.length} widgets
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {layout.id !== currentLayoutId && (
                      <Button
                        onClick={() => setCurrentLayout(layout.id)}
                        size="sm"
                        variant="ghost"
                      >
                        Switch
                      </Button>
                    )}
                    {layout.id !== 'default' && (
                      <button
                        onClick={() => deleteLayout(layout.id)}
                        className="p-2 hover:bg-gray-700 rounded text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Widgets Section */}
          {currentLayout && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">Widgets</h3>
                {!showAddWidget && (
                  <Button
                    onClick={() => setShowAddWidget(true)}
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Widget
                  </Button>
                )}
              </div>

              {showAddWidget && (
                <div className="mb-3 p-3 bg-gray-800 rounded">
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    {WIDGET_TYPES.map((widget) => (
                      <button
                        key={widget.type}
                        onClick={() => handleAddWidget(widget.type)}
                        className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-left text-sm"
                      >
                        {widget.label}
                      </button>
                    ))}
                  </div>
                  <Button
                    onClick={() => setShowAddWidget(false)}
                    size="sm"
                    variant="ghost"
                    className="w-full"
                  >
                    Cancel
                  </Button>
                </div>
              )}

              {currentLayout.widgets.length === 0 ? (
                <p className="text-gray-400 text-center py-4">
                  No widgets in this layout
                </p>
              ) : (
                <div className="space-y-2">
                  {currentLayout.widgets.map((widget) => (
                    <div
                      key={widget.id}
                      className="p-3 bg-gray-800 rounded flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <div className="font-semibold">{widget.title}</div>
                        <div className="text-xs text-gray-400">
                          {widget.width}x{widget.height} at ({widget.x}, {widget.y})
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            currentLayoutId && toggleWidgetVisibility(currentLayoutId, widget.id)
                          }
                          className="p-2 hover:bg-gray-700 rounded"
                        >
                          {widget.visible ? (
                            <Eye className="w-4 h-4 text-green-500" />
                          ) : (
                            <EyeOff className="w-4 h-4 text-gray-500" />
                          )}
                        </button>
                        <button
                          onClick={() => currentLayoutId && removeWidget(currentLayoutId, widget.id)}
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
        </div>
      </div>
    </div>
  );
}
