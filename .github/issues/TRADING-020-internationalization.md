---
title: 国際化（i18n）とローカライゼーションの実装
labels: enhancement, internationalization, priority:medium
---

## 説明

### 問題
現在のシステムは日本語のみの対応で、多言語サポート、通貨変換、各国の法規制対応、タイムゾーン処理などの国際化機能がありません。これにより、グローバル展開や多言語ユーザーの獲得が困難になっています。

### 影響
- グローバル市場への展開が困難
- 多言語ユーザーに対応できない
- 各国の法規制に準拠できない
- タイムゾーン関連の混乱やエラー

### 推奨される解決策

#### 1. 多言語対応システム
```typescript
// frontend/src/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ja from './locales/ja.json';
import en from './locales/en.json';
import zh from './locales/zh.json';
import ko from './locales/ko.json';

const resources = {
  ja: { translation: ja },
  en: { translation: en },
  zh: { translation: zh },
  ko: { translation: ko },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'ja',
    debug: process.env.NODE_ENV === 'development',
    
    interpolation: {
      escapeValue: false,
    },
    
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
  });

export default i18n;
```

```json
// frontend/src/i18n/locales/en.json
{
  "common": {
    "welcome": "Welcome",
    "login": "Login",
    "logout": "Logout",
    "signup": "Sign Up",
    "cancel": "Cancel",
    "confirm": "Confirm",
    "save": "Save",
    "delete": "Delete",
    "edit": "Edit",
    "close": "Close",
    "open": "Open",
    "high": "High",
    "low": "Low",
    "volume": "Volume",
    "price": "Price",
    "change": "Change",
    "percentage": "Percentage"
  },
  "trading": {
    "buy": "Buy",
    "sell": "Sell",
    "orderType": "Order Type",
    "marketOrder": "Market Order",
    "limitOrder": "Limit Order",
    "stopOrder": "Stop Order",
    "quantity": "Quantity",
    "orderBook": "Order Book",
    "recentTrades": "Recent Trades",
    "position": "Position",
    "pnl": "P&L",
    "realized": "Realized",
    "unrealized": "Unrealized"
  },
  "errors": {
    "insufficientFunds": "Insufficient funds",
    "invalidOrder": "Invalid order",
    "marketClosed": "Market is closed",
    "rateLimit": "Rate limit exceeded",
    "networkError": "Network error. Please try again."
  }
}
```

#### 2. 通貨変換システム
```python
# backend/src/utils/currency_converter.py
from typing import Dict, Optional
from decimal import Decimal, ROUND_HALF_UP
import requests
from datetime import datetime, timedelta
import json

class CurrencyConverter:
    def __init__(self, api_key: str = None):
        self.api_key = api_key
        self.base_url = "https://api.exchangerate-api.com/v4/latest/"
        self.rates_cache = {}
        self.cache_expiry = timedelta(hours=1)
        self.last_update = None
    
    def get_exchange_rate(self, from_currency: str, to_currency: str) -> Decimal:
        """為替レートを取得"""
        if from_currency == to_currency:
            return Decimal('1')
        
        # キャッシュをチェック
        cache_key = f"{from_currency}_{to_currency}"
        if cache_key in self.rates_cache:
            cached_rate, timestamp = self.rates_cache[cache_key]
            if datetime.now() - timestamp < self.cache_expiry:
                return cached_rate
        
        # APIからレートを取得
        try:
            response = requests.get(f"{self.base_url}{from_currency}")
            data = response.json()
            
            rate = Decimal(str(data['rates'][to_currency]))
            
            # キャッシュに保存
            self.rates_cache[cache_key] = (rate, datetime.now())
            self.last_update = datetime.now()
            
            return rate
            
        except Exception as e:
            print(f"Error fetching exchange rate: {e}")
            # キャッシュされたレートがあれば使用
            if cache_key in self.rates_cache:
                return self.rates_cache[cache_key][0]
            raise
    
    def convert(self, amount: Decimal, from_currency: str, to_currency: str) -> Decimal:
        """金額を変換"""
        rate = self.get_exchange_rate(from_currency, to_currency)
        converted = amount * rate
        
        # 適切な精度に丸める
        if to_currency in ['JPY', 'KRW']:
            return converted.quantize(Decimal('1'), rounding=ROUND_HALF_UP)
        else:
            return converted.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    
    def format_currency(self, amount: Decimal, currency: str, locale: str = 'ja') -> str:
        """通貨をロケールに応じてフォーマット"""
        formats = {
            'ja': {'JPY': '¥{:,}', 'USD': '${:,.2f}', 'EUR': '€{:,.2f}'},
            'en': {'JPY': '¥{:,}', 'USD': '${:,.2f}', 'EUR': '€{:,.2f}'},
            'de': {'JPY': '¥ {:,}', 'USD': '{:,.2f} $', 'EUR': '{:,.2f} €'},
        }
        
        format_str = formats.get(locale, formats['en']).get(currency, '{:,.2f}')
        return format_str.format(amount)
    
    def get_supported_currencies(self) -> list:
        """サポートされている通貨リストを取得"""
        return ['JPY', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'CHF', 'CNY', 'KRW', 'SGD']
```

