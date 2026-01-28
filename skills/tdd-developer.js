#!/usr/bin/env node

/**
 * TDD Developer Agent
 * 
 * Test-Driven Development workflow for trading platform:
 * 1. RED: Write failing tests first
 * 2. GREEN: Write minimal code to pass tests
 * 3. REFACTOR: Improve code while keeping tests passing
 * 
 * Supports: Jest, React Testing Library, MSW for API mocking
 */

const fs = require('fs');
const path = require('path');

class TDDDeveloper {
  constructor(options = {}) {
    this.projectDir = options.projectDir || path.join(__dirname, '..', 'trading-platform');
    this.testDir = options.testDir || 'app/__tests__';
    this.componentsDir = options.componentsDir || 'app/components';
    this.libDir = options.libDir || 'app/lib';
    this.mockData = options.mockData !== false;
  }

  log(message, type = 'info') {
    const colors = {
      info: '\x1b[36m',
      success: '\x1b[32m',
      error: '\x1b[31m',
      warning: '\x1b[33m',
      test: '\x1b[35m',
      reset: '\x1b[0m'
    };
    console.log(`${colors[type]}[${type.toUpperCase()}]${colors.reset} ${message}`);
  }

  async ensureTestDir() {
    const fullPath = path.join(this.projectDir, this.testDir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      this.log(`Created test directory: ${this.testDir}`);
    }
    return fullPath;
  }

  getComponentPath(componentName) {
    return path.join(this.projectDir, this.componentsDir, `${componentName}.tsx`);
  }

  getTestPath(componentName) {
    return path.join(this.projectDir, this.testDir, `${componentName}.test.tsx`);
  }

  getLibPath(libName) {
    return path.join(this.projectDir, this.libDir, `${libName}.ts`);
  }

  // Phase 1: RED - Write failing tests
  async writeTests(component, features = []) {
    this.log(`Writing tests for: ${component}`, 'test');

    const testPath = this.getTestPath(component);
    const componentPath = this.getComponentPath(component);

    // Check if component exists
    const componentExists = fs.existsSync(componentPath);
    if (componentExists) {
      this.log(`Component ${component} already exists. Tests should be written FIRST in TDD!`, 'warning');
    }

    const tests = this.generateTests(component, features);

    await this.ensureTestDir();
    fs.writeFileSync(testPath, tests);

    this.log(`Created test file: ${testPath}`, 'success');
    this.log(`Tests are currently FAILING (RED phase) - now write code to pass`, 'warning');

    return {
      success: true,
      testPath,
      phase: 'RED',
      message: 'Tests written. Now implement the component to pass tests.'
    };
  }

  generateTests(component, features) {
    const testImports = this.generateImports(component);
    const testCases = this.generateTestCases(component, features);
    const mockSetup = this.generateMockSetup(component);

    return `/**
 * ${component} - TDD Test Suite
 * 
 * TDD Workflow:
 * 1. RED: These tests should FAIL initially
 * 2. GREEN: Implement component to pass tests
 * 3. REFACTOR: Improve code while keeping tests passing
 */

${testImports}

${mockSetup}

describe('${component}', () => {
  ${testCases}
});
`;
  }

  generateImports(component) {
    const imports = [
      `import { render, screen, fireEvent, waitFor } from '@testing-library/react';`,
      `import '@testing-library/jest-dom';`,
      `import { ${component} } from '@/app/components/${component}';`,
      `import { useTradingStore } from '@/app/store/tradingStore';`
    ];

    if (this.mockData) {
      imports.push(`import { JAPAN_STOCKS, USA_STOCKS } from '@/app/data/stocks';`);
    }

    return imports.join('\n');
  }

  generateMockSetup(component) {
    return `
const mockStore = {
  theme: 'dark',
  watchlist: [],
  portfolio: {
    positions: [],
    totalValue: 0,
    totalProfit: 0,
    dailyPnL: 0,
    cash: 250000,
  },
  signals: new Map(),
  selectedStock: null,
  isConnected: true,
  toggleTheme: jest.fn(),
  addToWatchlist: jest.fn(),
  removeFromWatchlist: jest.fn(),
  refreshSignals: jest.fn(),
  setSelectedStock: jest.fn(),
  closePosition: jest.fn(),
};

// Mock useTradingStore
jest.mock('@/app/store/tradingStore', () => ({
  useTradingStore: jest.fn(() => mockStore),
}));
`;
  }

  generateTestCases(component, features) {
    const baseTests = [
      `it('renders without crashing', () => {
    render(<${component} />);
    expect(screen.getByTestId('${component.toLowerCase()}')).toBeInTheDocument();
  });`,

      `it('displays correct content', () => {
    render(<${component} />);
    expect(screen.getByText(/Content/i)).toBeInTheDocument();
  });`
    ];

    const featureTests = features.map(feature => {
      switch (feature) {
        case 'interactive':
          return `it('handles user interactions', () => {
    render(<${component} />);
    const button = screen.getByRole('button', { name: /action/i });
    fireEvent.click(button);
    expect(button).toBeEnabled();
  });`;
        case 'data':
          return `it('displays data correctly', () => {
    render(<${component} />);
    expect(screen.getByText(/Data/i)).toBeInTheDocument();
  });`;
        case 'loading':
          return `it('shows loading state', () => {
    render(<${component} />);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });`;
        case 'error':
          return `it('handles error state', () => {
    render(<${component} />);
    expect(screen.getByText(/Error/i)).not.toBeInTheDocument();
  });`;
        default:
          return null;
      }
    }).filter(Boolean);

    return [...baseTests, ...featureTests].join('\n\n  ');
  }

