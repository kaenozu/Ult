---
name: Browser Test
description: Automated browser testing and validation for AGStock Ult web application
---

# Browser Test

Use this skill to automatically test and validate the AGStock Ult web application using browser automation.

## Usage

Run browser tests to validate web application functionality:

```bash
python .agent/skills/browser_test/scripts/test_browser.py
```

### Options

- `--headless`: Run tests without visible browser (default: true)
- `--url`: Target URL to test (default: http://localhost:3000)
- `--screenshots`: Take screenshots during tests
- `--report`: Generate HTML test report

### Examples

```bash
# Basic browser test
python .agent/skills/browser_test/scripts/test_browser.py

# Test with visible browser and screenshots
python .agent/skills/browser_test/scripts/test_browser.py --headless false --screenshots

# Test specific URL
python .agent/skills/browser_test/scripts/test_browser.py --url http://localhost:3000/settings

# Generate full report
python .agent/skills/browser_test/scripts/test_browser.py --report --screenshots
```

### Test Coverage

Automatically tests:

- **Page Loading**: Home page loads correctly
- **Navigation**: Menu and routing work
- **Components**: Key components render properly
- **API Integration**: Data fetching works
- **Responsive Design**: Mobile and desktop views
- **User Interactions**: Buttons, forms, and controls
- **Error Handling**: Error states and boundaries

### Output

Returns a JSON object with:

- **Test Results**: Pass/fail status for each test
- **Screenshots**: Paths to captured screenshots (if enabled)
- **Performance**: Page load times and metrics
- **Errors**: Detailed error messages and stack traces
- **Report**: HTML report path (if generated)

### Requirements

- Chrome/Chromium browser
- Selenium WebDriver
- Application running on specified URL
