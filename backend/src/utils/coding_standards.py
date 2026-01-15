"""
コーディング規約と命名規則統一モジュール
保守性向上のための標準化を実装
"""

import re
import ast
import os
import logging
from typing import List, Dict, Any, Tuple, Optional
from pathlib import Path
from dataclasses import dataclass
from enum import Enum
import json

logger = logging.getLogger(__name__)


class NamingStyle(Enum):
    """命名規則スタイル"""

    SNAKE_CASE = "snake_case"
    CAMEL_CASE = "camelCase"
    PASCAL_CASE = "PascalCase"
    UPPER_CASE = "UPPER_CASE"
    KEBAB_CASE = "kebab-case"


@dataclass
class NamingViolation:
    """命名規則違反"""

    file_path: str
    line_number: int
    violation_type: str
    current_name: str
    suggested_name: str
    severity: str  # "low", "medium", "high"


class CodeAnalyzer:
    """コード分析クラス"""

    def __init__(self):
        self.naming_rules = {
            "function": NamingStyle.SNAKE_CASE,
            "variable": NamingStyle.SNAKE_CASE,
            "class": NamingStyle.PASCAL_CASE,
            "constant": NamingStyle.UPPER_CASE,
            "module": NamingStyle.SNAKE_CASE,
            "private_method": NamingStyle.SNAKE_CASE,
            "private_variable": NamingStyle.SNAKE_CASE,
        }

        self.violations: List[NamingViolation] = []

        # 除外リスト
        self.excluded_names = {
            "setUp",
            "tearDown",
            "setUpClass",
            "tearDownClass",  # unittest
            "setUpModule",
            "tearDownModule",
            "__init__",
            "__str__",
            "__repr__",
            "__eq__",
            "__hash__",
            "__getitem__",
            "__setitem__",
            "__contains__",
            "__iter__",
            "__len__",
            "__bool__",
            "__call__",
            "__enter__",
            "__exit__",
        }

    def analyze_directory(self, directory: str) -> List[NamingViolation]:
        """ディレクトリを分析"""
        self.violations.clear()

        for py_file in Path(directory).rglob("*.py"):
            if self._should_analyze_file(py_file):
                self.analyze_file(str(py_file))

        return self.violations

    def analyze_file(self, file_path: str) -> List[NamingViolation]:
        """ファイルを分析"""
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()

            tree = ast.parse(content)
            analyzer = ASTAnalyzer(file_path, self.naming_rules, self.excluded_names)
            analyzer.visit(tree)

            self.violations.extend(analyzer.violations)

        except Exception as e:
            logger.error(f"ファイル分析エラー ({file_path}): {e}")

        return self.violations

    def _should_analyze_file(self, file_path: Path) -> bool:
        """分析対象ファイルか判定"""
        # テストファイルは除外
        if "test_" in file_path.name or "_test.py" in file_path.name:
            return False

        # __pycache__ は除外
        if "__pycache__" in file_path.parts:
            return False

        # サードパーティライブラリは除外
        if any(exclude in str(file_path) for exclude in ["site-packages", ".venv", "venv"]):
            return False

        return True

    def generate_report(self) -> Dict[str, Any]:
        """分析レポートを生成"""
        if not self.violations:
            return {
                "total_violations": 0,
                "severity_breakdown": {},
                "violation_types": {},
                "files_affected": 0,
                "recommendations": [],
            }

        # 集計
        severity_count = {}
        type_count = {}
        files_affected = set()

        for violation in self.violations:
            # 深刻度別集計
            severity_count[violation.severity] = severity_count.get(violation.severity, 0) + 1

            # タイプ別集計
            type_count[violation.violation_type] = type_count.get(violation.violation_type, 0) + 1

            # 影響ファイル
            files_affected.add(violation.file_path)

        # 推奨事項生成
        recommendations = self._generate_recommendations()

        return {
            "total_violations": len(self.violations),
            "severity_breakdown": severity_count,
            "violation_types": type_count,
            "files_affected": len(files_affected),
            "recommendations": recommendations,
            "violations": [
                {
                    "file": v.file_path,
                    "line": v.line_number,
                    "type": v.violation_type,
                    "current": v.current_name,
                    "suggested": v.suggested_name,
                    "severity": v.severity,
                }
                for v in self.violations[:50]  # 上位50件
            ],
        }

    def _generate_recommendations(self) -> List[str]:
        """推奨事項を生成"""
        recommendations = []

        type_count = {}
        for violation in self.violations:
            type_count[violation.violation_type] = type_count.get(violation.violation_type, 0) + 1

        # 最も多い違反タイプに基づく推奨
        if type_count:
            most_common = max(type_count.items(), key=lambda x: x[1])

            if most_common[0] == "function_name":
                recommendations.append("関数名はsnake_caseを使用してください（例: calculate_price）")
            elif most_common[0] == "class_name":
                recommendations.append("クラス名はPascalCaseを使用してください（例: PriceCalculator）")
            elif most_common[0] == "variable_name":
                recommendations.append("変数名はsnake_caseを使用してください（例: current_price）")
            elif most_common[0] == "constant_name":
                recommendations.append("定数名はUPPER_CASEを使用してください（例: MAX_PRICE）")

        # 全般的な推奨
        recommendations.extend(
            [
                "一貫した命名規則を使用してください",
                "意味のある変数名や関数名を選択してください",
                "省略形は避け、説明的な名前を使用してください",
            ]
        )

        return recommendations


