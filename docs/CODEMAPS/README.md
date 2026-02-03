# CODEMAPS Directory

This directory contains detailed code maps for the ULT Trading Platform. Code maps provide architectural documentation, component relationships, data flows, and integration points for different domains of the application.

## Available Code Maps

### Prediction Domain

| Document | Domain | Last Updated | Status |
|----------|--------|--------------|--------|
| [ML Models](./prediction-ml-models.md) | `app/domains/prediction/models/ml/` | 2025-01-28 | ✅ Current (PR #606) |
| [Services](./prediction-services.md) | `app/domains/prediction/services/` | 2025-01-28 | ✅ Current (PR #606) |

### Coming Soon

- **Backtest Domain**: Backtesting engine and analysis tools
- **Market Data Domain**: Data fetching and caching services
- **Portfolio Domain**: Portfolio management and tracking
- **Order Execution Domain**: Order routing and execution

---

## What is a CODEMAP?

A CODEMAP is a comprehensive technical document that provides:

1. **Architecture Overview**: High-level structure of the domain
2. **Component Documentation**: Detailed description of each class/module
3. **Data Flow Diagrams**: How data moves through the system
4. **Integration Points**: How the domain connects with others
5. **API Documentation**: Public interfaces and usage examples
6. **Testing Guidance**: How to test the components
7. **Performance Characteristics**: Expected performance metrics
8. **Configuration**: Available configuration options
9. **Future Roadmap**: Planned enhancements

---

## How to Use CODEMAPS

### For New Developers

1. **Start with the Overview**: Understand the domain's purpose
2. **Review the Directory Structure**: See how files are organized
3. **Study Core Components**: Learn the main classes and their responsibilities
4. **Follow Data Flow Examples**: Understand how requests are processed
5. **Review Integration Points**: See how the domain connects to others

### For Maintenance

1. **Check Component Documentation**: Understand existing functionality
2. **Review API Contracts**: Ensure backward compatibility
3. **Study Data Flows**: Identify impact areas for changes
4. **Check Testing Guidance**: Write appropriate tests

### For Feature Development

1. **Review Future Enhancements**: Align with roadmap
2. **Study Integration Points**: Identify extension points
3. **Check Configuration**: Understand available settings
4. **Review Performance Characteristics**: Set appropriate targets

---

## CODEMAP Format

Each CODEMAP follows a standard structure:

```markdown
# CODEMAP: [Domain Name]

**Domain**: [Path to domain]
**Last Updated**: [Date]
**Status**: [Current status]

## Overview
Brief description of the domain

## Directory Structure
File organization

## Core Components
Detailed component documentation

## Data Flow
How data moves through the system

## Integration Points
Connections to other domains

## Export Structure
Public API

## Testing
Testing approach and examples

## Performance Characteristics
Expected performance metrics

## Configuration
Available settings

## Future Enhancements
Planned improvements

## References
Related documentation
```

---

## Maintenance Guidelines

### When to Update a CODEMAP

- ✅ After major refactoring (like PR #606)
- ✅ When adding new components
- ✅ When changing public APIs
- ✅ When updating architecture
- ✅ During quarterly documentation reviews

### How to Update a CODEMAP

1. **Read the existing CODEMAP**: Understand current state
2. **Identify changes**: Compare with code changes
3. **Update affected sections**: Modify relevant sections
4. **Add new sections if needed**: For new components
5. **Update metadata**: Change "Last Updated" date and status
6. **Review for accuracy**: Ensure documentation matches code

### Version Control

- CODEMAPS are version controlled in Git
- Changes should reference the related PR/commit
- Major updates should be noted in the status section

---

## Creating a New CODEMAP

### Template

Use this template to create a new CODEMAP:

```bash
# Copy template
cp docs/CODEMAPS/template.md docs/CODEMAPS/new-domain.md

# Fill in the sections
# - Update domain path
# - Add component documentation
# - Document data flows
# - Add examples
# - Review and commit
```

### Review Checklist

Before publishing a new CODEMAP:

- [ ] Domain path is correct
- [ ] All core components are documented
- [ ] Data flows are clear
- [ ] Integration points are identified
- [ ] Examples are accurate and tested
- [ ] Performance characteristics are realistic
- [ ] Configuration options are complete
- [ ] References are valid

---

## Contributing

### Guidelines

1. **Accuracy**: Ensure documentation matches code
2. **Clarity**: Write for developers unfamiliar with the domain
3. **Completeness**: Cover all public APIs and key components
4. **Examples**: Provide realistic usage examples
5. **Diagrams**: Use ASCII diagrams for flows and structures
6. **Maintenance**: Keep documentation up-to-date

### Review Process

1. Create CODEMAP in draft
2. Review with domain experts
3. Test all examples
4. Verify accuracy against code
5. Publish and announce

---

## Additional Resources

### Related Documentation

- [Main README](../../README.md) - Project overview
- [ML Training Guide](../ML_TRAINING_GUIDE.md) - ML model training
- [Documentation Update Report](../../documentation-update-report.md) - Latest changes

### Tools

- **Mermaid**: For complex diagrams (future)
- **PlantUML**: For UML diagrams (future)
- **Markdown**: For all documentation

---

## Questions?

- Check the specific CODEMAP for domain details
- Review the main project README
- Open a GitHub discussion for clarification

---

**Last Updated**: 2025-01-28
**Status**: Active
**Maintainer**: Documentation Team
