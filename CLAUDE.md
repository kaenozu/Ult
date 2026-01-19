# CLAUDE.md - Project Memory and Rules

## Overview

This is a sophisticated AI-powered trading platform with cyberpunk-themed UI, featuring automated trading, real-time monitoring, and advanced approval workflows.

## Architecture

- **Frontend**: Next.js 16 with React 19, TypeScript, TailwindCSS, WebXR, 3D visualizations
- **Backend**: Python FastAPI with ML/AI stack (LightGBM, TensorFlow, PyTorch)
- **Infrastructure**: Docker, Kubernetes, Redis, SQLite

## Key Rules

### Security

- Never hardcode secrets or keys
- Use environment variables for sensitive data
- Validate all user inputs
- Implement proper authentication and authorization
- Never expose secrets in logs or responses

### Code Quality

- Use TypeScript strict mode
- Follow ESLint and Prettier configurations
- Write comprehensive tests (Jest, pytest)
- Use proper error handling with specific exception types
- No console.log in production code

### Development Workflow

- Use conventional commits
- Run lint and tests before committing
- Use pull requests for code review
- Document API changes
- Keep dependencies updated

### Performance

- Optimize bundle sizes
- Use lazy loading for components
- Implement caching where appropriate
- Monitor memory usage
- Use efficient data structures

## Agent Guidelines

- Use subagents for specialized tasks (code review, security analysis, etc.)
- Delegate complex tasks to appropriate agents
- Maintain context efficiency
- Follow established patterns

## Communication

- Use Japanese for internal communication
- Provide clear, concise responses
- Use markdown formatting
- Include code references with file:line format
