/**
 * Trading Psychology Types
 * 
 * Types for trading psychology analysis, emotion detection,
 * mental health tracking, and discipline monitoring.
 */

// ============================================================================
// Emotion Detection Types
// ============================================================================

/**
 * Types of trading emotions
 */
export type EmotionType = 
  | 'fear'
  | 'greed'
  | 'confidence'
  | 'anxiety'
  | 'euphoria'
  | 'frustration'
  | 'discipline'
  | 'neutral';

/**
 * Emotion score with confidence level
 */
export interface EmotionScore {
  emotion: EmotionType;
  score: number; // 0.0 to 1.0
  confidence: number; // 0.0 to 1.0
  indicators: string[]; // What triggered this emotion
}

/**
 * Current mental state of trader
 */
export type MentalState = 
  | 'optimal'      // Best state for trading
  | 'cautious'     // Slightly stressed but manageable
  | 'stressed'     // High stress, should be careful
  | 'tilt'         // Emotional trading, should stop
  | 'burnout';     // Exhausted, must take break

// ============================================================================
// Mental Health Types
// ============================================================================

/**
 * Comprehensive mental health metrics
 */
export interface MentalHealthMetrics {
  overall_score: number; // 0-100
  stress_level: number; // 0-100
  discipline_score: number; // 0-100
  emotional_stability: number; // 0-100
  fatigue_level: number; // 0-100
  state: MentalState;
  days_since_break: number;
  consecutive_losing_days: number;
  consecutive_winning_days: number;
  risk_of_tilt: number; // 0-1
  risk_of_burnout: number; // 0-1
  recommendations: string[];
}

// ============================================================================
// Discipline Monitoring Types
// ============================================================================

/**
 * Discipline violation severity
 */
export type ViolationSeverity = 'low' | 'medium' | 'high';

/**
 * Trading discipline violation
 */
export interface DisciplineViolation {
  rule_type: string;
  severity: ViolationSeverity;
  description: string;
  trade_id?: string;
  timestamp: string;
  impact: string;
}

/**
 * Discipline rules configuration
 */
export interface DisciplineRules {
  max_position_size?: number;
  max_daily_loss?: number;
  max_risk_per_trade?: number;
  max_trades_per_day?: number;
  min_risk_reward_ratio?: number;
  required_stop_loss?: boolean;
  max_consecutive_losses?: number;
  max_trading_hours?: number;
}

// ============================================================================
// Trading Session Types
// ============================================================================

/**
 * Trading session data
 */
export interface TradingSession {
  id: string;
  start_time: string;
  end_time?: string;
  trades_count: number;
  win_count: number;
  loss_count: number;
  total_profit: number;
  emotions: EmotionScore[];
  violations: DisciplineViolation[];
  notes: string;
}

// ============================================================================
// AI Coach Types
// ============================================================================

/**
 * Coaching recommendation priority
 */
export type CoachingPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * Coaching recommendation type
 */
export type CoachingType = 'advice' | 'warning' | 'urgent' | 'info';

/**
 * AI coaching recommendation
 */
export interface CoachingRecommendation {
  type: CoachingType;
  priority: CoachingPriority;
  title: string;
  message: string;
  actions: string[];
  timestamp?: string;
  dismissed?: boolean;
}

/**
 * Warning level for trading state
 */
export type WarningLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

// ============================================================================
// Psychology Analysis Result Types
// ============================================================================

/**
 * Complete psychology analysis result
 */
export interface PsychologyAnalysisResult {
  mental_health: MentalHealthMetrics;
  dominant_emotions: EmotionScore[];
  recent_violations: DisciplineViolation[];
  trading_pattern_issues: string[];
  should_stop_trading: boolean;
  warning_level: WarningLevel;
  coaching_recommendations: CoachingRecommendation[];
  analyzed_at: string;
}

// ============================================================================
// Enhanced Journal Entry with Psychology
// ============================================================================

/**
 * Journal entry with emotion and psychology data
 */
