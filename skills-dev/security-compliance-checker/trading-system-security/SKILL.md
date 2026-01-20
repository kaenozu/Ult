# Security & Compliance Checker Skill

# セキュリティ・コンプライアンス検証スキル

## Overview

AI取引プラットフォームのセキュリティ脆弱性検出、コンプライアンス遵守、およびセキュリティ強化を自動化する専門スキル。金融規制とプライバシー保護に対応した包括的なセキュリティ対策を支援します。

## Capabilities

### 1. Security Vulnerability Scanning

- SQLインジェクション脆弱性検出
- XSS（クロスサイトスクリプティング）脆弱性チェック
- CSRF（クロスサイトリクエストフォージェリ）検証
- 認証・認可の脆弱性分析
- APIセキュリティベストプラクティス検証

### 2. Compliance Checking

- GDPR（個人情報保護法）遵守チェック
- PCI DSS（カード決済セキュリティ）対応
- 金融規制（FATF、マイナンル法）遵守
- SOX（サーベンス法）対応項目検証
- 暗号通取引規制（Travel Rule）対応

### 3. Data Privacy Protection

- 個人情報のマスキング検証
- 機密データの暗号化チェック
- データ保持期間の遵守検証
- Cookieとセッション管理の安全性
- ログ出力の機密情報検出

### 4. Configuration Security Audit

- 環境変数のセキュア設定検証
- APIキーの安全な管理チェック
- データベース接続のセキュリティ検証
- CORS設定の適切性評価
- SSL/TLS設定の検証

## Implementation Strategy

### Prerequisites

- 既存のコードベース
- セキュリティスキャンツール（Bandit, Semgrep）
- コンプライアンス規制要件ドキュメント
- 脆弱性データベース（OWASP Top 10）

### Security Analysis Framework

### 1. Static Code Analysis

```python
# 脆弱性検出ルール例
SECURITY_PATTERNS = {
    "sql_injection": {
        "pattern": r"execute\s*\(.*\+.*request\.",
        "severity": "critical",
        "description": "SQLインジェクションの可能性"
    },
    "xss_vulnerability": {
        "pattern": r"<script.*>.*</script>",
        "severity": "high",
        "description": "XSS脆弱性"
    },
    "hardcoded_secrets": {
        "pattern": r"(password|api_key|secret)\s*=\s*[\"'].*[\"']",
        "severity": "critical",
        "description": "ハードコードされた機密情報"
    },
    "insecure_deserialization": {
        "pattern": r"pickle\.loads.*request",
        "severity": "critical",
        "description": "安全でないデシリアライゼーション"
    }
}
```

### 2. Compliance Validation

```python
# GDPR遵守チェック項目
GDPR_REQUIREMENTS = {
    "data_minimization": "個人データは最小限に",
    "purpose_limitation": "明確な目的に限定",
    "transparency": "透明性の確保",
    "security": "適切なセキュリティ対策",
    "accountability": "説明責任の明確化",
    "storage_limitation": "保存期間の制限",
    "international_transfers": "国外移転の適切性"
}
```

### 3. Data Classification & Protection

```python
# データ分類と保護レベル
DATA_CLASSES = {
    "public": "公開情報（例：株価情報）",
    "internal": "社内限定情報（例：内部レポート）",
    "confidential": "機密情報（例：顧客データ）",
    "restricted": "極秘情報（例：認証キー）"
}

PROTECTION_REQUIREMENTS = {
    "public": "基本アクセス制御",
    "internal": "社内ネットワーク限定",
    "confidential": "暗号化と監査ログ必須",
    "restricted": "厳格なアクセス制御と完全暗号化"
}
```

## Generated Security Reports

### 1. Vulnerability Assessment Report

```markdown
# セキュリティ脆弱性評価レポート

## 実行概要

- スキャン対象: 15,234ファイル
- 検出日時: 2026-01-20 17:00:00 JST
- 使用ツール: Bandit 1.7.5, Semgrep 1.72.0

## 検出された脆弱性

### 🔴 Critical (3件)

1. **SQLインジェクション** (src/api/trading/router.py:145)
   - 説明: ユーザー入力が直接SQLクエリに連結
   - 修正案: パラメータ化クエリを使用
   - CVSS: 9.8

2. **ハードコードされたAPIキー** (.env.example:12)
   - 説明: APIキーがプレーンテキストで保存
   - 修正案: 環境変数と暗号化を使用
   - CVSS: 8.2

3. **安全でないデシリアライゼーション** (src/utils/data_loader.py:78)
   - 説明: ユーザー入力をpickle.loadsに直接連結
   - 修正案: JSONに変更しバリデーションを追加
   - CVSS: 9.1

### 🟡 High (5件)

1. **XSS脆弱性** (src/components/dashboard/TradePanel.tsx:234)
   - 説明: ユーザー入力がサニタイズされずに表示
   - 修正案: DOMPurifyでサニタイズ
   - CVSS: 7.5

2. **CORS設定不適切** (src/api/server.py:45)
   - 説明: 全てのオリジンを許可
   - 修正案: 許可オリジンを限定
   - CVSS: 6.1
```