class ASTAnalyzer(ast.NodeVisitor):
    """AST分析クラス"""

    def __init__(self, file_path: str, naming_rules: Dict[str, NamingStyle], excluded_names: set):
        self.file_path = file_path
        self.naming_rules = naming_rules
        self.excluded_names = excluded_names
        self.violations: List[NamingViolation] = []

    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
        """関数定義を訪問"""
        if node.name not in self.excluded_names:
            self._check_name(node.name, "function_name", node.lineno, self.naming_rules["function"])

        # プライベートメソッドチェック
        if node.name.startswith("_") and not node.name.startswith("__"):
            self._check_name(
                node.name,
                "private_method",
                node.lineno,
                self.naming_rules["private_method"],
            )

        self.generic_visit(node)

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef) -> None:
        """非同期関数定義を訪問"""
        if node.name not in self.excluded_names:
            self._check_name(node.name, "function_name", node.lineno, self.naming_rules["function"])

        self.generic_visit(node)

    def visit_ClassDef(self, node: ast.ClassDef) -> None:
        """クラス定義を訪問"""
        if node.name not in self.excluded_names:
            self._check_name(node.name, "class_name", node.lineno, self.naming_rules["class"])

        self.generic_visit(node)

    def visit_Name(self, node: ast.Name) -> None:
        """変数名を訪問"""
        if isinstance(node.ctx, ast.Store):  # 代入
            if node.id not in self.excluded_names:
                # 定数チェック（大文字で始まる場合）
                if node.id.isupper():
                    self._check_name(
                        node.id,
                        "constant_name",
                        node.lineno,
                        self.naming_rules["constant"],
                    )
                else:
                    self._check_name(
                        node.id,
                        "variable_name",
                        node.lineno,
                        self.naming_rules["variable"],
                    )

        self.generic_visit(node)

    def visit_Attribute(self, node: ast.Attribute) -> None:
        """属性を訪問"""
        if isinstance(node.ctx, ast.Store):
            if node.attr not in self.excluded_names:
                self._check_name(
                    node.attr,
                    "variable_name",
                    node.lineno,
                    self.naming_rules["variable"],
                )

        self.generic_visit(node)

    def _check_name(self, name: str, name_type: str, line_no: int, expected_style: NamingStyle) -> None:
        """名前をチェック"""
        if self._is_valid_name(name, expected_style):
            return

        suggested_name = self._convert_name(name, expected_style)

        severity = self._determine_severity(name_type, name)

        violation = NamingViolation(
            file_path=self.file_path,
            line_number=line_no,
            violation_type=name_type,
            current_name=name,
            suggested_name=suggested_name,
            severity=severity,
        )

        self.violations.append(violation)

    def _is_valid_name(self, name: str, expected_style: NamingStyle) -> bool:
        """名前が有効か判定"""
        if expected_style == NamingStyle.SNAKE_CASE:
            return re.match(r"^[a-z][a-z0-9_]*$", name) is not None
        elif expected_style == NamingStyle.PASCAL_CASE:
            return re.match(r"^[A-Z][a-zA-Z0-9]*$", name) is not None
        elif expected_style == NamingStyle.UPPER_CASE:
            return re.match(r"^[A-Z][A-Z0-9_]*$", name) is not None
        elif expected_style == NamingStyle.CAMEL_CASE:
            return re.match(r"^[a-z][a-zA-Z0-9]*$", name) is not None

        return True

    def _convert_name(self, name: str, target_style: NamingStyle) -> str:
        """名前を変換"""
        if target_style == NamingStyle.SNAKE_CASE:
            # キャメルケースやパスカルケースをスネークケースに
            converted = re.sub(r"(?<!^)(?=[A-Z])", "_", name).lower()
            return converted
        elif target_style == NamingStyle.PASCAL_CASE:
            # スネークケースをパスカルケースに
            converted = "".join(word.capitalize() for word in name.split("_"))
            return converted
        elif target_style == NamingStyle.UPPER_CASE:
            # スネークケースをアッパーケースに
            converted = name.upper()
            return converted
        elif target_style == NamingStyle.CAMEL_CASE:
            # スネークケースをキャメルケースに
            words = name.split("_")
            if len(words) == 1:
                return words[0]
            converted = words[0] + "".join(word.capitalize() for word in words[1:])
            return converted

        return name

    def _determine_severity(self, name_type: str, name: str) -> str:
        """深刻度を判定"""
        # クラス名は高深刻度
        if name_type == "class_name":
            return "high"

        # 関数名は中深刻度
        elif name_type == "function_name":
            return "medium"

        # 1文字の変数名は高深刻度
        elif name_type == "variable_name" and len(name) == 1:
            return "high"

        # その他は低深刻度
        else:
            return "low"


