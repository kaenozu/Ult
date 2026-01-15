---
name: Generate Report
description: Generate comprehensive weekly performance reports as PDF files.
---

# Generate Report Skill

This skill allows you to generate a PDF performance report for the current portfolio. The report includes equity curves, trade statistics, asset allocation, and AI-driven analysis.

## Usage

Run the report generator script directly using the python interpreter.

```bash
python -m src.pdf_report_generator
```

## Output
- The script will generate a PDF file (default: `weekly_report.pdf`) in the current directory (or where specified in the script).
- It will print "Report generated: True" upon success.

## Environment Variables
- `REPORT_THEME`: "light" (default) or "dark".
- `USE_DEMO_DATA`: Set to "true" to generate a report with dummy data (useful for testing).

## Citations
- [PDF Report Generator](file:///c:/gemini-thinkpad/Ult/backend/src/pdf_report_generator.py)