#### 3. タイムゾーン処理
```typescript
// frontend/src/utils/timezone.ts
import { format, toZonedTime, fromZonedTime } from 'date-fns-tz';

export class TimezoneManager {
  private static instance: TimezoneManager;
  private userTimezone: string;

  private constructor() {
    this.userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  static getInstance(): TimezoneManager {
    if (!TimezoneManager.instance) {
      TimezoneManager.instance = new TimezoneManager();
    }
    return TimezoneManager.instance;
  }

  setUserTimezone(timezone: string) {
    this.userTimezone = timezone;
    localStorage.setItem('user_timezone', timezone);
  }

  getUserTimezone(): string {
    return localStorage.getItem('user_timezone') || this.userTimezone;
  }

  // UTCからユーザーのタイムゾーンに変換
  convertToUserTimezone(utcDate: Date | string): Date {
    const date = typeof utcDate === 'string' ? new Date(utcDate) : utcDate;
    return toZonedTime(date, this.getUserTimezone());
  }

  // ユーザーのタイムゾーンからUTCに変換
  convertToUTC(localDate: Date | string): Date {
    const date = typeof localDate === 'string' ? new Date(localDate) : localDate;
    return fromZonedTime(date, this.getUserTimezone());
  }

  // ロケールに応じたフォーマット
  formatDate(date: Date | string, formatStr: string = 'yyyy-MM-dd HH:mm:ss'): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return format(d, formatStr, { timeZone: this.getUserTimezone() });
  }

  // 市場の営業時間をチェック
  isMarketOpen(marketTimezone: string, marketHours: { open: string; close: string }): boolean {
    const now = new Date();
    const marketTime = toZonedTime(now, marketTimezone);
    
    const currentTime = format(marketTime, 'HH:mm');
    
    return currentTime >= marketHours.open && currentTime <= marketHours.close;
  }
}

export const timezoneManager = TimezoneManager.getInstance();
```

