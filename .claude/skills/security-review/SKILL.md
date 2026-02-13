---
name: security-review
description: セキュリティレビューの知見を自動化。DoS防止、入力検証、設定外部化などのセキュリティパターンを一貫して適用。
model: auto
---

# セキュリティレビュー スキル

セキュリティレビューで特定された一般的な脆弱性パターンとその対策を自動化します。

## 適用シナリオ

- 新機能実装時のセキュリティチェック
- 外部入力を受け付ける機能のレビュー
- APIエンドポイントの実装
- バッチ処理やスクリーニング機能の実装
- セキュリティレビュー後の修正対応

## セキュリティチェックリスト

### 1. DoS防止

**チェック項目:**
- [ ] 入力サイズに上限を設定しているか
- [ ] バッチ処理に適切なサイズ制限があるか
- [ ] 無限ループの可能性がないか
- [ ] メモリ使用量に制限があるか

**実装パターン:**

```typescript
// ✅ 良い例: サイズ制限の実装
interface ScreenerConfig {
  maxSymbols: number;    // 最大シンボル数（例: 100）
  batchSize: number;     // バッチサイズ（例: 5）
  maxStringLength: number; // 文字列長制限（例: 20）
}

function processBatch(
  symbols: string[], 
  config: ScreenerConfig
): void {
  // 入力サイズチェック
  if (symbols.length > config.maxSymbols) {
    throw new Error(`Too many symbols: ${symbols.length} > ${config.maxSymbols}`);
  }
  
  // バッチ処理
  for (let i = 0; i < symbols.length; i += config.batchSize) {
    const batch = symbols.slice(i, i + config.batchSize);
    processBatchItem(batch);
  }
}
```

```typescript
// ❌ 悪い例: 制限なし
function processBatch(symbols: string[]): void {
  // 制限なし - DoS脆弱性あり
  for (const symbol of symbols) {
    processSymbol(symbol);
  }
}
```

### 2. 入力検証

**チェック項目:**
- [ ] 配列入力の型チェック
- [ ] 文字列の長さ制限
- [ ] 空文字・null・undefinedの除外
- [ ] 特殊文字のエスケープ
- [ ] 数値範囲の検証

**実装パターン:**

```typescript
// ✅ 良い例: 多層的な入力検証
function validateInput(
  symbols: unknown[], 
  config: ValidationConfig
): string[] {
  // 1. 配列チェック
  if (!Array.isArray(symbols)) {
    throw new Error('Input must be an array');
  }
  
  // 2. 各要素の検証
  const validated: string[] = [];
  
  for (const item of symbols) {
    // 型チェック
    if (typeof item !== 'string') {
      continue;
    }
    
    // 空文字チェック
    if (!item.trim()) {
      continue;
    }
    
    // 長さ制限
    if (item.length > config.maxStringLength) {
      continue;
    }
    
    validated.push(item.trim());
  }
  
  return validated;
}
```

### 3. 設定の外部化

**チェック項目:**
- [ ] マジックナンバーがハードコードされていないか
- [ ] 設定値がインターフェースで定義されているか
- [ ] 環境ごとの設定変更が容易か

**実装パターン:**

```typescript
// ✅ 良い例: 設定の外部化
interface SecurityConfig {
  maxSymbols: number;
  batchSize: number;
  maxStringLength: number;
  timeoutMs: number;
}

const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  maxSymbols: 100,
  batchSize: 5,
  maxStringLength: 20,
  timeoutMs: 5000
};

class SecureProcessor {
  constructor(private config: SecurityConfig = DEFAULT_SECURITY_CONFIG) {}
  
  process(input: unknown[]): void {
    // config経由で制限値を参照
    if (input.length > this.config.maxSymbols) {
      throw new Error('Input exceeds maximum size');
    }
  }
}
```

### 4. 正規表現の厳密性

**チェック項目:**
- [ ] 正規表現が適切にアンカーされているか（^$）
- [ ] 曖昧なマッチングになっていないか
- [ ] ReDoS（正規表現DoS）の脆弱性がないか

**実装パターン:**

```typescript
// ✅ 良い例: 厳密な正規表現
function isJapaneseMarket(symbol: string): boolean {
  // 4桁数字のみを日本市場と判定
  return /^[0-9]{4}$/.test(symbol);
}

// ❌ 悪い例: 曖昧な正規表現
function isJapaneseMarketLoose(symbol: string): boolean {
  // 部分一致で誤検出の可能性
  return /[0-9]{4}/.test(symbol);
}
```

