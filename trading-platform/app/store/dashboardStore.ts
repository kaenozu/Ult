import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type WidgetType = 
  | 'chart'
  | 'orderBook'
  | 'trades'
  | 'portfolio'
  | 'watchlist'
  | 'news'
  | 'signals'
  | 'performance'
  | 'risk';

export interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
}

export interface DashboardLayout {
  id: string;
  name: string;
  widgets: Widget[];
}

interface DashboardState {
  layouts: DashboardLayout[];
  currentLayoutId: string | null;
  
  // Layout management
  createLayout: (name: string) => string;
  deleteLayout: (id: string) => void;
  setCurrentLayout: (id: string) => void;
  renameLayout: (id: string, name: string) => void;
  
  // Widget management
  addWidget: (layoutId: string, widget: Omit<Widget, 'id'>) => string;
  removeWidget: (layoutId: string, widgetId: string) => void;
  updateWidget: (layoutId: string, widgetId: string, updates: Partial<Widget>) => void;
  toggleWidgetVisibility: (layoutId: string, widgetId: string) => void;
  
  // Get current layout
  getCurrentLayout: () => DashboardLayout | null;
}

const DEFAULT_LAYOUT: DashboardLayout = {
  id: 'default',
  name: 'Default Layout',
  widgets: [
    {
      id: 'chart-1',
      type: 'chart',
      title: 'Price Chart',
      x: 0,
      y: 0,
      width: 8,
      height: 6,
      visible: true,
    },
    {
      id: 'orderbook-1',
      type: 'orderBook',
      title: 'Order Book',
      x: 8,
      y: 0,
      width: 4,
      height: 6,
      visible: true,
    },
    {
      id: 'portfolio-1',
      type: 'portfolio',
      title: 'Portfolio',
      x: 0,
      y: 6,
      width: 6,
      height: 4,
      visible: true,
    },
    {
      id: 'watchlist-1',
      type: 'watchlist',
      title: 'Watchlist',
      x: 6,
      y: 6,
      width: 6,
      height: 4,
      visible: true,
    },
  ],
};

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      layouts: [DEFAULT_LAYOUT],
      currentLayoutId: 'default',

      createLayout: (name) => {
        const id = `layout-${Date.now()}`;
        const newLayout: DashboardLayout = {
          id,
          name,
          widgets: [],
        };

        set((state) => ({
          layouts: [...state.layouts, newLayout],
          currentLayoutId: id,
        }));

        return id;
      },

      deleteLayout: (id) => {
        set((state) => {
          const layouts = state.layouts.filter(l => l.id !== id);
          const currentLayoutId = state.currentLayoutId === id
            ? (layouts[0]?.id || null)
            : state.currentLayoutId;

          return { layouts, currentLayoutId };
        });
      },

      setCurrentLayout: (id) => {
        set({ currentLayoutId: id });
      },

      renameLayout: (id, name) => {
        set((state) => ({
          layouts: state.layouts.map(l =>
            l.id === id ? { ...l, name } : l
          ),
        }));
      },

      addWidget: (layoutId, widget) => {
        const id = `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newWidget: Widget = { ...widget, id };

        set((state) => ({
          layouts: state.layouts.map(l =>
            l.id === layoutId
              ? { ...l, widgets: [...l.widgets, newWidget] }
              : l
          ),
        }));

        return id;
      },

      removeWidget: (layoutId, widgetId) => {
        set((state) => ({
          layouts: state.layouts.map(l =>
            l.id === layoutId
              ? { ...l, widgets: l.widgets.filter(w => w.id !== widgetId) }
              : l
          ),
        }));
      },

      updateWidget: (layoutId, widgetId, updates) => {
        set((state) => ({
          layouts: state.layouts.map(l =>
            l.id === layoutId
              ? {
                  ...l,
                  widgets: l.widgets.map(w =>
                    w.id === widgetId ? { ...w, ...updates } : w
                  ),
                }
              : l
          ),
        }));
      },

      toggleWidgetVisibility: (layoutId, widgetId) => {
        set((state) => ({
          layouts: state.layouts.map(l =>
            l.id === layoutId
              ? {
                  ...l,
                  widgets: l.widgets.map(w =>
                    w.id === widgetId ? { ...w, visible: !w.visible } : w
                  ),
                }
              : l
          ),
        }));
      },

      getCurrentLayout: () => {
        const state = get();
        return state.layouts.find(l => l.id === state.currentLayoutId) || null;
      },
    }),
    {
      name: 'dashboard-storage',
    }
  )
);
