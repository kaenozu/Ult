# Frontend Testing Agent

Frontend testing agent for verifying trading platform functionality.

## Usage

```bash
node skills/frontend-tester.js <action>
```

## Actions

### check-build
Verify the Next.js build passes without errors.
```bash
node skills/frontend-tester.js check-build
```

### start-server
Start the development server on port 3000.
```bash
node skills/frontend-tester.js start-server
```

### verify-pages
Check that all pages load correctly (HTTP 200).
```bash
node skills/frontend-tester.js verify-pages
```

### check-console
Scan pages for console errors and hydration warnings.
```bash
node skills/frontend-tester.js check-console
```

### full-check
Run complete test suite including build, server, pages, and console checks.
```bash
node skills/frontend-tester.js full-check
```

## Programmatic Usage

```javascript
const { FrontendTester } = require('./skills/frontend-tester');

const tester = new FrontendTester({
  projectDir: './trading-platform',
  port: 3000,
  pages: ['/', '/heatmap', '/journal', '/screener'],
  waitTime: 3000
});

// Run full check
const results = await tester.fullCheck();
tester.generateReport(results);
```

## Reports

The tester generates detailed reports with:

- **Build Status**: Compilation success/failure
- **Page Status**: HTTP status codes for each page
- **Console Errors**: Hydration warnings, runtime errors
- **UI Components**: Detection of key UI elements
- **Summary**: Overall pass/fail status

## Pages Tested

1. `/` - Workstation (main trading interface)
2. `/heatmap` - Market heatmap view
3. `/journal` - Trading journal
4. `/screener` - Stock screener

## Common Issues

### Hydration Mismatch
- Caused by SSR/client rendering differences
- Fix: Move random data generation to `useEffect`
- Ensure all hooks are called consistently

### Build Errors
- Check TypeScript types
- Verify all imports exist
- Ensure proper exports

### Server Won't Start
- Check if port 3000 is in use
- Kill existing processes: `lsof -i :3000`
- Clear `.next` cache: `rm -rf .next`
