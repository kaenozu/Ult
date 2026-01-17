---
name: Code Generator
description: Generate boilerplate code for React components, API endpoints, and tests automatically
---

# Code Generator

Use this skill to automatically generate boilerplate code for AGStock Ult development.

## Usage

Generate React components, API endpoints, and test files:

```bash
# Generate React component
python .agent/skills/code_generator/scripts/generate_component.py --name StockAnalysis --type dashboard

# Generate API endpoint
python .agent/skills/code_generator/scripts/generate_api.py --endpoint market-data --method GET

# Generate test file
python .agent/skills/code_generator/scripts/generate_test.py --component PortfolioSummary

# Generate complete feature (component + API + test)
python .agent/skills/code_generator/scripts/generate_feature.py --name TradingBot --type feature
```

### Component Types

- `dashboard`: Dashboard widgets and summaries
- `form`: Input forms and controls
- `chart`: Data visualization components
- `table`: Data display tables
- `modal`: Dialog and popup components
- `layout`: Page layouts and structures

### API Methods

- `GET`: Data retrieval endpoints
- `POST`: Data creation endpoints
- `PUT`: Data update endpoints
- `DELETE`: Data deletion endpoints
- `CRUD`: Complete CRUD operations

### Features

- `feature`: Complete feature with component, API, and tests
- `page`: New page with routing and layout
- `hook`: Custom React hooks
- `util`: Utility functions

### Output

Returns generated files with:

- **React Components**: TypeScript with proper typing
- **API Endpoints**: FastAPI routes with validation
- **Test Files**: Jest and Testing Library setup
- **Documentation**: Component and API documentation
- **Type Definitions**: TypeScript interfaces

### Examples

```bash
# Dashboard component with real-time data
python .agent/skills/code_generator/scripts/generate_component.py \
  --name RealTimeStock --type dashboard --features real-time,chart,alerts

# Portfolio management API
python .agent/skills/code_generator/scripts/generate_api.py \
  --endpoint portfolio --methods CRUD --auth required

# Complete trading feature
python .agent/skills/code_generator/scripts/generate_feature.py \
  --name AutoTrader --type feature --include tests,docs,types
```
