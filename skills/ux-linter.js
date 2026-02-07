const fs = require('fs');
const path = require('path');

const UI_DIR = './trading-platform/app';
const EXTENSIONS = ['.tsx', '.ts'];

const PATTERNS = [
  {
    name: '未翻訳の可能性（英語ラベル）',
    regex: /(?:label|placeholder|title|text)=["'](?!TRADER PRO|NYSE|TSE|AAPL|MSFT|GOOGL|AMZN|META|NVDA|TSLA|AMD|JPM|V|JNJ|PFE|KO|PG|XOM|UNH|BAC|INTC|QCOM)[A-Z][a-z]+(\s[A-Z][a-z]+)*["']/g,
    message: 'UIラベルに英語が残っている可能性があります。'
  },
  {
    name: '古いレスポンシブパターン',
    regex: /max-lg:hidden/g,
    message: '要素が消えるのではなく、ドロワー形式などのレスポンシブ対応を検討してください。'
  },
  {
    name: 'ハードコードされた数値',
    regex: /\(\d+\)/g,
    message: '件数表示（例: "(2)"）がハードコードされている可能性があります。実際のデータを参照してください。'
  }
];

function scanFiles(dir) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      scanFiles(fullPath);
    } else if (EXTENSIONS.includes(path.extname(file))) {
      const content = fs.readFileSync(fullPath, 'utf8');
      PATTERNS.forEach(pattern => {
        const matches = content.match(pattern.regex);
        if (matches) {
          console.log(`\n🔍 [${pattern.name}] in ${fullPath}:`);
          matches.forEach(match => console.log(`   - ${match} -> ${pattern.message}`));
        }
      });
    }
  });
}

console.log('🚀 Starting UX Linting...');
try {
  scanFiles(UI_DIR);
  console.log('\n✅ UX Linting completed.');
} catch (error) {
  console.error('❌ Error during UX linting:', error);
}
