# Trading Psychology Analysis System

## Overview

The Trading Psychology Analysis System is a comprehensive feature that helps traders maintain emotional discipline and make rational trading decisions by analyzing their psychological state in real-time.

## Features

### 1. Emotion Detection
- **Fear Detection**: Identifies hesitation and reduced position sizing after losses
- **Greed Detection**: Detects overtrading and excessive position sizing
- **Frustration Detection**: Identifies revenge trading patterns
- **Euphoria Detection**: Recognizes overconfidence after winning streaks

### 2. Mental Health Tracking
- **Overall Score** (0-100): Composite mental health metric
- **Discipline Score** (0-100): Adherence to trading rules
- **Emotional Stability** (0-100): Consistency in trading behavior
- **Stress Level** (0-100): Current stress measurement
- **Fatigue Level** (0-100): Trading exhaustion indicator

### 3. Mental States
- **Optimal**: Best state for trading
- **Cautious**: Slightly stressed but manageable
- **Stressed**: High stress, trade carefully
- **Tilt**: Emotional trading, stop immediately
- **Burnout**: Exhausted, must take extended break

### 4. AI Trading Coach
Provides personalized recommendations based on:
- Current mental state
- Detected emotions
- Discipline violations
- Trading patterns
- Fatigue levels

### 5. Discipline Monitoring
Checks for violations of trading rules:
- Position size limits
- Daily loss limits
- Risk per trade limits
- Stop loss requirements
- Maximum consecutive losses
- Trading hours limits

## Backend Components

### Python Modules

#### `TradingPsychologyAnalyzer`
Located in: `backend/src/trade_journal_analyzer/psychology_analyzer.py`

**Key Methods:**
- `analyze_emotions()`: Detects emotional states from trading behavior
- `calculate_mental_health()`: Computes comprehensive mental health metrics
- `check_discipline_violations()`: Validates trades against rules
- `should_stop_trading()`: Determines if trader should stop
- `generate_coaching_recommendations()`: Creates AI recommendations

#### Detection Algorithms
- **Tilt Detection**: Rapid re-entries after losses
- **Burnout Detection**: Extended trading without breaks
- **Fear Detection**: Reduced position size after losses
- **Greed Detection**: Increasing positions after wins

## Frontend Components

### React Components

#### `MentalHealthDashboard`
Located in: `trading-platform/app/components/Psychology/MentalHealthDashboard.tsx`

Displays:
- Overall mental health score with color-coded status
- Individual metrics (discipline, stability, stress, fatigue)
- Consecutive win/loss streaks
- Days since last break
- Risk indicators (tilt, burnout)
- Detected emotions with confidence scores
- Critical warnings and recommendations

#### `AICoachPanel`
Located in: `trading-platform/app/components/Psychology/AICoachPanel.tsx`

Features:
- Priority-based recommendations (critical, high, medium, low)
- Action-oriented guidance
- Dismissible alerts
- Color-coded severity indicators
- Expandable action items

### Zustand Store

#### `usePsychologyStore`
Located in: `trading-platform/app/store/psychologyStore.ts`

State Management:
- Current mental health metrics
- Emotion history (last 5)
- Active recommendations
- Discipline rules configuration
- Trading sessions history
- Analysis history

### TypeScript Types

#### Psychology Types
Located in: `trading-platform/app/types/psychology.ts`

Key Interfaces:
- `MentalHealthMetrics`: Complete mental health data
- `EmotionScore`: Detected emotion with confidence
- `CoachingRecommendation`: AI-generated advice
- `DisciplineViolation`: Rule violation record
- `PsychologyAnalysisResult`: Complete analysis output

## Usage

### Viewing Psychology Analysis

Navigate to `/psychology` in the application to view:
- Real-time mental health dashboard
- AI coach recommendations
- Today's trading statistics
- Detected patterns
- Goal progress tracking

### Setting Discipline Rules

```typescript
import { usePsychologyStore } from '@/app/store/psychologyStore';

const { updateDisciplineRules } = usePsychologyStore();

updateDisciplineRules({
  max_position_size: 10000,
  max_daily_loss: 1000,
  max_risk_per_trade: 200,
  max_trades_per_day: 10,
  min_risk_reward_ratio: 1.5,
  required_stop_loss: true,
  max_consecutive_losses: 3,
  max_trading_hours: 8,
});
```

### Analyzing Trades

