# Qwen Command Meeting Agent

Intelligent meeting agent that uses the local `qwen` command line tool for interactive discussions, decision making, and generating meeting minutes.

## Features

- 🖥️ **CLI-based AI**: Uses local `qwen` command for AI conversations
- 🌍 **Multi-Language Support**: Japanese, English, and Chinese language support
- 📝 **Real-time Transcript**: Automatic meeting transcript logging
- 📊 **AI Summaries**: On-demand AI-powered meeting summaries
- ⏱️ **Time Management**: Built-in meeting duration control
- 💾 **Persistent Records**: Save complete meeting history

## Prerequisites

### Install Qwen CLI Tool

```bash
# Install qwen command line tool
pip install qwen

# Or install from source
git clone https://github.com/QwenLM/Qwen.git
cd Qwen
pip install -e .
```

### Verify Installation

```bash
# Check qwen command is available
qwen --version

# Test basic functionality
qwen "Hello, how are you?"
```

## Installation

### Requirements

- Python 3.8+
- Pydantic
- python-dotenv
- qwen CLI tool

### Setup

```bash
# Install Python dependencies
pip install pydantic python-dotenv

# Verify qwen command is installed
qwen --version
```

## Usage

### Basic Usage

```bash
# Start a meeting with default settings (Japanese, 30 minutes)
python scripts/qwen_command_meeting.py

# Custom meeting topic
python scripts/qwen_command_meeting.py --topic "プロジェクト計画会議"

# Different language and duration
python scripts/qwen_command_meeting.py --language en --duration 60 --topic "Sprint Planning"

# Use specific qwen model
python scripts/qwen_command_meeting.py --model qwen2 --topic "技術検討会"
```

### Command Line Options

- `--topic`: Meeting topic/agenda (default: "一般会議")
- `--duration`: Meeting duration in minutes (default: 30)
- `--language`: Meeting language - ja, en, zh (default: ja)
- `--model`: Qwen model to use (default: "qwen")
- `--no-transcript`: Don't save meeting transcript

### Interactive Commands

During the meeting, you can use:

- `summary` or `要約`: Generate AI summary of recent discussions
- `quit` or `exit`: End the meeting
- `Ctrl+C`: Emergency exit

## Meeting Flow

1. **Opening**: Qwen welcomes participants and outlines meeting objectives
2. **Discussion**: Interactive dialogue with intelligent facilitation
3. **Summarization**: AI can provide real-time summaries on demand
4. **Closing**: AI concludes with key points and action items

## Configuration

### Meeting Parameters

The meeting agent supports various configuration options:

```python
from scripts.qwen_command_meeting import QwenCommandConfig, QwenCommandMeetingAgent

config = QwenCommandConfig(
    topic="Strategic Planning",
    duration_minutes=45,
    language="en",
    qwen_model="qwen2",
    save_transcript=True
)

agent = QwenCommandMeetingAgent(config)
agent.start_meeting()
```

### Qwen Model Options

Depending on your qwen installation, you may have access to:

- `qwen`: Base Qwen model
- `qwen2`: Qwen 2.0 (if available)
- `qwen-chat`: Chat-optimized variant
- `qwen-coder`: Code-specialized variant

Check available models with:

```bash
qwen --help
```

## Output Files

### Meeting Transcripts

Meetings are automatically saved to `qwen_command_transcripts/` directory in JSON format:

```json
{
  "meeting_config": {
    "topic": "Project Planning",
    "language": "ja",
    "duration_minutes": 30,
    "qwen_model": "qwen"
  },
  "start_time": "2024-01-15T10:00:00",
  "end_time": "2024-01-15T10:25:00",
  "messages": [
    {
      "role": "assistant",
      "content": "ようこそ...",
      "timestamp": "2024-01-15T10:00:01",
      "speaker": "Qwen AI"
    }
  ]
}
```

## Language Support

### Japanese (ja)

- Professional and polite communication style
- Contextual understanding of business culture
- Appropriate honorifics and formal expressions

