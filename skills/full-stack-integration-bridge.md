# フルスタック・インテグレーション・ブリッジ (Full-stack Integration Bridge)

このスキルは、Pythonによる高度な数学的分析と、Next.jsによるモダンなUIという二つの世界を繋ぐ、強固な架け橋となるためのものです。

## 1. モデルの同期
*   **需給分析 (Supply/Demand)**:
    *   Python: `Zone(price, strength, zone_type)`
    *   TypeScript: `SupplyDemandLevel { price, strength, type }`
    *   これらの定義が乖離しないよう、変更時は双方を修正すること。
*   **市場トレンド**:
    *   Pythonの `MarketTrend (BULLISH/BEARISH/NEUTRAL)` を、フロントエンドの `trend (UP/DOWN/NEUTRAL)` に正確にマッピングする。

## 2. API連携の最適化
*   **データシリアライズ**: Pythonの数値型（numpy.float64等）がJSONシリアライズ時にエラーにならないよう、適切に標準の `float` に変換して返す。
*   **バリデーション**: フロントエンドからバックエンドにリクエストを送る際は、事前に `is_valid_symbol` 相当のチェックをTypeScript側で通すこと。

## 3. ハイブリッド・データベース戦略
*   **IndexedDB (Client)**: 頻繁にアクセスするOHLCVデータやUI設定を保持。
*   **Prisma/SQL (Future Server)**: 永続的な取引ジャーナルやユーザープロファイルを保持。
*   この二層構造を理解し、適切な場所にデータを保存すること。

## 4. 検証手順
*   バックエンド検証: `pytest backend/tests`
*   フロントエンドAPI検証: `trading-platform` ディレクトリで関連する API ルートのテストを実行する。