```python
from trade_journal_analyzer.psychology_analyzer import TradingPsychologyAnalyzer

analyzer = TradingPsychologyAnalyzer()

# Set discipline rules
analyzer.set_discipline_rules({
    'max_position_size': 10000,
    'max_risk_per_trade': 200,
})

# Analyze emotions from recent trades
emotions = analyzer.analyze_emotions(recent_trades)

# Calculate mental health
mental_health = analyzer.calculate_mental_health(recent_trades)

# Check if should stop trading
should_stop, reason = analyzer.should_stop_trading(mental_health, recent_trades)

if should_stop:
    print(f"⚠️ STOP TRADING: {reason}")

# Get coaching recommendations
recommendations = analyzer.generate_coaching_recommendations(
    mental_health, emotions, violations
)
```

## Success Metrics

The system tracks progress toward these goals:

1. **Trade Journal Entry Rate**: Target 80%+
2. **Discipline Score**: Target 80+
3. **Tilt-Related Losses**: Reduce by 70%
4. **Trader Satisfaction**: 4.5/5+
5. **Self-Awareness**: Improve by 30%

## Warning System

The system provides automatic warnings for:

### Critical Warnings (Stop Trading)
- Mental state is "Tilt" or "Burnout"
- Risk of tilt > 80%
- Consecutive losing days ≥ 4
- Stress level > 80%
- Discipline score < 50%
- Rapid consecutive losses (3+ in 30 minutes)

### High Priority Warnings
- Mental state is "Stressed"
- Risk of tilt > 60%
- Discipline score < 70%
- Consecutive losing days ≥ 2

### Medium Priority Warnings
- Mental state is "Cautious"
- Days without break > 14
- Fatigue level > 60%

## Best Practices

### For Traders

1. **Check Mental Health Daily**: Review psychology dashboard before trading
2. **Set Discipline Rules**: Configure rules that match your strategy
3. **Respect Warnings**: Take breaks when system recommends
4. **Keep Journal**: Regular entries improve analysis accuracy
5. **Review Patterns**: Learn from detected emotional patterns
6. **Track Progress**: Monitor goal achievement over time

### For Developers

1. **Real Data Integration**: Replace mock data with actual trade analysis
2. **API Endpoints**: Create `/api/psychology/analyze` endpoint
3. **Persistence**: Store analysis results in database
4. **Notifications**: Add push notifications for critical warnings
5. **Customization**: Allow users to customize thresholds
6. **Machine Learning**: Enhance emotion detection with ML models

## Testing

### Backend Tests
```bash
cd backend
python -m pytest tests/test_psychology_analyzer.py -v
```

**Test Coverage**: 19 tests covering:
- Emotion detection (fear, greed, frustration, euphoria)
- Mental health calculations
- Discipline violation detection
- Trading stop recommendations
- Coaching recommendations generation

### Frontend Tests
```bash
cd trading-platform
npm test -- Psychology
```

## Future Enhancements

1. **Real-time Monitoring**: Live emotion detection during trading
2. **Mobile Alerts**: Push notifications for critical states
3. **Social Features**: Compare psychology metrics with peers
4. **Historical Trends**: Long-term mental health trending
5. **Integration**: Connect with trading platforms for automatic analysis
6. **Wearables**: Integrate heart rate/stress data from smartwatches
7. **Video Analysis**: Facial expression analysis during trading
8. **Voice Analysis**: Detect stress from voice commands

## Troubleshooting

### Mock Data Not Updating
```typescript
// Manually trigger analysis update
const { addAnalysis } = usePsychologyStore();
const newAnalysis = getPsychologyData();
addAnalysis(newAnalysis);
```

### Discipline Rules Not Applying
Check that rules are properly set in store and match expected format.

### Recommendations Not Showing
Verify that:
1. Mental health metrics are loaded
2. Coaching is enabled in store
3. Analysis has been run recently

## API Documentation

### Future API Endpoints

#### `POST /api/psychology/analyze`
Analyzes trading psychology from journal entries.

**Request:**
```json
{
  "trades": [/* JournalEntry[] */],
  "sessions": [/* TradingSession[] */],
  "discipline_rules": {/* DisciplineRules */}
}
```

**Response:**
```json
{
  "success": true,
  "data": {/* PsychologyAnalysisResult */}
}
```

#### `POST /api/psychology/check-discipline`
Checks a single trade against discipline rules.

**Request:**
```json
{
  "trade": {/* JournalEntry */},
  "rules": {/* DisciplineRules */}
}
```

**Response:**
```json
{
  "success": true,
  "violations": [/* DisciplineViolation[] */],
  "can_trade": true
}
```

## Contributing

When adding psychology features:

1. Update type definitions in `types/psychology.ts`
2. Add backend logic in `psychology_analyzer.py`
3. Create/update React components
4. Add tests for new functionality
5. Update this documentation

## License

Part of the ULT Trading Platform. See main project LICENSE.