### 2. Compliance Status Report

```markdown
# コンプライアンス遵守状況レポート

## GDPR遵守状況 (85%)

✅ データ処理の法的根拠
✅ 個人情報の保護措置  
✅ 個人情報の透明性確保
❌ データ保持期間の管理
❌ データ主体権利の実装

## 金融規制遵守状況 (78%)

✅ 顧客確認プロセス
✅ 取引記録の保存
❌ AML（マネー・ロンダリング）対応
❌ 疑われる取引の報告

## PCI DSS準拠状況 (92%)

✅ ネットワークセキュリティ
✅ 暗号化されたデータ伝送
✅ アクセス制御
❌ 定期的な脆弱性スキャン
```

## Automated Security Fixes

### 1. Code Transformation

```python
# 脆弱性のあるコードから安全なコードへ変換
def secure_sql_query(original_code):
    """SQLインジェクション脆弱性を修正"""
    # 脆弱なコード
    # query = f"SELECT * FROM trades WHERE user = '{user}'"

    # 安全なコード
    query = "SELECT * FROM trades WHERE user = %s"
    return query

def add_input_sanitization(original_code):
    """入力サニタイズを追加"""
    # 元のコード
    # return request.POST.get('user_input')

    # 安全なコード
    user_input = request.POST.get('user_input')
    if user_input:
        user_input = html.escape(user_input)
        user_input = bleach.clean(user_input)
    return user_input
```

### 2. Configuration Generation

```yaml
# セキュリティ強化設定ファイル生成
security_config:
  authentication:
    jwt_secret: '${JWT_SECRET}'
    token_expiry: 3600
    refresh_token_expiry: 86400

  cors:
    allowed_origins:
      - '${ALLOWED_ORIGINS}'
    max_age: 86400
    credentials: true

  rate_limiting:
    default_limit: 100
    window_seconds: 60
    per_user: true

  encryption:
    algorithm: 'AES-256-GCM'
    key_rotation_days: 90

  logging:
    level: 'INFO'
    security_events: 'file'
    audit_trail: true
```

## Monitoring & Alerting

### 1. Security Event Detection

```python
# セキュリティイベント監視
class SecurityMonitor:
    def __init__(self):
        self.suspicious_activities = []
        self.failed_logins = {}
        self.anomalous_transactions = []

    def detect_suspicious_activity(self, user_id, activity_type, metadata):
        """不審な活動を検出"""
        # ログイン失敗回数チェック
        if activity_type == "failed_login":
            self.failed_logins[user_id] = self.failed_logins.get(user_id, 0) + 1
            if self.failed_logins[user_id] > 5:
                self._trigger_alert("brute_force_attack", user_id, metadata)

        # 異常な取引パターン検出
        if activity_type == "transaction":
            self._analyze_transaction_pattern(user_id, metadata)
```

## Expected Benefits

- セキュリティ脆弱性: 早期発見で90%削減
- コンプライアンス遵守: 自動チェックで85%達成
- 監査対応: 自動記録で監査準備時間80%削減
- 開発速度: セキュリティ機能実装時間60%削減

## Integration with CI/CD

```yaml
# GitHub Actionsでの自動セキュリティスキャン
security_scan:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v3

    - name: Run Security Scan
      run: |
        pip install bandit semgrep
        bandit -r . -f json -o security-report.json
        semgrep --config=auto --json -o semgrep-report.json .

    - name: Upload Security Reports
      uses: actions/upload-artifact@v3
      with:
        name: security-reports
        path: |
          security-report.json
          semgrep-report.json
```

## Use Cases

1. 新機能開発時のセキュリティレビュー自動化
2. デプロイ前の脆弱性スキャン
3. 定期的なコンプライアンス監査
4. セキュリティポリシーの自動適用
5. 監査対応の自動化と証跡管理
