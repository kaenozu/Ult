// Strictly Typed WebSocket Architecture - Frontend Types
// Phase 3: Realtime Synapse

// ============================================================================
// TYPE LITERALS (Discriminator pattern)
// ============================================================================

export type WsDirection = "c2s" | "s2c";

// Client → Server
export type ClientToServerMessageType =
  | "subscribe"
  | "unsubscribe"
  | "ping"
  | "get_status";

// Server → Client Events
export type ServerToClientEventMessageType =
  | "regime_update"
  | "price_alert"
  | "portfolio_update"
  | "trade_execution"
  | "system_alert";

// Control Flow
export type ControlFlowMessageType =
  | "pong"
  | "subscription_confirmed"
  | "status_response";

// Error
export type ErrorMessageType = "error";

// All server responses
export type ServerToClientMessageType =
  | ServerToClientEventMessageType
  | ControlFlowMessageType
  | ErrorMessageType;

// ============================================================================
// MARKET REGIME ENUM
// ============================================================================

export enum MarketRegime {
  BULL = "BULL",
  BEAR = "BEAR",
  SIDEWAYS = "SIDEWAYS",
  VOLATILE = "VOLATILE",
  CRASH = "CRASH",
  UNCERTAIN = "UNCERTAIN",
}

// ============================================================================
// ERROR SEVERITY
// ============================================================================

export enum ErrorSeverity {
  VALIDATION = "validation_error",
  BUSINESS = "business_logic_error",
  SYSTEM = "system_error",
  AUTHENTICATION = "authentication_error",
}

// ============================================================================
// PAYLOAD TYPES
// ============================================================================

// Client → Server Payloads
export interface SubscribeRequestPayload {
  channels: (
    | "regime"
    | "price_alerts"
    | "portfolio_updates"
    | "trades"
    | "all"
  )[];
  user_id?: string;
}

export interface UnsubscribeRequestPayload {
  channels: (
    | "regime"
    | "price_alerts"
    | "portfolio_updates"
    | "trades"
    | "all"
  )[];
}

export interface PingRequestPayload {
  sequence: number;
  client_timestamp: string;
}

export interface GetStatusRequestPayload {
  include_subscribers?: boolean;
}

// Server → Client Payloads
export interface RegimeUpdatePayload {
  regime: MarketRegime;
  previous_regime?: MarketRegime;
  confidence: number; // 0.0 - 1.0
  indicators: Record<string, number>;
  strategy_recommendation: string;
  timestamp: string;
}

export interface PriceAlertPayload {
  ticker: string;
  name?: string;
  current_price: number;
  previous_price: number;
  change_percent: number;
  alert_type: "threshold" | "movement" | "gap";
  severity: "low" | "medium" | "high" | "critical";
  timestamp: string;
}

export interface PortfolioUpdatePayload {
  total_equity: number;
  cash: number;
  invested_amount: number;
  unrealized_pnl: number;
  daily_change: number;
  daily_change_percent: number;
  position_count: number;
  timestamp: string;
}

export interface TradeExecutionPayload {
  order_id: string;
  ticker: string;
  action: "BUY" | "SELL";
  quantity: number;
  price: number;
  total_value: number;
  strategy?: string;
  status: "pending" | "filled" | "cancelled" | "failed";
  execution_time: string;
}

export interface SystemAlertPayload {
  alert_type: "connection" | "data_source" | "api_rate_limit" | "system_error";
  severity: "info" | "warning" | "error" | "critical";
  message: string;
  code?: string;
  details?: Record<string, string>;
  timestamp: string;
}

// Control Flow Payloads
export interface PongPayload {
  sequence: number;
  server_timestamp: string;
  client_timestamp: string;
}

export interface SubscriptionConfirmedPayload {
  channels: string[];
  message: string;
}

export interface StatusResponsePayload {
  connection_id: string;
  connected_at: string;
  is_authenticated: boolean;
  channels_subscribed: string[];
  subscriber_count: number;
  uptime_seconds: number;
  queue_size: number;
}