export interface EnhancedJournalEntry {
  id: string;
  symbol: string;
  date: string;
  timestamp: string;
  signalType: 'BUY' | 'SELL' | 'HOLD';
  entryPrice: number;
  exitPrice?: number;
  quantity: number;
  profit?: number;
  profitPercent?: number;
  status: 'OPEN' | 'CLOSED';
  
  // Psychology fields
  emotions?: EmotionType[];
  emotion_scores?: EmotionScore[];
  pre_trade_mental_state?: MentalState;
  post_trade_mental_state?: MentalState;
  discipline_violations?: DisciplineViolation[];
  notes: string;
  reflection?: string; // Post-trade reflection
  mistakes?: string[]; // Identified mistakes
  lessons?: string[]; // Lessons learned
}

// ============================================================================
// Psychology Store State
// ============================================================================

/**
 * Psychology store state
 */
export interface PsychologyState {
  // Current state
  current_mental_health?: MentalHealthMetrics;
  current_emotions: EmotionScore[];
  active_recommendations: CoachingRecommendation[];
  
  // Settings
  discipline_rules: DisciplineRules;
  alerts_enabled: boolean;
  coaching_enabled: boolean;
  
  // History
  sessions: TradingSession[];
  analysis_history: PsychologyAnalysisResult[];
  
  // Actions
  updateMentalHealth: (metrics: MentalHealthMetrics) => void;
  addEmotion: (emotion: EmotionScore) => void;
  addRecommendation: (recommendation: CoachingRecommendation) => void;
  dismissRecommendation: (index: number) => void;
  updateDisciplineRules: (rules: Partial<DisciplineRules>) => void;
  addSession: (session: TradingSession) => void;
  addAnalysis: (analysis: PsychologyAnalysisResult) => void;
  resetState: () => void;
}

// ============================================================================
// Dashboard Widget Types
// ============================================================================

/**
 * Mental health gauge props
 */
export interface MentalHealthGaugeProps {
  score: number;
  state: MentalState;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

/**
 * Emotion indicator props
 */
export interface EmotionIndicatorProps {
  emotions: EmotionScore[];
  maxDisplay?: number;
  showConfidence?: boolean;
}

/**
 * Discipline score props
 */
export interface DisciplineScoreProps {
  score: number;
  overall?: number;
  planAdherence?: number;
  emotionalControl?: number;
  lossManagement?: number;
  journalConsistency?: number;
  coolingOffCompliance?: number;
  violations: DisciplineViolation[];
  showDetails?: boolean;
}

/**
 * Coach panel props
 */
export interface CoachPanelProps {
  recommendations: CoachingRecommendation[];
  onDismiss?: (index: number) => void;
  compact?: boolean;
}

// ============================================================================
// Alert Types
// ============================================================================

/**
 * Psychology alert configuration
 */
export interface PsychologyAlertConfig {
  tilt_detection: boolean;
  high_stress_warning: boolean;
  discipline_violations: boolean;
  fatigue_warning: boolean;
  consecutive_losses: boolean;
  sound_enabled: boolean;
  desktop_notifications: boolean;
}

/**
 * Psychology alert
 */
export interface PsychologyAlert {
  id: string;
  type: 'tilt' | 'stress' | 'violation' | 'fatigue' | 'loss_streak';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
  requires_action: boolean;
  suggested_action?: string;
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Psychology analysis API request
 */
export interface PsychologyAnalysisRequest {
  trades: EnhancedJournalEntry[];
  sessions?: TradingSession[];
  discipline_rules?: DisciplineRules;
  time_window_hours?: number;
}

/**
 * Psychology analysis API response
 */
export interface PsychologyAnalysisResponse {
  success: boolean;
  data?: PsychologyAnalysisResult;
  error?: string;
}

/**
 * Discipline check API request
 */
export interface DisciplineCheckRequest {
  trade: EnhancedJournalEntry;
  rules: DisciplineRules;
}

/**
 * Discipline check API response
 */
export interface DisciplineCheckResponse {
  success: boolean;
  violations: DisciplineViolation[];
  can_trade: boolean;
  warning?: string;
}