  // Phase 2: GREEN - Run tests to verify they fail
  async runTests(component) {
    this.log(`Running tests for: ${component}`, 'test');
    
    const testPath = this.getTestPath(component);
    if (!fs.existsSync(testPath)) {
      this.log(`Test file not found: ${testPath}`, 'error');
      return { success: false, error: 'Test file not found' };
    }

    try {
      const result = await this.runCommand('npm test -- --testPathPattern=' + component, {
        timeout: 60000
      });

      const output = result.stdout + result.stderr;
      
      // Check if tests failed (expected in RED phase)
      const hasFailures = output.includes('FAIL') || output.includes('failed');
      
      if (hasFailures) {
        this.log('Tests FAILED as expected (RED phase)', 'success');
        this.log('Now implement the component to make tests pass', 'warning');
      } else {
        this.log('Tests PASSED - You may have skipped RED phase', 'warning');
      }

      return {
        success: true,
        phase: hasFailures ? 'RED' : 'GREEN',
        output: output.substring(0, 2000)
      };
    } catch (error) {
      this.log(`Test execution error: ${error.message}`, 'error');
      return { success: false, error: error.message };
    }
  }

  // Combined RED-GREEN-REFACTOR workflow
  async verifyRedGreenRefactor(component, features = []) {
    this.log(`Starting TDD workflow for: ${component}`, 'test');
    
    const report = {
      component,
      timestamp: new Date().toISOString(),
      workflow: {}
    };

    // Step 1: RED - Write tests
    this.log('PHASE 1: RED - Writing failing tests...', 'test');
    report.workflow.red = await this.writeTests(component, features);

    // Step 2: GREEN - Run tests (should fail)
    this.log('PHASE 2: GREEN - Running tests (expecting failures)...', 'success');
    report.workflow.green = await this.runTests(component);

    // Step 3: Provide guidance
    this.log('PHASE 3: REFACTOR - Implement and refactor', 'warning');

    report.nextSteps = [
      `1. Implement ${component} component`,
      `2. Run: npm test -- --testPathPattern=${component}`,
      `3. Fix any failures`,
      `4. Refactor while keeping tests passing`,
      `5. Run: node skills/tdd-developer.js test-coverage --component=${component}`
    ];

    return report;
  }

  async createTestFile(name, type = 'component') {
    const templates = {
      component: this.componentTemplate(name),
      hook: this.hookTemplate(name),
      utility: this.utilityTemplate(name),
      store: this.storeTemplate(name)
    };

    const template = templates[type] || templates.component;
    const testPath = path.join(this.projectDir, this.testDir, `${name}.${type === 'component' ? 'test' : 'test'}.ts${type === 'component' ? 'x' : ''}`);

    await this.ensureTestDir();
    fs.writeFileSync(testPath, template);

    this.log(`Created ${type} test: ${testPath}`, 'success');
    return { success: true, testPath };
  }

  componentTemplate(name) {
    return `import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ${name} } from '@/app/components/${name}';

jest.mock('@/app/store/tradingStore', () => ({
  useTradingStore: jest.fn(() => ({
    theme: 'dark',
    watchlist: [],
    portfolio: { positions: [], totalValue: 0, totalProfit: 0, dailyPnL: 0, cash: 250000 },
    signals: new Map(),
    selectedStock: null,
    isConnected: true,
    toggleTheme: jest.fn(),
  })),
}));

describe('${name}', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    render(<${name} />);
    expect(screen.getByTestId('${name.toLowerCase()}')).toBeInTheDocument();
  });

  it('handles user interactions', () => {
    render(<${name} />);
    const element = screen.getByRole('button');
    fireEvent.click(element);
    expect(element).toBeEnabled();
  });
});
`;
  }

  hookTemplate(name) {
    return `import { renderHook, act } from '@testing-library/react';
import { use${name} } from '@/app/hooks/use${name}';

describe('use${name}', () => {
  it('initializes correctly', () => {
    const { result } = renderHook(() => use${name}());
    expect(result.current).toBeDefined();
  });

  it('handles state changes', () => {
    const { result } = renderHook(() => use${name}());
    act(() => {
      result.current.setState('new value');
    });
    expect(result.current.state).toBe('new value');
  });
});
`;
  }

  utilityTemplate(name) {
    return `import { ${name} } from '@/app/lib/${name}';

describe('${name}', () => {
  it('returns correct value', () => {
    const result = ${name}('input');
    expect(result).toBe('expected');
  });

  it('handles edge cases', () => {
    expect(() => ${name}(null)).not.toThrow();
  });
});
`;
  }

