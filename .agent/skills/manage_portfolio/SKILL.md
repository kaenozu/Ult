---
name: Manage Portfolio
description: Manage the portfolio, including resetting capital.
---

# Manage Portfolio

Use this skill to perform administrative actions on the portfolio, such as resetting the account.

## Usage

Run the script `scripts/reset_portfolio.py` to reset the portfolio.

### Arguments

- `--capital`: Initial capital amount (default: 1,000,000).

### Example

```bash
python .agent/skills/manage_portfolio/scripts/reset_portfolio.py --capital 5000000
```

### Output

Returns a JSON object with the result.
