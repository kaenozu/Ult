---
name: brainstorm_with_opencode
description: Collaborate with the OpenCode AI to brainstorm ideas. Antigravity acts as the facilitator.
---

# Brainstorm with OpenCode (Facilitator Mode)

This skill defines a **protocol** for you (Antigravity) to act as a facilitator between the User and the OpenCode AI. Do not simply pass the prompt and exit. You must actively manage the session to produce high-quality results.

## 🛑 Agent Protocol

### Step 1: Decompose
Break the user's request into smaller, specific questions to avoid timeouts and generic answers.
- Bad: "Brainstorm everything about this app."
- Good: "List 3 UI ideas." -> "List 3 Backend optimizations." -> "List 3 Security features."

### Step 2: Interrogate (Multi-Turn)
Execute the CLI multiple times with these specific questions using the free model.

```bash
python backend/src/cli/opencode.py "Question 1..." --model opencode/big-pickle
python backend/src/cli/opencode.py "Question 2..." --model opencode/big-pickle
```

### Step 3: Synthesize
Combine the raw outputs from OpenCode into a coherent summary. Add your own analysis.
- What ideas are feasible?
- What fits the current "Deep Void" design philosophy?

## Usage

```bash
python backend/src/cli/opencode.py "<QUESTION>" --model opencode/big-pickle
```
