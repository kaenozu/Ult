---
name: brainstorm_with_opencode
description: Collaborate with the OpenCode AI to brainstorm ideas, architectural designs, or problem-solving strategies.
---

# Brainstorm with OpenCode

This skill acts as a bridge to a dedicated brainstorming session with the OpenCode AI agent. Use this when you need creative input, architectural advice, or a second opinion on a complex problem.

## Usage

### Start Brainstorming
Send a topic to OpenCode.

> [!TIP]
> **Avoid Timeouts:** Large, complex prompts may time out on free models. Break down your request into smaller sub-topics (e.g., "UI Ideas" instead of "Full System Architecture").

```bash
python backend/src/cli/opencode.py "Brainstorm ideas for: <TOPIC>" --model opencode/big-pickle
```

**Arguments:**
- `<TOPIC>`: The subject you want to brainstorm about.
- `--model <MODEL>`: Specify model(s).
    - Single: `--model opencode/big-pickle`
    - Multiple (Simultaneous): `--model "opencode/big-pickle,opencode/qwen3-coder"` (comma-separated)

### Example Instructions
- "Brainstorm 5 different ways to optimize the React re-rendering issues."
- "Propose an architectural design for a scalable notification system."
- "List pros and cons of using GraphQL vs REST for this project."

## Output Format (JSON)

```json
{
  "instruction": "Brainstorm ideas for...",
  "executed": true,
  "output": "Here are 5 ideas:\n1. Use Memoization...\n2. Virtualize lists...",
  "error": "",
  "returncode": 0
}
```

> [!NOTE]
> This skill relies on the system's `opencode` CLI. Ensure you are authenticated and have sufficient credits/quota.
