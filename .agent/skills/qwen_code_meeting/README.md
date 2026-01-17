# Qwen-code Meeting Agent

Intelligent code review and development discussion agent powered by Qwen-code AI for conducting technical meetings, code reviews, and architecture discussions.

## Features

- 💻 **Code-Specific AI**: Qwen-code specialized for programming and code analysis
- 📝 **Multi-File Support**: Review and discuss multiple code files simultaneously
- 🎯 **Focused Reviews**: Target code quality, architecture, performance, or security
- 🔍 **Deep Analysis**: Specific file reviews and pattern analysis
- 📊 **Smart Summaries**: AI-generated meeting summaries with actionable insights
- 💾 **Persistent Records**: Save complete code review transcripts

## Installation

### Requirements

- Python 3.8+
- OpenAI Python library
- Pydantic
- python-dotenv

### Setup

```bash
# Install dependencies
pip install openai pydantic python-dotenv requests

# Set up environment variables
export QWEN_CODE_API_KEY="your_qwen_code_api_key"
export QWEN_CODE_BASE_URL="https://dashscope.aliyuncs.com/compatible-mode/v1"

# Or use OpenAI-compatible fallback
export OPENAI_API_KEY="your_openai_api_key"
export OPENAI_BASE_URL="http://localhost:8000/v1"
```

## Usage

### Basic Code Review

```bash
# Review single file
python scripts/qwen_code_meeting.py --files main.py --topic "Main Module Review"

# Review multiple files
python scripts/qwen_code_meeting.py --files main.py utils.py config.py --topic "Backend Review"

# Different review modes
python scripts/qwen_code_meeting.py --files main.py --mode performance --topic "Performance Analysis"
```

### Command Line Options

- `--topic`: Review topic/agenda (default: "コードレビュー会議")
- `--files`: List of code files to review (required for meaningful review)
- `--duration`: Meeting duration in minutes (default: 45)
- `--language`: Language - ja, en (default: ja)
- `--mode`: Review focus - code, architecture, performance, security (default: code)

### Interactive Commands

During code review meeting:

- `review [filename]`: Detailed review of specific file
- `analyze [filename]`: Deep code pattern analysis
- `summary`: Generate AI-powered meeting summary
- `quit` or `exit`: End meeting
- `Ctrl+C`: Emergency exit

## Code Review Modes

### Code Quality Mode (`--mode code`)

- Readability and maintainability
- Code style and conventions
- Error handling and edge cases
- Testing coverage and strategies

### Architecture Mode (`--mode architecture`)

- Design patterns and principles
- Component separation and dependencies
- Scalability and extensibility
- Integration considerations

### Performance Mode (`--mode performance`)

- Algorithm efficiency
- Resource utilization
- Bottleneck identification
- Optimization opportunities

### Security Mode (`--mode security`)

- Input validation and sanitization
- Authentication and authorization
- Data encryption and protection
- Common vulnerability patterns

## Example Sessions

### Frontend Code Review

```bash
python scripts/qwen_code_meeting.py \
  --files frontend/src/components/Header.js \
          frontend/src/utils/helpers.js \
  --topic "Frontend Component Review" \
  --mode code \
  --duration 30
```

### Backend Architecture Discussion

```bash
python scripts/qwen_code_meeting.py \
  --files backend/src/api/server.py \
          backend/src/models/user.py \
          backend/src/auth/middleware.py \
  --topic "API Architecture Review" \
  --mode architecture \
  --duration 60
```

### Performance Analysis

```bash
python scripts/qwen_code_meeting.py \
  --files algorithms/sorting.py \
          data/processing.py \
  --topic "Performance Optimization" \
  --mode performance \
  --duration 45
```

## Code File Support

### Supported Languages

- **Python** (.py) - Full syntax highlighting and analysis
- **JavaScript** (.js) - Modern JS and ES6+ features
- **TypeScript** (.ts) - Type checking and interface analysis
- **Java** (.java) - Enterprise Java patterns
- **C/C++** (.c, .cpp) - Low-level optimization
- **Go** (.go) - Concurrency and performance
- **Rust** (.rs) - Memory safety and patterns
- **PHP** (.php) - Web development patterns
- **Ruby** (.rb) - Rails and Ruby patterns

### File Analysis Features

