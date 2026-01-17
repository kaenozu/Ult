/**
 * Shared TypeScript type definitions
 */

// API Response Types
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
  timestamp: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Trading Types
export interface Position {
  id: string;
  ticker: string;
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercentage: number;
  marketValue: number;
  timestamp: string;
}

export interface Trade {
  id: string;
  ticker: string;
  type: "buy" | "sell";
  quantity: number;
  price: number;
  timestamp: string;
  strategy?: string;
}

export interface Portfolio {
  totalValue: number;
  cash: number;
  positions: Position[];
  pnl: number;
  pnlPercentage: number;
  lastUpdated: string;
}

// Market Data Types
export interface MarketData {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: string;
}

export interface RegimeData {
  current_regime: string;
  strategy: {
    strategy: string;
    position_size: number;
    stop_loss: number;
    take_profit: number;
  };
  statistics: {
    current_regime: string;
    total_observations: number;
    regime_counts: Record<string, number>;
    regime_percentages: Record<string, number>;
    most_common_regime: string;
  };
}

// WebSocket Types
export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp?: string;
}

export interface RegimeUpdateMessage extends WebSocketMessage {
  type: "regime_update";
  data: RegimeData;
}

// UI Component Props Types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface CardProps extends BaseComponentProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export interface ButtonProps extends BaseComponentProps {
  variant?: "primary" | "secondary" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
}

export interface TableProps<T = any> extends BaseComponentProps {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  emptyMessage?: string;
}

export interface TableColumn<T> {
  key: keyof T;
  header: string;
  render?: (value: any, row: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

// Hook Types
export interface UseApiRequestResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  execute: (options?: RequestInit) => Promise<T>;
  refetch: () => Promise<T>;
}

export interface UseWebSocketResult {
  isConnected: boolean;
  lastMessage: any;
  sendMessage: (data: any) => void;
  reconnect: () => void;
  disconnect: () => void;
}

// Utility Types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<
  T,
  Exclude<keyof T, Keys>
> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
  }[Keys];

// Event Types
export interface CustomEventMap {
  "regime-change": CustomEvent<RegimeData>;
  "position-update": CustomEvent<Position>;
  "market-data-update": CustomEvent<MarketData>;
}

declare global {
  interface WindowEventMap extends CustomEventMap {}
}

// Error Types
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: any,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class WebSocketError extends Error {
  constructor(
    message: string,
    public code?: number,
    public reason?: string,
  ) {
    super(message);
    this.name = "WebSocketError";
  }
}

// Configuration Types
export interface AppConfig {
  api: {
    baseUrl: string;
    timeout: number;
  };
  websocket: {
    url: string;
    reconnectInterval: number;
  };
  trading: {
    defaultPositionSize: number;
    maxPositionSize: number;
    riskPerTrade: number;
  };
  ui: {
    theme: "light" | "dark" | "auto";
    language: string;
    currency: string;
  };
}
