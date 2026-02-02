# Prediction Domain Layer

This directory contains the refactored prediction service layer that implements proper separation of responsibilities using dependency injection and design patterns.

## Architecture

### Core Components

1. **Interfaces** (`interfaces.ts`)
   - `IModel`: Base interface for prediction models
   - `IModelRegistry`: Interface for managing multiple models
   - `IEnsembleStrategy`: Interface for combining predictions
   - `IConfidenceEvaluator`: Interface for evaluating prediction confidence

2. **Models** (Individual prediction algorithms)
   - `RandomForestModel`: Rule-based Random Forest implementation
   - `XGBoostModel`: Rule-based XGBoost implementation
   - `LSTMModel`: Simplified LSTM implementation

3. **Core Services**
   - `ModelRegistry`: Manages model registration and predictions
   - `WeightedAverageStrategy`: Combines predictions using configurable weights
   - `ConfidenceEvaluator`: Evaluates prediction confidence

4. **Main Service**
   - `PredictionService`: Orchestrator that coordinates all components
   - `PredictionServiceFactory`: Factory for creating service instances

## Benefits

### 1. Testability
Each component can be tested independently with mocked dependencies:
```typescript
// Easy to test with mocks
const mockRegistry = { ... };
const mockStrategy = { ... };
const mockEvaluator = { ... };

const service = new PredictionService(mockRegistry, mockStrategy, mockEvaluator);
```

### 2. Extensibility
Add new models without modifying existing code:
```typescript
class NewModel implements IModel {
  readonly name = 'NewModel';
  predict(features: PredictionFeatures): number {
    // Your implementation
  }
}

// Register the new model
registry.register(new NewModel());
```

### 3. Configurability
Change ensemble weights at runtime:
```typescript
const strategy = new WeightedAverageStrategy({
  'RandomForest': 0.4,
  'XGBoost': 0.4,
  'LSTM': 0.2,
});
```

### 4. Maintainability
Clear separation of responsibilities makes code easier to understand and modify.

## Usage

### Basic Usage (Default Configuration)
```typescript
import { PredictionServiceFactory } from '@/app/lib/domains/prediction';

// Create with default settings
const service = PredictionServiceFactory.createDefault();

// Make predictions
const prediction = service.predict(features);
```

### Custom Weights
```typescript
const service = PredictionServiceFactory.createWithWeights({
  'RandomForest': 0.5,
  'XGBoost': 0.3,
  'LSTM': 0.2,
});
```

### Custom Models
```typescript
import { PredictionServiceFactory, IModel } from '@/app/lib/domains/prediction';

class MyCustomModel implements IModel {
  readonly name = 'MyModel';
  predict(features: PredictionFeatures): number {
    // Your logic here
    return 42;
  }
}

const service = PredictionServiceFactory.createWithModels(
  [new MyCustomModel()],
  { 'MyModel': 1.0 }
);
```

### Advanced Usage (Full Control)
```typescript
import {
  PredictionService,
  ModelRegistry,
  RandomForestModel,
  XGBoostModel,
  WeightedAverageStrategy,
  ConfidenceEvaluator,
} from '@/app/lib/domains/prediction';

// Create custom components
const registry = new ModelRegistry();
registry.register(new RandomForestModel());
registry.register(new XGBoostModel());

const strategy = new WeightedAverageStrategy({
  'RandomForest': 0.6,
  'XGBoost': 0.4,
});

const evaluator = new ConfidenceEvaluator();

// Create service with custom configuration
const service = new PredictionService(registry, strategy, evaluator);
```

## Backward Compatibility

The existing `MLModelService` has been updated to use the new `PredictionService` internally, maintaining full backward compatibility:

```typescript
// Old code still works
import { mlModelService } from '@/app/lib/services/ml-model-service';

const prediction = mlModelService.predict(features);
```

## Migration Guide

### From MLModelService to PredictionService

**Before:**
```typescript
import { mlModelService } from '@/app/lib/services/ml-model-service';

const prediction = mlModelService.predict(features);
```

**After:**
```typescript
import { PredictionServiceFactory } from '@/app/lib/domains/prediction';

const service = PredictionServiceFactory.createDefault();
const prediction = service.predict(features);
```

### Benefits of Migration
1. Better testability with dependency injection
2. Easier to customize weights and models
3. Cleaner separation of concerns
4. More maintainable codebase

## Testing

All components have comprehensive unit tests:

```bash
npm test -- app/lib/domains/prediction/__tests__
```

Test coverage includes:
- Individual model predictions
- Model registry operations
- Ensemble strategy combinations
- Confidence evaluation
- Service orchestration
- Factory methods
- Edge cases (NaN, Infinity, extreme values)

## Design Patterns Used

1. **Dependency Injection**: All dependencies are injected through constructors
2. **Strategy Pattern**: `IEnsembleStrategy` allows swapping combination algorithms
3. **Factory Pattern**: `PredictionServiceFactory` simplifies object creation
4. **Repository Pattern**: `ModelRegistry` manages model collection
5. **Interface Segregation**: Clear, focused interfaces

## Future Enhancements

Possible future improvements:
1. Add more ensemble strategies (voting, stacking)
2. Implement model persistence/loading
3. Add model performance tracking
4. Support for real TensorFlow.js models
5. Dynamic model weight adjustment based on performance
6. Model versioning and A/B testing support