class CodeRefactorer:
    """コードリファクタリングクラス"""

    def __init__(self):
        self.refactoring_rules = {
            "extract_function": True,
            "rename_variables": True,
            "simplify_conditionals": True,
            "remove_duplicates": True,
            "optimize_imports": True,
        }

    def refactor_file(self, file_path: str, violations: List[NamingViolation]) -> bool:
        """ファイルをリファクタリング"""
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()

            # 命名規則の修正
            refactored_content = self._fix_naming_violations(content, violations)

            # インポート最適化
            if self.refactoring_rules["optimize_imports"]:
                refactored_content = self._optimize_imports(refactored_content)

            # 重複コード削除
            if self.refactoring_rules["remove_duplicates"]:
                refactored_content = self._remove_duplicate_lines(refactored_content)

            # 変更があった場合のみ保存
            if refactored_content != content:
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(refactored_content)
                return True

        except Exception as e:
            logger.error(f"リファクタリングエラー ({file_path}): {e}")

        return False

    def _fix_naming_violations(self, content: str, violations: List[NamingViolation]) -> str:
        """命名規則違反を修正"""
        lines = content.split("\n")

        # 行番号でソート（後ろから処理するため）
        violations_sorted = sorted(violations, key=lambda v: v.line_number, reverse=True)

        for violation in violations_sorted:
            if violation.line_number <= len(lines):
                line = lines[violation.line_number - 1]

                # 置換（単語境界を考慮）
                pattern = r"\b" + re.escape(violation.current_name) + r"\b"
                replacement = violation.suggested_name

                lines[violation.line_number - 1] = re.sub(pattern, replacement, line)

        return "\n".join(lines)

    def _optimize_imports(self, content: str) -> str:
        """インポートを最適化"""
        lines = content.split("\n")
        import_lines = []
        other_lines = []
        in_import_section = True

        for line in lines:
            stripped = line.strip()

            if in_import_section:
                if stripped.startswith(("import ", "from ")):
                    # 重複チェック
                    if line not in import_lines:
                        import_lines.append(line)
                elif stripped == "" or stripped.startswith("#"):
                    import_lines.append(line)
                else:
                    in_import_section = False
                    other_lines.append(line)
            else:
                other_lines.append(line)

        # インポートをソート
        if import_lines:
            import_statements = [line for line in import_lines if line.strip().startswith(("import ", "from "))]
            import_comments = [line for line in import_lines if not line.strip().startswith(("import ", "from "))]

            import_statements.sort()

            import_lines = import_comments + import_statements

        return "\n".join(import_lines + other_lines)

    def _remove_duplicate_lines(self, content: str) -> str:
        """重複行を削除"""
        lines = content.split("\n")
        seen = set()
        unique_lines = []

        for line in lines:
            # 空行とコメント行は重複チェックから除外
            if line.strip() == "" or line.strip().startswith("#"):
                unique_lines.append(line)
            elif line not in seen:
                seen.add(line)
                unique_lines.append(line)

        return "\n".join(unique_lines)