// Error Payload
export interface WsErrorPayload {
  severity: ErrorSeverity;
  code: string;
  message: string;
  details?: Record<string, string>;
  request_msg_id?: string;
  timestamp: string;
}

// ============================================================================
// MESSAGE ENVELOPE
// ============================================================================

export interface WsMessageEnvelope<T> {
  msg_id: string; // UUID
  type: string;
  payload: T;
  direction: WsDirection;
  timestamp: string;
}

// ============================================================================
// TYPED MESSAGE INTERFACES
// ============================================================================

// Client → Server Messages
export type SubscribeMessage = WsMessageEnvelope<SubscribeRequestPayload>;
export type UnsubscribeMessage = WsMessageEnvelope<UnsubscribeRequestPayload>;
export type PingMessage = WsMessageEnvelope<PingRequestPayload>;
export type GetStatusMessage = WsMessageEnvelope<GetStatusRequestPayload>;

// Server → Client Messages
export type RegimeUpdateMessage = WsMessageEnvelope<RegimeUpdatePayload>;
export type PriceAlertMessage = WsMessageEnvelope<PriceAlertPayload>;
export type PortfolioUpdateMessage = WsMessageEnvelope<PortfolioUpdatePayload>;
export type TradeExecutionMessage = WsMessageEnvelope<TradeExecutionPayload>;
export type SystemAlertMessage = WsMessageEnvelope<SystemAlertPayload>;
export type PongMessage = WsMessageEnvelope<PongPayload>;
export type SubscriptionConfirmedMessage =
  WsMessageEnvelope<SubscriptionConfirmedPayload>;
export type StatusResponseMessage = WsMessageEnvelope<StatusResponsePayload>;
export type ErrorMessage = WsMessageEnvelope<WsErrorPayload>;

// ============================================================================
// UNION TYPES FOR ROUTING
// ============================================================================

export type AnyClientMessage =
  | SubscribeMessage
  | UnsubscribeMessage
  | PingMessage
  | GetStatusMessage;

export type AnyServerMessage =
  | RegimeUpdateMessage
  | PriceAlertMessage
  | PortfolioUpdateMessage
  | TradeExecutionMessage
  | SystemAlertMessage
  | PongMessage
  | SubscriptionConfirmedMessage
  | StatusResponseMessage
  | ErrorMessage;

// ============================================================================
// TYPE GUARDS (Runtime type checking)
// ============================================================================

export function isRegimeUpdateMessage(
  msg: AnyServerMessage,
): msg is RegimeUpdateMessage {
  return msg.type === "regime_update";
}

export function isPriceAlertMessage(
  msg: AnyServerMessage,
): msg is PriceAlertMessage {
  return msg.type === "price_alert";
}

export function isPortfolioUpdateMessage(
  msg: AnyServerMessage,
): msg is PortfolioUpdateMessage {
  return msg.type === "portfolio_update";
}

export function isTradeExecutionMessage(
  msg: AnyServerMessage,
): msg is TradeExecutionMessage {
  return msg.type === "trade_execution";
}

export function isSystemAlertMessage(
  msg: AnyServerMessage,
): msg is SystemAlertMessage {
  return msg.type === "system_alert";
}

export function isPongMessage(msg: AnyServerMessage): msg is PongMessage {
  return msg.type === "pong";
}

export function isErrorMessage(msg: AnyServerMessage): msg is ErrorMessage {
  return msg.type === "error";
}

export function isAnyServerMessage(msg: unknown): msg is AnyServerMessage {
  if (typeof msg !== "object" || msg === null) return false;
  const m = msg as Record<string, unknown>;
  return (
    typeof m.msg_id === "string" &&
    typeof m.type === "string" &&
    typeof m.payload === "object" &&
    m.payload !== null &&
    typeof m.timestamp === "string"
  );
}

// ============================================================================
// MESSAGE FACTORY (Type-safe message creation)
// ============================================================================

