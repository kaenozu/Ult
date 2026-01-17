---
name: browser_verification
description: Verify web application functionality by opening a browser, navigating to a URL, and checking for specific content or states.
---

# Browser Verification Skill

This skill allows you to verify the functionality of a web application by simulating a user session in the browser.

## Usage

To use this skill, you must use the `browser_subagent` tool.

1.  **Target URL**: The URL to verify (default: http://localhost:3000).
2.  **Verification Steps**: A list of things to look for or actions to perform.

## Instructions

1.  Call the `browser_subagent` tool.
2.  In the `Task` argument, provide detailed instructions based on the user's request.
    *   Navigate to the target URL.
    *   Wait for the page to load.
    *   Check for the presence of key elements (headers, charts, specific text).
    *   If specific interactions are requested (clicks, typing), include those.
    *   **CRITICAL:** Always verify that no "Application Error" or white screen is displayed.
3.  Report the findings back to the user, summarizing what was seen.

## Example

**User:** "Verify the dashboard loads and shows the Void Terminal."

**Agent Action:**
```python
browser_subagent(
    TaskName="Verify Dashboard and Void Terminal",
    RecordingName="dashboard_verification",
    Task="""
    1. Navigate to http://localhost:3000.
    2. Wait for the page to fully load (network idle).
    3. detailed check:
        - Look for text "The Void Terminal".
        - Verify specific element <canvas> exists.
        - Check console for errors if possible.
    4. Return a summary of what was found.
    """
)
```