class CodingStandardEnforcer:
    """コーディング規約強制クラス"""

    def __init__(self):
        self.analyzer = CodeAnalyzer()
        self.refactorer = CodeRefactorer()

        # コーディング規約
        self.standards = {
            "max_line_length": 88,
            "max_function_length": 50,
            "max_class_length": 200,
            "max_complexity": 10,
            "require_docstrings": True,
            "require_type_hints": True,
        }

    def enforce_standards(self, directory: str, auto_fix: bool = False) -> Dict[str, Any]:
        """コーディング規約を強制"""
        logger.info(f"コーディング規約チェック開始: {directory}")

        # 分析実行
        violations = self.analyzer.analyze_directory(directory)

        # レポート生成
        report = self.analyzer.generate_report()

        # 自動修正
        fixed_files = []
        if auto_fix and violations:
            logger.info("自動修正を実行...")

            # ファイル別にグループ化
            violations_by_file = {}
            for violation in violations:
                if violation.file_path not in violations_by_file:
                    violations_by_file[violation.file_path] = []
                violations_by_file[violation.file_path].append(violation)

            # 各ファイルを修正
            for file_path, file_violations in violations_by_file.items():
                if self.refactorer.refactor_file(file_path, file_violations):
                    fixed_files.append(file_path)
                    logger.info(f"修正完了: {file_path}")

        report["auto_fixed_files"] = fixed_files

        logger.info(f"コーディング規約チェック完了: {len(violations)}件の違反を発見")

        return report


# グローバルインスタンス
standard_enforcer = CodingStandardEnforcer()


def enforce_coding_standards(directory: str, auto_fix: bool = False) -> Dict[str, Any]:
    """コーディング規約を強制実行"""
    return standard_enforcer.enforce_standards(directory, auto_fix)


def analyze_code_quality(directory: str) -> Dict[str, Any]:
    """コード品質を分析"""
    analyzer = CodeAnalyzer()
    violations = analyzer.analyze_directory(directory)
    return analyzer.generate_report()


# メイン実行関数
def main():
    """メイン実行"""
    import sys

    if len(sys.argv) < 2:
        print("使用方法: python coding_standards.py <directory> [--auto-fix]")
        sys.exit(1)

    directory = sys.argv[1]
    auto_fix = "--auto-fix" in sys.argv

    if not os.path.exists(directory):
        print(f"ディレクトリが存在しません: {directory}")
        sys.exit(1)

    # コーディング規約を強制
    report = enforce_coding_standards(directory, auto_fix)

    # 結果出力
    print(f"\n=== コーディング規約チェック結果 ===")
    print(f"総違反数: {report['total_violations']}")
    print(f"影響ファイル数: {report['files_affected']}")

    if report["auto_fixed_files"]:
        print(f"自動修正ファイル数: {len(report['auto_fixed_files'])}")

    print(f"\n=== 深刻度別内訳 ===")
    for severity, count in report["severity_breakdown"].items():
        print(f"{severity}: {count}")

    print(f"\n=== 違反タイプ別内訳 ===")
    for vtype, count in report["violation_types"].items():
        print(f"{vtype}: {count}")

    print(f"\n=== 推奨事項 ===")
    for i, rec in enumerate(report["recommendations"], 1):
        print(f"{i}. {rec}")

    # 詳細違反リスト（JSONファイルに保存）
    with open("coding_standards_report.json", "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    print(f"\n詳細レポートを保存: coding_standards_report.json")


if __name__ == "__main__":
    main()