### 5. エラーハンドリング

**チェック項目:**
- [ ] エラーが適切に伝播するか
- [ ] 機密情報がエラーメッセージに含まれていないか
- [ ] エラーログが構造化されているか

**実装パターン:**

```typescript
// ✅ 良い例: 適切なエラーハンドリング
class ValidationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly field?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

try {
  const result = processData(input);
  
  // 空結果のチェック
  if (!result || result.length === 0) {
    throw new ValidationError(
      'Processing resulted in empty data',
      'EMPTY_RESULT'
    );
  }
  
  return result;
} catch (error) {
  // 構造化ログ（本番環境ではロガーを使用）
  console.error('Processing failed:', {
    error: error instanceof Error ? error.message : 'Unknown error',
    code: error instanceof ValidationError ? error.code : 'UNKNOWN',
    timestamp: new Date().toISOString()
  });
  
  throw error;
}
```

## 自動アクション

以下は明示的な指示なく自動実行：

- ✅ maxSymbols/maxLengthなどのサイズ制限の提案
- ✅ 入力検証コードの自動生成
- ✅ 配列・文字列の境界値チェック追加
- ✅ マジックナンバーの設定外部化
- ✅ console.errorを構造化ロガーへの置き換え提案

## 禁止事項

- ❌ 入力サイズ制限なしのバッチ処理
- ❌ 型アサーション（`as any`）の安易な使用
- ❌ エラーの無視や空catchブロック
- ❌ 正規表現の曖昧なアンカー

## テスト要件

セキュリティ機能のテスト必須項目：

```typescript
describe('Security', () => {
  it('should reject oversized input', () => {
    const largeInput = Array(101).fill('A');
    expect(() => processor.process(largeInput)).toThrow();
  });
  
  it('should validate string length', () => {
    const longString = 'A'.repeat(21);
    expect(() => validator.validate(longString)).toThrow();
  });
  
  it('should filter empty strings', () => {
    const input = ['valid', '', '  ', 'also-valid'];
    const result = validator.validate(input);
    expect(result).toEqual(['valid', 'also-valid']);
  });
  
  it('should handle non-array input gracefully', () => {
    expect(() => processor.process(null)).toThrow();
    expect(() => processor.process('string')).toThrow();
  });
});
```

## レビュー基準

**Critical（修正必須）:**
- 入力サイズ制限の欠如
- SQL/NoSQLインジェクションの可能性
- 認証・認可の欠如

**High（強く推奨）:**
- 不十分な入力検証
- エラーメッセージでの情報漏洩
- マジックナンバーのハードコード

**Medium（推奨）:**
- console.log/errorの使用
- 型アサーションの使用
- エラーハンドリングの改善余地

## 参考実装

### AutoScreener（本プロジェクト）

```typescript
// ファイル: trading-platform/app/lib/universe/AutoScreener.ts
// セキュリティレビュー対応済みの実装例

interface ScreenerConfig {
  maxSymbols: number;      // DoS防止
  batchSize: number;       // バッチ制限
  maxStringLength: number; // 文字列長制限
}

export class AutoScreener {
  private readonly config: ScreenerConfig = {
    maxSymbols: 100,
    batchSize: 5,
    maxStringLength: 20
  };

  async screenSymbols(symbols: unknown[]): Promise<ScreenResult[]> {
    // 1. 入力検証
    if (!Array.isArray(symbols)) {
      throw new Error('Input must be an array');
    }
    
    // 2. サイズ制限
    if (symbols.length > this.config.maxSymbols) {
      throw new Error(`Too many symbols: ${symbols.length}`);
    }
    
    // 3. 文字列検証・フィルタリング
    const validSymbols = symbols
      .filter((s): s is string => typeof s === 'string')
      .map(s => s.trim())
      .filter(s => s.length > 0 && s.length <= this.config.maxStringLength);
    
    // 4. バッチ処理
    const results: ScreenResult[] = [];
    for (let i = 0; i < validSymbols.length; i += this.config.batchSize) {
      const batch = validSymbols.slice(i, i + this.config.batchSize);
      const batchResults = await this.processBatch(batch);
      results.push(...batchResults);
    }
    
    return results;
  }
}
```