- Automatic language detection
- Syntax-aware analysis
- Pattern recognition
- Best practice recommendations
- Security vulnerability scanning
- Performance bottleneck identification

## Configuration

### Environment Variables

| Variable             | Description                | Default                                             |
| -------------------- | -------------------------- | --------------------------------------------------- |
| `QWEN_CODE_API_KEY`  | Qwen-code API key          | None                                                |
| `QWEN_CODE_BASE_URL` | Qwen-code API base URL     | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| `QWEN_API_KEY`       | Fallback Qwen API key      | None                                                |
| `OPENAI_API_KEY`     | OpenAI API key (fallback)  | None                                                |
| `OPENAI_BASE_URL`    | OpenAI base URL (fallback) | `http://localhost:8000/v1`                          |

### Model Configuration

- **Primary**: `qwen-coder-plus` - Advanced code analysis
- **Alternatives**: `qwen-coder-turbo`, `qwen-coder-max`

## Output Files

### Code Review Transcripts

Meetings are automatically saved to `code_review_transcripts/` directory:

```json
{
  "meeting_config": {
    "topic": "Main Module Review",
    "review_mode": "code",
    "files": ["main.py"]
  },
  "files_reviewed": ["main.py"],
  "start_time": "2024-01-15T14:00:00",
  "end_time": "2024-01-15T14:35:00",
  "conversation": [
    {
      "role": "assistant",
      "content": "Let's review the main.py file..."
    }
  ]
}
```

## Advanced Features

### Intelligent Code Analysis

1. **Pattern Recognition**: Identifies common design patterns and anti-patterns
2. **Complexity Metrics**: Evaluates cyclomatic complexity and cognitive load
3. **Dependency Analysis**: Maps module dependencies and coupling
4. **Security Scanning**: Detects common security vulnerabilities
5. **Performance Profiling**: Identifies bottlenecks and optimization opportunities

### Context-Aware Recommendations

- Framework-specific best practices
- Language-idiomatic patterns
- Project-structure appropriate suggestions
- Team-collaboration considerations

## Integration Examples

### CI/CD Pipeline Integration

```bash
# Automated code review in CI
python scripts/qwen_code_meeting.py \
  --files $(git diff --name-only HEAD~1) \
  --mode code \
  --duration 15 \
  --topic "Pull Request Review"
```

### Team Code Reviews

```bash
# Weekly code review session
python scripts/qwen_code_meeting.py \
  --files $(find src -name "*.py" -mtime -7) \
  --mode architecture \
  --duration 60 \
  --topic "Weekly Code Review"
```

## Troubleshooting

### Common Issues

1. **API Connection Errors**

   ```bash
   # Check Qwen-code API key
   echo $QWEN_CODE_API_KEY

   # Test connection
   curl -H "Authorization: Bearer $QWEN_CODE_API_KEY" \
        https://dashscope.aliyuncs.com/compatible-mode/v1/models
   ```

2. **File Not Found Errors**

   ```bash
   # Verify file paths
   ls -la main.py utils.py

   # Use absolute paths if needed
   python scripts/qwen_code_meeting.py --files /full/path/to/main.py
   ```

3. **Large File Issues**
   - Files over 50,000 characters may be truncated
   - Consider splitting large files or focusing on specific functions

## Best Practices

### Effective Code Reviews

1. **Prepare Code**: Ensure code is ready for review
2. **Clear Topics**: Specify review focus areas
3. **Time Management**: Set appropriate duration
4. **Action Items**: Generate actionable summaries
5. **Follow Up**: Track implementation of suggestions

### File Organization

- Group related files together
- Prioritize critical components
- Include test files when relevant
- Provide context for complex algorithms

## Development

### Extending the Agent

1. **New Languages**: Add language detection and analysis
2. **Custom Metrics**: Implement project-specific quality measures
3. **Integration**: Connect with version control and issue tracking
4. **Reporting**: Generate custom report formats

### Testing

```bash
# Test with sample files
python scripts/qwen_code_meeting.py --files examples/sample.py --duration 5

# Security review test
python scripts/qwen_code_meeting.py --files examples/auth.js --mode security --duration 10
```

## License

MIT License - see LICENSE file for details.

---

**Note**: This skill requires valid API keys for Qwen-code or OpenAI-compatible services. The agent includes fallback mechanisms for local model deployments.
