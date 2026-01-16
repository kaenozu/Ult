---
name: instruct_opencode
description: Give natural language instructions to the OpenCode interpreter to perform coding or system tasks.
---

# Instruct OpenCode

This skill allows you to leverage the `opencode` interpreter to perform complex tasks, file operations, or coding assistants by sending it natural language instructions.

## Usage

### Send Instruction
Send a single instruction string to OpenCode.

```bash
python backend/src/cli/opencode.py "<INSTRUCTION>"
```

**Arguments:**
- `<INSTRUCTION>`: A clear, descriptive natural language instruction (e.g., "Analyze the error logs", "Refactor the utils module").

## Output Format (JSON)

```json
{
  "instruction": "Analyze the error logs",
  "executed": true,
  "output": "OpenCode Output...\nFound 3 errors...",
  "error": "",
  "returncode": 0
}
```
