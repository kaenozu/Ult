/**
 * Monkey Test Results Checker
 *
 * テスト結果を読み込んで、失敗率が閾値を超えている場合はエラーで終了する
 */

const fs = require('fs');
const path = require('path');

const REPORT_PATH = path.join(__dirname, '../monkey-test-report.json');
const FAILURE_THRESHOLD = 10; // 失敗率がこれを超えるとエラー

function checkResults() {
  console.log('🔍 Checking Monkey Test Results...\n');

  if (!fs.existsSync(REPORT_PATH)) {
    console.error(`❌ Report not found: ${REPORT_PATH}`);
    process.exit(1);
  }

  const report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));

  console.log('📊 Test Summary:');
  console.log(`   Total: ${report.summary.total}`);
  console.log(`   Passed: ${report.summary.passed}`);
  console.log(`   Failed: ${report.summary.failed}`);
  console.log(`   Success Rate: ${report.summary.successRate}\n`);

  const failureRate = (report.summary.failed / report.summary.total) * 100;

  if (failureRate > FAILURE_THRESHOLD) {
    console.error(`❌ Failure rate (${failureRate.toFixed(2)}%) exceeds threshold (${FAILURE_THRESHOLD}%)`);
    console.error('\nErrors found:');
    report.summary.errors.forEach((error, i) => {
      console.error(`   ${i + 1}. ${error}`);
    });
    process.exit(1);
  }

  console.log('✅ Test results within acceptable limits');
  process.exit(0);
}

checkResults();