#### 4. 法規制対応フレームワーク
```python
# backend/src/compliance/regulatory_framework.py
from enum import Enum
from typing import Dict, List, Optional
from dataclasses import dataclass
from datetime import datetime

class RegulatoryRegion(Enum):
    JAPAN = "JP"
    USA = "US"
    EU = "EU"
    UK = "UK"
    SINGAPORE = "SG"
    AUSTRALIA = "AU"

@dataclass
class RegulatoryRequirement:
    region: RegulatoryRegion
    requirement_type: str
    description: str
    validation_rules: Dict
    is_mandatory: bool = True

class RegulatoryComplianceManager:
    def __init__(self):
        self.requirements = self._load_requirements()
        self.user_regions = {}
    
    def _load_requirements(self) -> Dict[RegulatoryRegion, List[RegulatoryRequirement]]:
        """各国の規制要件を読み込み"""
        return {
            RegulatoryRegion.JAPAN: [
                RegulatoryRequirement(
                    region=RegulatoryRegion.JAPAN,
                    requirement_type="KYC",
                    description="本人確認書類の提出が必要",
                    validation_rules={"id_required": True, "address_proof": True}
                ),
                RegulatoryRequirement(
                    region=RegulatoryRegion.JAPAN,
                    requirement_type="TRADING_LIMITS",
                    description="デイトレード規制",
                    validation_rules={
                        "max_leverage": 2.0,
                        "margin_requirement": 0.3
                    }
                ),
            ],
            RegulatoryRegion.USA: [
                RegulatoryRequirement(
                    region=RegulatoryRegion.USA,
                    requirement_type="PDT",
                    description="Pattern Day Trader Rule",
                    validation_rules={
                        "min_equity": 25000,
                        "max_day_trades": 3
                    }
                ),
                RegulatoryRequirement(
                    region=RegulatoryRegion.USA,
                    requirement_type="ACCredited_INVESTOR",
                    description="特定の複雑な商品は適格投資家のみ",
                    validation_rules={"accredited_required": True}
                ),
            ],
            # 他の地域も同様に定義
        }
    
    def get_requirements_for_user(self, user_id: str, region: RegulatoryRegion) -> List[RegulatoryRequirement]:
        """ユーザーに適用される規制要件を取得"""
        return self.requirements.get(region, [])
    
    def validate_order(self, order: Dict, user_id: str, region: RegulatoryRegion) -> Dict:
        """注文が規制要件を満たしているか検証"""
        requirements = self.get_requirements_for_user(user_id, region)
        violations = []
        
        for req in requirements:
            if req.requirement_type == "TRADING_LIMITS":
                # レバレッジ制限のチェック
                if order.get('leverage', 1) > req.validation_rules.get('max_leverage', float('inf')):
                    violations.append({
                        'requirement': req.requirement_type,
                        'message': f"Leverage exceeds maximum allowed: {req.validation_rules['max_leverage']}x"
                    })
            
            elif req.requirement_type == "PDT":
                # デイトレード回数のチェック
                day_trades = self._get_user_day_trades(user_id)
                if len(day_trades) >= req.validation_rules.get('max_day_trades', float('inf')):
                    violations.append({
                        'requirement': req.requirement_type,
                        'message': "Maximum day trades exceeded"
                    })
        
        return {
            'is_valid': len(violations) == 0,
            'violations': violations
        }
    
    def _get_user_day_trades(self, user_id: str) -> List[Dict]:
        """ユーザーのデイトレード履歴を取得"""
        # TODO: データベースから取得
        return []
```

### 実装タスク
- [ ] i18nフレームワークのセットアップ
- [ ] 翻訳ファイルの作成（日本語、英語、中国語、韓国語）
- [ ] 通貨変換システムの実装
- [ ] タイムゾーン管理システムの実装
- [ ] 法規制対応フレームワークの実装
- [ ] 各国の取引規制ロジックの実装
- [ ] ロケールに応じた数値・日付フォーマットの実装
- [ ] 言語切り替えUIの実装
- [ ] ユニットテストの作成
- [ ] ドキュメントの作成

### 関連ファイル
- `frontend/src/i18n/` (新規ディレクトリ)
- `frontend/src/i18n/locales/` (新規ディレクトリ)
- `backend/src/utils/currency_converter.py` (新規ファイル)
- `backend/src/compliance/regulatory_framework.py` (新規ファイル)
- `frontend/src/utils/timezone.ts` (新規ファイル)

### 優先度
中 - グローバル展開には必須

### 複雑度
中

### 見積もり時間
4週間
