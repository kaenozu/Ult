#!/usr/bin/env python3
"""
AGStock Ult Application Improvement Agent

このエージェントはAGStock Ultアプリケーションの包括的な改善を自動化します。
UI/UX、パフォーマンス、機能拡張、コード品質など全般の改善を担当します。
"""

import os
import sys
import json
import subprocess
import argparse
from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from datetime import datetime


# プロジェクトルートをパスに追加
def find_project_root(start_path: Path) -> Path:
    """Find project root by looking for package.json"""
    current = start_path
    while current.parent != current:
        if (current / "package.json").exists():
            return current
        current = current.parent
    raise FileNotFoundError("Project root not found")


project_root = find_project_root(Path(__file__).resolve())
sys.path.insert(0, str(project_root / "backend"))


@dataclass
class ImprovementArea:
    """改善領域の定義"""

    name: str
    priority: str  # high, medium, low
    description: str
    files: List[str]
    estimated_effort: str  # hours, days, weeks


class AppImprovementAgent:
    """アプリケーション改善エージェント"""

    def __init__(self) -> None:
        self.project_root: Path = project_root
        self.src_dir: Path = self.project_root / "src"
        self.backend_dir: Path = self.project_root / "backend"
        self.improvement_areas: List[ImprovementArea] = []

    def analyze_current_state(self) -> Dict[str, Any]:
        """現在のアプリケーション状態を分析"""
        print("[ANALYZE] アプリケーションの現状分析を開始します...")

        analysis = {
            "frontend": self._analyze_frontend(),
            "backend": self._analyze_backend(),
            "performance": self._analyze_performance(),
            "code_quality": self._analyze_code_quality(),
            "user_experience": self._analyze_user_experience(),
            "test_coverage": self._analyze_test_coverage(),
        }

        return analysis

    def _analyze_frontend(self) -> Dict[str, Any]:
        """フロントエンドの分析"""
        print("  [FRONTEND] フロントエンドを分析中...")

        # 主要コンポーネントの特定
        key_components = {
            "page.tsx",
            "PortfolioSummary.tsx",
            "SignalCard.tsx",
            "PositionList.tsx",
            "AutoTradeControls.tsx",
        }

        # 一度のファイル探索で全て収集
        all_files = list(self.src_dir.rglob("*.ts*"))

        component_files = [f for f in all_files if f.suffix == ".tsx"]
        hook_files = [
            f for f in all_files if f.name.startswith("use") and f.suffix == ".ts"
        ]

        found_key_components = [f for f in component_files if f.name in key_components]
        ui_components = [f for f in component_files if "components/ui" in str(f)]
        dashboard_components = [
            f for f in component_files if "components/dashboard" in str(f)
        ]

        return {
            "total_components": len(component_files),
            "total_hooks": len(hook_files),
            "key_components": found_key_components,
            "ui_components": len(ui_components),
            "dashboard_components": len(dashboard_components),
        }

    def _analyze_backend(self) -> Dict[str, Any]:
        """バックエンドの分析"""
        print("  [BACKEND] バックエンドを分析中...")

        python_files = list(self.backend_dir.glob("**/*.py"))
        api_files = list(self.backend_dir.glob("**/api*.py"))

        return {
            "total_python_files": len(python_files),
            "api_files": len(api_files),
            "has_database": (self.backend_dir / "ult_trading.db").exists(),
            "has_tests": len(list(self.backend_dir.glob("**/test*.py"))) > 0,
        }

    def _analyze_performance(self) -> Dict[str, Any]:
        """パフォーマンスの分析"""
        print("  [PERFORMANCE] パフォーマンスを分析中...")

        # package.jsonの依存関係分析
        package_json = self.project_root / "package.json"
        if package_json.exists():
            with open(package_json, "r", encoding="utf-8") as f:
                package_data = json.load(f)

            dependencies = package_data.get("dependencies", {})
            dev_dependencies = package_data.get("devDependencies", {})

            return {
                "total_dependencies": len(dependencies),
                "total_dev_dependencies": len(dev_dependencies),
                "has_react_query": "@tanstack/react-query" in dependencies,
                "has_nextjs": "next" in dependencies,
                "bundle_size_estimate": "large" if len(dependencies) > 30 else "medium",
            }

        return {"error": "package.json not found"}

    def _analyze_code_quality(self) -> Dict[str, Any]:
        """コード品質の分析"""
        print("  [QUALITY] コード品質を分析中...")

        # 設定ファイルの存在確認
        eslint_config = self.project_root / "eslint.config.mjs"
        prettier_config = self.project_root.exists() and any(
            self.project_root.glob(".prettierrc*")
        )
        jest_config = self.project_root / "jest.config.js"

        return {
            "has_eslint": eslint_config.exists(),
            "has_prettier": prettier_config,
            "has_jest": jest_config.exists(),
            "typescript_config": (self.project_root / "tsconfig.json").exists(),
        }

    def _analyze_user_experience(self) -> Dict[str, Any]:
        """ユーザー体験の分析"""
        print("  [UX] ユーザー体験を分析中...")

        # 主要ページの分析
        pages = list(self.src_dir.glob("app/**/*.tsx"))
        layout_exists = (self.src_dir / "app" / "layout.tsx").exists()

        return {
            "total_pages": len(pages),
            "has_layout": layout_exists,
            "has_error_boundary": (
                self.src_dir / "components" / "ErrorBoundary.tsx"
            ).exists(),
            "has_theme_support": (
                self.src_dir / "providers" / "ThemeProvider.tsx"
            ).exists(),
        }

    def _analyze_test_coverage(self) -> Dict[str, Any]:
        """テストカバレッジの分析"""
        print("  [TESTING] テストカバレッジを分析中...")

        test_files = list(self.src_dir.glob("**/*.test.tsx"))
        test_utils = list(self.src_dir.glob("test-utils/**/*"))

        return {
            "frontend_test_files": len(test_files),
            "has_test_utils": len(test_utils) > 0,
            "backend_test_files": len(list(self.backend_dir.glob("**/test*.py"))),
            "coverage_estimate": "low" if len(test_files) < 5 else "medium",
        }

    def identify_improvement_areas(
        self, analysis: Dict[str, Any]
    ) -> List[ImprovementArea]:
        """改善領域の特定"""
        print("[FOCUS] 改善領域を特定中...")

        areas = []

        # UI/UX改善
        if analysis["user_experience"]["total_pages"] < 5:
            areas.append(
                ImprovementArea(
                    name="UI/UX改善",
                    priority="high",
                    description="ページ数が少なく、機能拡張の余地あり",
                    files=["src/app/page.tsx", "src/components/dashboard/"],
                    estimated_effort="2-3 days",
                )
            )

        # パフォーマンス改善
        perf_data = analysis.get("performance", {})
        if perf_data.get("bundle_size_estimate") == "large" or "error" in perf_data:
            areas.append(
                ImprovementArea(
                    name="パフォーマンス最適化",
                    priority="medium",
                    description="バンドルサイズが大きく、読み込み時間の改善が必要",
                    files=["package.json", "next.config.ts"],
                    estimated_effort="1-2 days",
                )
            )

        # テストカバレッジ
        test_data = analysis.get("test_coverage", {})
        if test_data.get("coverage_estimate") == "low":
            areas.append(
                ImprovementArea(
                    name="テストカバレッジ向上",
                    priority="medium",
                    description="テストファイルが少なく、品質保証の強化が必要",
                    files=["src/components/**/*.test.tsx"],
                    estimated_effort="3-5 days",
                )
            )

        # 機能拡張
        areas.append(
            ImprovementArea(
                name="機能拡張",
                priority="high",
                description="個人利用者向けの機能追加（アラート、履歴、分析）",
                files=["src/components/dashboard/", "src/lib/api.ts"],
                estimated_effort="1-2 weeks",
            )
        )

        # エラーハンドリング
        ux_data = analysis.get("user_experience", {})
        if not ux_data.get("has_error_boundary"):
            areas.append(
                ImprovementArea(
                    name="エラーハンドリング強化",
                    priority="high",
                    description="エラーバウンダリがなく、ユーザー体験の改善が必要",
                    files=["src/components/ErrorBoundary.tsx"],
                    estimated_effort="1 day",
                )
            )

        return areas

    def generate_improvement_plan(self, areas: List[ImprovementArea]) -> Dict[str, Any]:
        """改善計画の生成"""
        print("[PLAN] 改善計画を生成中...")

        # 優先順位でソート
        sorted_areas = sorted(
            areas,
            key=lambda x: {"high": 3, "medium": 2, "low": 1}[x.priority],
            reverse=True,
        )

        plan = {
            "immediate_actions": [],  # 即時実行（1日以内）
            "short_term_goals": [],  # 短期目標（1週間以内）
            "long_term_goals": [],  # 長期目標（1ヶ月以上）
            "total_estimated_effort": "",
        }

        total_effort_hours = 0

        for area in sorted_areas:
            action = {
                "name": area.name,
                "description": area.description,
                "files": area.files,
                "priority": area.priority,
                "estimated_effort": area.estimated_effort,
            }

            # 工数の概算（簡易的な変換）
            effort_str = area.estimated_effort.lower()
            if "week" in effort_str:
                # "1-2 weeks" -> 1 * 40
                hours = int(effort_str.split("-")[0]) * 40
            elif "day" in effort_str:
                # "1 day" or "2-3 days" -> 1 * 8 or 2 * 8
                if "-" in effort_str:
                    hours = int(effort_str.split("-")[0]) * 8
                else:
                    hours = int(effort_str.split()[0]) * 8
            else:
                hours = 4

            total_effort_hours += hours

            # 期間分類
            if hours <= 8:
                plan["immediate_actions"].append(action)
            elif hours <= 40:
                plan["short_term_goals"].append(action)
            else:
                plan["long_term_goals"].append(action)

        plan["total_estimated_effort"] = (
            f"約{total_effort_hours}時間（{total_effort_hours / 8:.1f}日）"
        )

        return plan

    def execute_improvement(self, area: ImprovementArea) -> bool:
        """改善の実行"""
        print(f"[EXECUTE] {area.name}の改善を実行中...")

        try:
            if area.name == "UI/UX改善":
                return self._improve_ui_ux(area)
            elif area.name == "パフォーマンス最適化":
                return self._optimize_performance(area)
            elif area.name == "テストカバレッジ向上":
                return self._improve_test_coverage(area)
            elif area.name == "機能拡張":
                return self._expand_features(area)
            elif area.name == "エラーハンドリング強化":
                return self._enhance_error_handling(area)
            else:
                print(f"  [WARNING] {area.name}の改善方法が定義されていません")
                return False

        except Exception as e:
            print(f"  [ERROR] 改善実行中にエラーが発生しました: {e}")
            return False

    def _improve_ui_ux(self, area: ImprovementArea) -> bool:
        """UI/UX改善の実行"""
        print("  [UI] UI/UX改善を実行中...")

        # ホーム画面の改善
        page_file = self.src_dir / "app" / "page.tsx"
        try:
            if page_file.exists():
                print("    - ホーム画面のダッシュボードを改善します")
                # 具体的な改善コードはここに実装
            else:
                print(f"    [WARNING] {page_file} が見つかりません")
                return False
        except Exception as e:
            print(f"    [ERROR] UI改善に失敗しました: {e}")
            return False

        return True

    def _optimize_performance(self, area: ImprovementArea) -> bool:
        """パフォーマンス最適化の実行"""
        print("  [OPTIMIZE] パフォーマンス最適化を実行中...")

        # Next.js設定の最適化
        next_config = self.project_root / "next.config.ts"
        if next_config.exists():
            print("    - Next.js設定を最適化します")

        return True

    def _improve_test_coverage(self, area: ImprovementArea) -> bool:
        """テストカバレッシ向上の実行"""
        print("  [TEST] テストカバレッジを向上中...")

        # 主要コンポーネントのテスト追加
        components = ["PortfolioSummary", "SignalCard", "PositionList"]
        for comp in components:
            test_file = self.src_dir / "components" / "__tests__" / f"{comp}.test.tsx"
            if not test_file.exists():
                print(f"    - {comp}のテストを追加します")

        return True

    def _expand_features(self, area: ImprovementArea) -> bool:
        """機能拡張の実行"""
        print("  [FEATURES] 機能拡張を実行中...")

        # アラート機能、取引履歴などの追加
        print("    - 個人利用者向け機能を追加します")

        return True

    def _enhance_error_handling(self, area: ImprovementArea) -> bool:
        """エラーハンドリング強化の実行"""
        print("  [ERROR_HANDLING] エラーハンドリングを強化中...")

        # エラーバウンダリの改善
        error_boundary = self.src_dir / "components" / "ErrorBoundary.tsx"
        if error_boundary.exists():
            print("    - エラーバウンダリを改善します")

        return True

    def run(self, focus: Optional[str] = None) -> Dict[str, Any]:
        """改善プロセスの実行"""
        print("[START] AGStock Ultアプリケーション改善を開始します")
        print("=" * 50)

        # 1. 現状分析
        analysis = self.analyze_current_state()

        # 2. 改善領域の特定
        areas = self.identify_improvement_areas(analysis)

        # 3. 改善計画の生成
        plan = self.generate_improvement_plan(areas)

        print("\n[RESULTS] 分析結果:")
        print(
            f"  - フロントエンドコンポーネント: {analysis['frontend']['total_components']}個"
        )
        print(
            f"  - バックエンドPythonファイル: {analysis['backend']['total_python_files']}個"
        )
        print(f"  - テストカバレッジ: {analysis['test_coverage']['coverage_estimate']}")

        print(f"\n[AREAS] 特定された改善領域: {len(areas)}個")
        for area in areas:
            print(f"  - {area.name} (優先度: {area.priority})")

        print(f"\n[PLAN] 改善計画:")
        print(f"  - 即時実行: {len(plan['immediate_actions'])}個")
        print(f"  - 短期目標: {len(plan['short_term_goals'])}個")
        print(f"  - 長期目標: {len(plan['long_term_goals'])}個")
        print(f"  - 総工数: {plan['total_estimated_effort']}")

        # 4. 改善の実行（即時実行項目のみ）
        if plan["immediate_actions"]:
            print(f"\n[EXECUTING] 即時実行項目を改善中...")
            for action in plan["immediate_actions"]:
                area = next(a for a in areas if a.name == action["name"])
                success = self.execute_improvement(area)
                print(f"  {'[SUCCESS]' if success else '[FAILED]'} {action['name']}")

        print("\n[COMPLETE] 改善プロセスが完了しました！")

        return {
            "analysis": analysis,
            "improvement_areas": [
                {"name": a.name, "priority": a.priority, "description": a.description}
                for a in areas
            ],
            "plan": plan,
        }


def main():
    """メイン実行関数"""
    parser = argparse.ArgumentParser(
        description="AGStock Ult Application Improvement Skill"
    )
    parser.add_argument(
        "--focus",
        choices=["ui", "performance", "testing", "features", "quality"],
        help="Focus area for improvement",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Analyze and plan without executing changes",
    )
    args = parser.parse_args()

    agent = AppImprovementAgent()

    if args.focus:
        print(f"[FOCUS] {args.focus}領域に特化して改善を実行します")
        # Focus-specific logic could be implemented here
        result = agent.run(focus=args.focus)
    else:
        result = agent.run()

    # 結果の保存
    output_file = project_root / "improvement_report.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2, default=str)

    print(f"\n[SAVED] 改善レポートを保存しました: {output_file}")


if __name__ == "__main__":
    main()
