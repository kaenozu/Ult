# Code Reviewer Skill

This skill provides comprehensive code review capabilities for various programming languages and frameworks.

## Capabilities

### Code Quality Analysis

- **Syntax and Style**: Check for proper formatting, naming conventions, and code style
- **Complexity Metrics**: Identify overly complex functions and suggest refactoring
- **Documentation**: Ensure adequate comments and documentation

### Security Review

- **Vulnerability Detection**: Scan for common security issues
- **Input Validation**: Check for proper input sanitization
- **Authentication/Authorization**: Verify secure auth patterns

### Performance Review

- **Algorithm Efficiency**: Analyze algorithmic complexity
- **Resource Usage**: Check memory and CPU usage patterns
- **Database Queries**: Review query optimization

### Testing Review

- **Test Coverage**: Ensure adequate test coverage
- **Test Quality**: Verify meaningful test cases
- **Edge Cases**: Check handling of edge cases

## Usage

Invoke this skill with: `/review <file_path>` or `/review <directory>`

### Examples

```bash
/review src/components/Button.tsx
/review backend/src/api/
/review --security backend/src/auth.py
/review --performance backend/src/data_loader.py
```

## Best Practices

1. **Run regularly**: Review code before commits
2. **Focus areas**: Security-critical code gets priority
3. **Incremental reviews**: Small, frequent reviews > large infrequent ones
4. **Team alignment**: Use consistent standards across team

## Integration

This skill integrates with:

- ESLint/Prettier for style checks
- TypeScript for type safety
- Security scanners for vulnerability detection
- Performance profilers for optimization suggestions
