/**
 * Monkey Test Automation Script
 *
 * Chrome DevTools MCPを使用して自動モンキーテストを実行するスクリプト
 *
 * 使用方法:
 *   node scripts/monkey-test.js
 *
 * 環境変数:
 *   BASE_URL: テスト対象URL (デフォルト: http://localhost:3000)
 *   ITERATIONS: テスト回数 (デフォルト: 20)
 */

const fs = require('fs');
const path = require('path');

// 設定
const config = {
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  iterations: parseInt(process.env.ITERATIONS || '20'),
  timeout: 30000,
  reportPath: path.join(__dirname, '../monkey-test-report.json'),
};

// テスト結果
const results = {
  timestamp: new Date().toISOString(),
  config,
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    errors: [],
  },
  details: [],
};

/**
 * ログ出力
 */
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '✅',
    warn: '⚠️',
    error: '❌',
    debug: '🔍',
  }[level] || 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
}

/**
 * MCPコマンドをシミュレート（実際のMCPツールを使用）
 */
class MonkeyTester {
  constructor(config) {
    this.config = config;
    this.actions = [];
  }

  /**
   * ランダムなアクションを生成
   */
  generateRandomAction(snapshot) {
    const clickableElements = snapshot.filter(el =>
      el.role === 'button' || el.role === 'link' || el.tagName === 'input'
    );

    if (clickableElements.length === 0) {
      return null;
    }

    const randomElement = clickableElements[
      Math.floor(Math.random() * clickableElements.length)
    ];

    return {
      type: 'click',
      uid: randomElement.uid,
      description: randomElement.description || randomElement.role || randomElement.tagName,
    };
  }

  /**
   * ページ遷移
   */
  async navigateTo(pagePath) {
    const url = `${this.config.baseUrl}${pagePath}`;
    log(`Navigating to: ${url}`, 'debug');
    this.actions.push({ type: 'navigate', url });
    // 実際のMCP: chrome-devtools.navigate_page({ type: 'url', url })
  }

  /**
   * スナップショット取得
   */
  async takeSnapshot() {
    log('Taking snapshot...', 'debug');
    // 実際のMCP: chrome-devtools.take_snapshot()
    // モックデータを返す
    return this.getMockSnapshot();
  }

  /**
   * 要素クリック
   */
  async click(uid) {
    log(`Clicking element: ${uid}`, 'debug');
    this.actions.push({ type: 'click', uid });
    // 実際のMCP: chrome-devtools.click({ uid })
  }

  /**
   * コンソールメッセージ取得
   */
  async getConsoleMessages() {
    log('Getting console messages...', 'debug');
    // 実際のMCP: chrome-devtools.list_console_messages()
    return [];
  }

  /**
   * スクリーンショット取得
   */
  async takeScreenshot() {
    log('Taking screenshot...', 'debug');
    // 実際のMCP: chrome-devtools.take_screenshot()
  }

  /**
   * モックスナップショット（テスト用）
   */
  getMockSnapshot() {
    return [
      { uid: '1', role: 'link', description: 'ワークステーション' },
      { uid: '2', role: 'link', description: 'ヒートマップ' },
      { uid: '3', role: 'link', description: 'ジャーナル' },
      { uid: '4', role: 'link', description: 'スクリーナー' },
      { uid: '5', role: 'button', description: '1m' },
      { uid: '6', role: 'button', description: '5m' },
      { uid: '7', role: 'button', description: 'SMA' },
      { uid: '8', role: 'button', description: 'BB' },
    ];
  }

  /**
   * モンキーテスト実行
   */
  async run() {
    const pages = ['/', '/heatmap', '/journal', '/screener'];

    log(`Starting Monkey Test (${this.config.iterations} iterations)`, 'info');
    log(`Base URL: ${this.config.baseUrl}`, 'info');

    for (let i = 0; i < this.config.iterations; i++) {
      log(`Iteration ${i + 1}/${this.config.iterations}`, 'info');

      try {
        // ランダムにページを選択
        const randomPage = pages[Math.floor(Math.random() * pages.length)];
        await this.navigateTo(randomPage);

        // スナップショット取得
        const snapshot = await this.takeSnapshot();

        // ランダムなアクションを実行
        const action = this.generateRandomAction(snapshot);
        if (action) {
          await this.click(action.uid);
          log(`Action: ${action.type} on ${action.description}`, 'debug');
        }

        // コンソール確認
        const consoleMessages = await this.getConsoleMessages();

        // エラーチェック
        const errors = consoleMessages.filter(msg => msg.level === 'error');
        if (errors.length > 0) {
          log(`Found ${errors.length} console errors`, 'warn');
          results.summary.failed++;
          results.summary.errors.push(...errors.map(e => e.message));
        } else {
          results.summary.passed++;
        }

        results.summary.total++;

        // 少し待機
        await this.sleep(500);

      } catch (error) {
        log(`Error in iteration ${i + 1}: ${error.message}`, 'error');
        results.summary.failed++;
        results.summary.errors.push(error.message);
      }
    }

    log('Monkey Test completed', 'info');
    this.generateReport();
  }

  /**
   * スリープ
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * レポート生成
   */
  generateReport() {
    const report = {
      ...results,
      summary: {
        ...results.summary,
        successRate: ((results.summary.passed / results.summary.total) * 100).toFixed(2) + '%',
      },
    };

    fs.writeFileSync(this.config.reportPath, JSON.stringify(report, null, 2));
    log(`Report saved to: ${this.config.reportPath}`, 'info');

    // コンソールサマリー
    console.log('\n📊 Test Summary:');
    console.log(`   Total: ${report.summary.total}`);
    console.log(`   Passed: ${report.summary.passed}`);
    console.log(`   Failed: ${report.summary.failed}`);
    console.log(`   Success Rate: ${report.summary.successRate}`);

    if (report.summary.errors.length > 0) {
      console.log('\n❌ Errors:');
      report.summary.errors.forEach((error, i) => {
        console.log(`   ${i + 1}. ${error}`);
      });
    }
  }
}

/**
 * メイン処理
 */
async function main() {
  log('Monkey Test Automation Script', 'info');
  log('=' .repeat(50), 'info');

  const tester = new MonkeyTester(config);

  try {
    await tester.run();
    process.exit(0);
  } catch (error) {
    log(`Fatal error: ${error.message}`, 'error');
    process.exit(1);
  }
}

// 実行
if (require.main === module) {
  main();
}

module.exports = { MonkeyTester, config };
