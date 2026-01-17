# Qwen Meeting Agent

Intelligent meeting assistant powered by Qwen AI for conducting discussions, decision making, and generating meeting minutes.

## Features

- 🤖 **AI-Powered Facilitation**: Qwen AI acts as intelligent meeting facilitator
- 🌍 **Multi-Language Support**: Japanese, English, and Chinese language support
- 📝 **Real-time Transcript**: Automatic meeting transcript logging
- 📊 **AI Summaries**: On-demand AI-powered meeting summaries
- ⏱️ **Time Management**: Built-in meeting duration control
- 💾 **Persistent Records**: Save complete meeting history

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
export QWEN_API_KEY="your_qwen_api_key"
export QWEN_BASE_URL="https://dashscope.aliyuncs.com/compatible-mode/v1"

# Or use OpenAI-compatible fallback
export OPENAI_API_KEY="your_openai_api_key"
export OPENAI_BASE_URL="http://localhost:8000/v1"
```

## Usage

### Basic Usage

```bash
# Start a meeting with default settings (Japanese, 30 minutes)
python scripts/meeting.py

# Custom meeting topic
python scripts/meeting.py --topic "プロジェクト計画会議"

# Different language and duration
python scripts/meeting.py --language en --duration 60 --topic "Sprint Planning"
```

### Command Line Options

- `--topic`: Meeting topic/agenda (default: "General discussion")
- `--duration`: Meeting duration in minutes (default: 30)
- `--language`: Meeting language - ja, en, zh (default: ja)
- `--no-transcript`: Don't save meeting transcript

### Interactive Commands

During the meeting, you can use:

- `summary` or `要約`: Generate AI summary of recent discussions
- `quit` or `exit`: End the meeting
- `Ctrl+C`: Emergency exit

## Meeting Flow

1. **Opening**: Qwen AI welcomes participants and outlines meeting objectives
2. **Discussion**: Interactive dialogue with intelligent facilitation
3. **Summarization**: AI can provide real-time summaries on demand
4. **Closing**: AI concludes with key points and action items

## Configuration

### Meeting Parameters

The meeting agent supports various configuration options:

```python
from scripts.meeting import MeetingConfig, QwenMeetingAgent

config = MeetingConfig(
    topic="Strategic Planning",
    participants=["CEO", "CTO", "Qwen AI"],
    duration_minutes=45,
    language="en",
    save_transcript=True,
    qwen_model="qwen-plus"
)

agent = QwenMeetingAgent(config)
agent.start_meeting()
```

### Environment Variables

| Variable          | Description                | Default                                             |
| ----------------- | -------------------------- | --------------------------------------------------- |
| `QWEN_API_KEY`    | Qwen API key               | None                                                |
| `QWEN_BASE_URL`   | Qwen API base URL          | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| `OPENAI_API_KEY`  | OpenAI API key (fallback)  | None                                                |
| `OPENAI_BASE_URL` | OpenAI base URL (fallback) | `http://localhost:8000/v1`                          |

## Output Files

### Meeting Transcripts

Meetings are automatically saved to `meeting_transcripts/` directory in JSON format:

```json
{
  "meeting_config": {
    "topic": "Project Planning",
    "language": "ja",
    "duration_minutes": 30
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

### Integration Possibilities

- Calendar integration for scheduling
- Video conferencing integration
- Document sharing capabilities
- Multi-participant support
- Voting and decision tools

## Troubleshooting

### Common Issues

1. **API Connection Errors**

   ```bash
   # Check API key
   echo $QWEN_API_KEY

   # Test connection
   curl -H "Authorization: Bearer $QWEN_API_KEY" \
        https://dashscope.aliyuncs.com/compatible-mode/v1/models
   ```

2. **Import Errors**

   ```bash
   # Install missing dependencies
   pip install -r requirements.txt
   ```

3. **Permission Errors**
   ```bash
   # Create transcript directory
   mkdir -p meeting_transcripts
   chmod 755 meeting_transcripts
   ```

## Development

### Extending the Agent

You can extend the meeting agent by:

1. **Adding New Languages**: Update `_get_system_prompt()` method
2. **Custom Facilitation**: Modify Qwen's behavior through prompts
3. **Integration Points**: Add external service connections
4. **Custom Outputs**: Implement different export formats

### Testing

```bash
# Test with mock responses
python scripts/meeting.py --topic "Test Meeting" --duration 5
```

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

---

**Note**: This skill requires valid API keys for Qwen or OpenAI-compatible services. The meeting agent includes fallback mechanisms for local model deployments.