  storeTemplate(name) {
    return `import { renderHook, act } from '@testing-library/react';
import { use${name}Store } from '@/app/store/${name}Store';

describe('use${name}Store', () => {
  it('initial state is correct', () => {
    const { result } = renderHook(() => use${name}Store());
    expect(result.current).toBeDefined();
  });

  it('updates state correctly', () => {
    const { result } = renderHook(() => use${name}Store());
    act(() => {
      result.current.setValue('new value');
    });
    expect(result.current.value).toBe('new value');
  });
});
`;
  }

  async testCoverage(component) {
    this.log(`Generating coverage report for: ${component}`, 'test');

    try {
      const result = await this.runCommand(
        `npm test -- --testPathPattern=${component} --coverage --coverageThreshold='{"global":{"branches":50,"functions":50,"lines":50,"statements":50}}'`,
        { timeout: 120000 }
      );

      return {
        success: true,
        coverage: result.stdout.includes('Coverage'),
        output: result.stdout
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async mockApi(endpoint, response) {
    const mockDir = path.join(this.projectDir, this.testDir, '__mocks__');
    if (!fs.existsSync(mockDir)) {
      fs.mkdirSync(mockDir, { recursive: true });
    }

    const mockPath = path.join(mockDir, 'api.js');
    const mockContent = `
// Mock API for ${endpoint}
export const mock${endpoint.replace(/\//g, '')}Response = ${JSON.stringify(response, null, 2)};
`;

    fs.writeFileSync(mockPath, mockContent);
    this.log(`Created API mock: ${mockPath}`, 'success');

    return { success: true, mockPath };
  }

  async runCommand(command, options = {}) {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, {
        shell: true,
        cwd: this.projectDir,
        ...options,
        env: { ...process.env, CI: 'true' }
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        resolve({ code, stdout, stderr });
      });

      proc.on('error', (error) => {
        reject(error);
      });
    });
  }

  generateReport(results) {
    console.log('\n' + '='.repeat(60));
    console.log('TDD DEVELOPMENT REPORT');
    console.log('='.repeat(60));
    console.log(`Component: ${results.component}`);
    console.log(`Timestamp: ${results.timestamp}`);
    console.log('');

    if (results.workflow.red) {
      console.log('RED Phase (Tests Written):');
      console.log(`  ✓ Test file: ${results.workflow.red.testPath}`);
    }

    if (results.workflow.green) {
      console.log('GREEN Phase (Tests Run):');
      console.log(`  Status: ${results.workflow.green.phase}`);
    }

    if (results.nextSteps) {
      console.log('');
      console.log('Next Steps:');
      results.nextSteps.forEach(step => console.log(`  ${step}`));
    }

    console.log('='.repeat(60) + '\n');
  }
}

const { spawn } = require('child_process');

async function main() {
  const args = process.argv.slice(2);
  const action = args[0] || 'help';

  const developer = new TDDDeveloper({
    projectDir: path.join(__dirname, '..', 'trading-platform'),
    testDir: 'app/__tests__'
  });

  let results;

  switch (action) {
    case 'write-tests':
      const component1 = args[1];
      const features1 = args.slice(2).filter(a => a.startsWith('--feature='))
        .map(a => a.replace('--feature=', ''));
      results = await developer.writeTests(component1, features1);
      break;

    case 'run-tests':
      results = await developer.runTests(args[1]);
      break;

    case 'test-coverage':
      results = await developer.testCoverage(args[1]);
      break;

    case 'create-test-file':
      results = await developer.createTestFile(args[1], args[2] || 'component');
      break;

    case 'verify-red-green-refactor':
      const component2 = args[1];
      const features2 = args.slice(2).filter(a => a.startsWith('--feature='))
        .map(a => a.replace('--feature=', ''));
      results = await developer.verifyRedGreenRefactor(component2, features2);
      developer.generateReport(results);
      break;

    case 'mock-api':
      results = await developer.mockApi(args[1], { data: 'mock' });
      break;

    case 'help':
    default:
      console.log(`
TDD Developer Agent
===================
Usage: node skills/tdd-developer.js <action> [options]

Actions:
  write-tests <component>           Write failing tests for component
  run-tests <component>             Run tests for component
  test-coverage <component>         Run tests with coverage
  create-test-file <name> [type]   Create test file from template
  verify-red-green-refactor <comp>  Full TDD workflow
  mock-api <endpoint> <response>   Create API mock

Examples:
  # Write tests for new component
  node skills/tdd-developer.js write-tests SignalPanel --feature=interactive --feature=data

  # Full TDD workflow
  node skills/tdd-developer.js verify-red-green-refactor StockChart --feature=loading

  # Create test file
  node skills/tdd-developer.js create-test-file useTrading hook

TDD Workflow:
  1. RED: Write failing tests
  2. GREEN: Write code to pass tests
  3. REFACTOR: Improve code, keep tests passing
      `);
      return;
  }

  if (results && action !== 'help') {
    console.log(JSON.stringify(results, null, 2));
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { TDDDeveloper };