### English (en)

- Clear, professional communication
- Standard business meeting etiquette
- Action-oriented discussions

### Chinese (zh)

- Professional business communication
- Cultural context awareness
- Structured meeting format

## Advanced Features

### AI Facilitation Capabilities

1. **Active Listening**: Analyzes participant inputs and responds appropriately
2. **Time Management**: Monitors meeting duration and provides time warnings
3. **Topic Management**: Keeps discussions focused on meeting objectives
4. **Consensus Building**: Helps identify common ground and decisions
5. **Action Item Tracking**: Identifies and highlights next steps

### CLI Integration Benefits

- **Local Processing**: No internet connection required for basic models
- **Privacy**: All conversations remain local
- **Performance**: Fast response times
- **Customization**: Can use custom fine-tuned models

## Troubleshooting

### Common Issues

1. **Qwen Command Not Found**

   ```bash
   # Check if qwen is installed
   which qwen
   qwen --version

   # Install qwen if missing
   pip install qwen
   ```

2. **Permission Errors**

   ```bash
   # Create transcript directory
   mkdir -p qwen_command_transcripts
   chmod 755 qwen_command_transcripts
   ```

3. **Model Not Available**

   ```bash
   # Check available models
   qwen --help

   # Try with default model
   python scripts/qwen_command_meeting.py --model qwen
   ```

4. **Encoding Issues**
   ```bash
   # Set proper encoding
   export PYTHONIOENCODING=utf-8
   python scripts/qwen_command_meeting.py
   ```

## Examples

### Business Planning Meeting

```bash
python scripts/qwen_command_meeting.py \
  --topic "2024年度事業計画" \
  --duration 60 \
  --language ja
```

### Technical Discussion

```bash
python scripts/qwen_command_meeting.py \
  --topic "システムアーキテクチャ検討" \
  --model qwen2 \
  --duration 45
```

### Brainstorming Session

```bash
python scripts/qwen_command_meeting.py \
  --topic "新機能アイデアブレインストーミング" \
  --language ja \
  --duration 30
```

## Development

### Extending the Agent

You can extend the meeting agent by:

1. **Adding New Languages**: Update `_get_system_prompt()` method
2. **Custom Facilitation**: Modify system prompts for different meeting types
3. **Integration Points**: Add external service connections
4. **Custom Outputs**: Implement different export formats

### Testing

```bash
# Test with short duration
python scripts/qwen_command_meeting.py --topic "Test Meeting" --duration 5

# Test different models
python scripts/qwen_command_meeting.py --model qwen2 --duration 5
```

## Integration with Other Tools

### Meeting Scheduling

```bash
# Schedule regular meetings using cron
0 9 * * 1 cd /path/to/agent && python scripts/qwen_command_meeting.py --topic "Weekly Planning" --duration 30
```

### Integration with Note-taking

The JSON transcripts can be easily integrated with:

- Obsidian (for markdown conversion)
- Notion (via API)
- Evernote (via import)
- Local markdown files

## Performance Considerations

### Optimizing Performance

1. **Model Selection**: Use appropriate model size for your hardware
2. **Context Management**: The agent keeps recent conversation context
3. **Batch Processing**: For long meetings, consider breaking into sessions

### Hardware Requirements

- **Minimum**: 4GB RAM, CPU-only
- **Recommended**: 8GB+ RAM for larger models
- **GPU Support**: If available, can significantly speed up response times

## Security and Privacy

### Privacy Features

- **Local Processing**: Conversations never leave your system
- **No Data Collection**: No telemetry or data collection
- **Configurable Storage**: Choose where to save transcripts

### Security Best Practices

- Set appropriate file permissions for transcript directory
- Consider encrypting sensitive meeting transcripts
- Regular cleanup of old transcript files

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

---

**Note**: This skill requires the `qwen` command line tool to be installed and available in your PATH. The meeting agent will automatically detect and verify the qwen installation on startup.