export class MessageFactory {
  static subscribe(
    channels: SubscribeRequestPayload["channels"],
    user_id?: string,
  ): SubscribeMessage {
    return {
      msg_id: crypto.randomUUID(),
      type: "subscribe",
      payload: { channels, user_id },
      direction: "c2s",
      timestamp: new Date().toISOString(),
    };
  }

  static unsubscribe(
    channels: UnsubscribeRequestPayload["channels"],
  ): UnsubscribeMessage {
    return {
      msg_id: crypto.randomUUID(),
      type: "unsubscribe",
      payload: { channels },
      direction: "c2s",
      timestamp: new Date().toISOString(),
    };
  }

  static ping(sequence: number): PingMessage {
    return {
      msg_id: crypto.randomUUID(),
      type: "ping",
      payload: {
        sequence,
        client_timestamp: new Date().toISOString(),
      },
      direction: "c2s",
      timestamp: new Date().toISOString(),
    };
  }

  static getStatus(includeSubscribers = false): GetStatusMessage {
    return {
      msg_id: crypto.randomUUID(),
      type: "get_status",
      payload: { include_subscribers: includeSubscribers },
      direction: "c2s",
      timestamp: new Date().toISOString(),
    };
  }

  static pong(sequence: number, clientTimestamp: string): PongMessage {
    return {
      msg_id: crypto.randomUUID(),
      type: "pong",
      payload: {
        sequence,
        server_timestamp: new Date().toISOString(),
        client_timestamp: clientTimestamp,
      },
      direction: "s2c",
      timestamp: new Date().toISOString(),
    };
  }

  static error(
    code: string,
    message: string,
    severity: ErrorSeverity = ErrorSeverity.SYSTEM,
  ): ErrorMessage {
    return {
      msg_id: crypto.randomUUID(),
      type: "error",
      payload: {
        severity,
        code,
        message,
        timestamp: new Date().toISOString(),
      },
      direction: "s2c",
      timestamp: new Date().toISOString(),
    };
  }
}

// ============================================================================
// TYPE-SAFE PAYLOAD VALIDATION
// ============================================================================

export function validateSubscribeRequestPayload(
  payload: unknown,
): payload is SubscribeRequestPayload {
  if (typeof payload !== "object" || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return (
    Array.isArray(p.channels) &&
    p.channels.every((ch) =>
      ["regime", "price_alerts", "portfolio_updates", "trades", "all"].includes(
        ch,
      ),
    ) &&
    (p.user_id === undefined || typeof p.user_id === "string")
  );
}

export function validateRegimeUpdatePayload(
  payload: unknown,
): payload is RegimeUpdatePayload {
  if (typeof payload !== "object" || payload === null) return false;
  const p = payload as Record<string, unknown>;
  return (
    typeof p.regime === "string" &&
    Object.values(MarketRegime).includes(p.regime as MarketRegime) &&
    typeof p.confidence === "number" &&
    p.confidence >= 0 &&
    p.confidence <= 1 &&
    typeof p.strategy_recommendation === "string" &&
    typeof p.timestamp === "string" &&
    (p.previous_regime === undefined ||
      Object.values(MarketRegime).includes(p.previous_regime as MarketRegime))
  );
}

// ============================================================================
// MESSAGE HANDLER TYPES
// ============================================================================

export type MessageHandler<T extends AnyServerMessage> = (
  message: T,
) => void | Promise<void>;

export type MessageHandlerMap = {
  regime_update?: MessageHandler<RegimeUpdateMessage>;
  price_alert?: MessageHandler<PriceAlertMessage>;
  portfolio_update?: MessageHandler<PortfolioUpdateMessage>;
  trade_execution?: MessageHandler<TradeExecutionMessage>;
  system_alert?: MessageHandler<SystemAlertMessage>;
  pong?: MessageHandler<PongMessage>;
  subscription_confirmed?: MessageHandler<SubscriptionConfirmedMessage>;
  status_response?: MessageHandler<StatusResponseMessage>;
  error?: MessageHandler<ErrorMessage>;
};
