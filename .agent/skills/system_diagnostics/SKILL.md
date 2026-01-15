---
name: System Diagnostics
description: Check the detailed health of the trading system (Database, Dependencies, Disk, etc).
---

# System Diagnostics

Use this skill to perform a deep health check of the system.

## Usage

Run the script `scripts/health_check.py`.

### Example

```bash
python .agent/skills/system_diagnostics/scripts/health_check.py
```

### Output

Returns a JSON object with:
- **Database**: Status and size.
- **Dependencies**: Critical libraries check.
- **Disk**: Available space (if checkable).
- **Time Sync**: System time vs Market time check.
