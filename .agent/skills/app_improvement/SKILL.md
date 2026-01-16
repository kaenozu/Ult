---
name: App Improvement
description: Get comprehensive analysis and improvement suggestions for AGStock Ult application
---

# App Improvement

Use this skill to analyze and improve the AGStock Ult application comprehensively.

## Usage

Run the improvement analysis script:

```bash
python .agent/skills/app_improvement/scripts/improve.py
```

### Options

- `--focus`: Focus on specific area (ui, performance, testing, features, quality)
- `--dry-run`: Analyze and plan without executing changes

### Examples

```bash
# Full analysis and improvement
python .agent/skills/app_improvement/scripts/improve.py

# Focus on UI/UX improvements only
python .agent/skills/app_improvement/scripts/improve.py --focus ui

# Analyze without making changes
python .agent/skills/app_improvement/scripts/improve.py --dry-run
```

### Output

Returns a JSON object with:

- **Analysis**: Current state of frontend, backend, performance, code quality
- **Improvement Areas**: Identified issues with priority and estimated effort
- **Plan**: Immediate actions, short-term goals, and long-term goals
- **Execution Status**: Results of automatic improvements applied

The script also saves a detailed report to `improvement_report.json`.
