---
name: Refactor Assistant
description: Analyze code quality and provide refactoring suggestions for AGStock Ult codebase
---

# Refactor Assistant

Use this skill to analyze code quality and get automated refactoring suggestions.

## Usage

Analyze code quality and generate refactoring recommendations:

```bash
# Analyze entire codebase
python .agent/skills/refactor_assistant/scripts/analyze_code.py

# Analyze specific directory
python .agent/skills/refactor_assistant/scripts/analyze_code.py --path src/components

# Analyze specific file
python .agent/skills/refactor_assistant/scripts/analyze_code.py --file src/components/dashboard/PortfolioSummary.tsx

# Focus on specific issues
python .agent/skills/refactor_assistant/scripts/analyze_code.py --focus complexity,duplicates

# Auto-fix simple issues
python .agent/skills/refactor_assistant/scripts/analyze_code.py --auto-fix --dry-run
```

### Analysis Types

- **Complexity**: Cyclomatic complexity and code complexity analysis
- **Duplicates**: Code duplication detection and consolidation
- **Smells**: Code smell detection (long methods, large classes, etc.)
- **Security**: Security vulnerabilities and anti-patterns
- **Performance**: Performance bottlenecks and optimizations
- **Maintainability**: Code maintainability index assessment

### Auto-Fix Options

- **Formatting**: Code formatting and style consistency
- **Imports**: Import statement optimization
- **Variables**: Variable naming and unused variable cleanup
- **Functions**: Function extraction and simplification
- **Types**: TypeScript type improvements

### Output

Returns detailed analysis with:

- **Code Quality Score**: Overall quality assessment (0-100)
- **Issues Found**: Detailed list of code issues
- **Refactoring Suggestions**: Specific improvement recommendations
- **Auto-Fix Candidates**: Issues that can be automatically fixed
- **Complexity Metrics**: Function and file complexity measurements
- **Duplicate Code**: Repeated code blocks and consolidation opportunities

### Examples

```bash
# Comprehensive analysis with auto-fix
python .agent/skills/refactor_assistant/scripts/analyze_code.py --auto-fix

# Focus on complexity issues
python .agent/skills/refactor_assistant/scripts/analyze_code.py --focus complexity

# Generate detailed report
python .agent/skills/refactor_assistant/scripts/analyze_code.py --report --verbose

# Dry run auto-fix
python .agent/skills/refactor_assistant/scripts/analyze_code.py --auto-fix --dry-run
```

### Configuration

Create `.refactor.json` in project root:

```json
{
  "rules": {
    "complexity": {
      "max_function_complexity": 10,
      "max_file_complexity": 50
    },
    "duplicates": {
      "min_lines": 5,
      "min_similarity": 0.8
    },
    "performance": {
      "check_react_renders": true,
      "check_large_arrays": true
    }
  },
  "ignore": ["node_modules", ".git", "dist"]
}
```
