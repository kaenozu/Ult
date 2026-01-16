#!/usr/bin/env python3
"""
AGStock Ult Refactor Assistant

コード品質分析とリファクタリング支援
"""

import os
import sys
import json
import re
import ast
import math
import argparse
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass
from collections import defaultdict

# プロジェクトルートをパスに追加
project_root = Path(__file__).resolve().parent.parent.parent

@dataclass
class CodeIssue:
    """コード問題"""
    type: str
    severity: str  # low, medium, high, critical
    file_path: str
    line_number: int
    message: str
    suggestion: str
    auto_fixable: bool = False

@dataclass
class CodeMetrics:
    """コードメトリクス"""
    file_path: str
    lines_of_code: int
    complexity: int
    functions: int
    classes: int
    maintainability_index: float

class RefactorAssistant:
    """リファクタリング支援エージェント"""
    
    def __init__(self):
        self.project_root = project_root
        self.issues: List[CodeIssue] = []
        self.metrics: List[CodeMetrics] = []
        
        # デフォルト設定
        self.config = {
            "max_function_complexity": 10,
            "max_file_complexity": 50,
            "min_duplicate_lines": 5,
            "min_similarity": 0.8,
            "max_function_length": 50,
            "max_parameter_count": 5,
            "ignore_dirs": ["node_modules", ".git", "dist", "build"],
            "ignore_files": ["*.min.js", "*.bundle.js"]
        }
        
        self._load_config()
    
    def _load_config(self):
        """設定ファイル読み込み"""
        config_file = self.project_root / ".refactor.json"
        if config_file.exists():
            try:
                with open(config_file, 'r', encoding='utf-8') as f:
                    user_config = json.load(f)
                self.config.update(user_config.get("rules", {}))
                print(f"[CONFIG] Loaded configuration from {config_file}")
            except Exception as e:
                print(f"[WARNING] Failed to load config: {e}")
    
    def analyze_codebase(self, target_path: str = None) -> Dict[str, Any]:
        """コードベース全体を分析"""
        print("[ANALYZE] コードベース分析を開始します...")
        
        if target_path:
            target = self.project_root / target_path
        else:
            target = self.project_root / "src"
        
        if not target.exists():
            print(f"[ERROR] Path not found: {target}")
            return {"error": "Path not found"}
        
        # ファイル探索
        files = self._find_source_files(target)
        print(f"[FOUND] {len(files)}個のソースファイルを発見")
        
        # 各ファイルを分析
        for file_path in files:
            self._analyze_file(file_path)
        
        # 重複コード検出
        self._find_duplicates(files)
        
        # 結果集計
        return self._generate_report()
    
    def _find_source_files(self, path: Path) -> List[Path]:
        """ソースファイルを探索"""
        source_files = []
        
        for file_path in path.rglob("*"):
            # 無視ディレクトリをスキップ
            if any(ignore_dir in str(file_path) for ignore_dir in self.config["ignore_dirs"]):
                continue
            
            # 対象ファイル拡張子
            if file_path.suffix in ['.ts', '.tsx', '.js', '.jsx', '.py']:
                source_files.append(file_path)
        
        return source_files
    
    def _analyze_file(self, file_path: Path):
        """ファイルを分析"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # ファイルタイプ判定
            if file_path.suffix in ['.ts', '.tsx', '.js', '.jsx']:
                self._analyze_typescript_file(file_path, content)
            elif file_path.suffix == '.py':
                self._analyze_python_file(file_path, content)
                
        except Exception as e:
            print(f"[ERROR] Failed to analyze {file_path}: {e}")
    
    def _analyze_typescript_file(self, file_path: Path, content: str):
        """TypeScript/JavaScriptファイルを分析"""
        lines = content.split('\\n')
        
        # 基本メトリクス
        metrics = CodeMetrics(
            file_path=str(file_path.relative_to(self.project_root)),
            lines_of_code=len(lines),
            complexity=0,
            functions=0,
            classes=0,
            maintainability_index=0
        )
        
        # 関数カウント
        function_matches = re.findall(r'\\b(function|const|let)\\s+\\w+\\s*=\\s*(?:\\([^)]*\\)\\s*)?=>|\\bfunction\\s+\\w+', content)
        metrics.functions = len(function_matches)
        
        # クラスカウント
        class_matches = re.findall(r'\\bclass\\s+\\w+', content)
        metrics.classes = len(class_matches)
        
        # 複雑度計算（簡易）
        metrics.complexity = self._calculate_complexity(content)
        
        # メンテナンス性指数（簡易計算）
        metrics.maintainability_index = self._calculate_maintainability_index(metrics)
        
        self.metrics.append(metrics)
        
        # 各種問題検出
        self._check_long_functions(file_path, content, lines)
        self._check_complexity(file_path, metrics)
        self._check_unused_variables(file_path, content)
        self._check_magic_numbers(file_path, content)
        self._check_large_parameters(file_path, content)
    
    def _analyze_python_file(self, file_path: Path, content: str):
        """Pythonファイルを分析"""
        try:
            tree = ast.parse(content)
            
            lines = content.split('\\n')
            
            metrics = CodeMetrics(
                file_path=str(file_path.relative_to(self.project_root)),
                lines_of_code=len(lines),
                complexity=0,
                functions=0,
                classes=0,
                maintainability_index=0
            )
            
            # AST分析
            for node in ast.walk(tree):
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    metrics.functions += 1
                    # 関数の複雑度
                    func_complexity = self._calculate_ast_complexity(node)
                    if func_complexity > self.config["max_function_complexity"]:
                        self.issues.append(CodeIssue(
                            type="complexity",
                            severity="high",
                            file_path=metrics.file_path,
                            line_number=node.lineno,
                            message=f"Function '{node.name}' has high complexity ({func_complexity})",
                            suggestion=f"Consider breaking down function '{node.name}' into smaller functions",
                            auto_fixable=False
                        ))
                
                elif isinstance(node, ast.ClassDef):
                    metrics.classes += 1
            
            metrics.complexity = self._calculate_ast_complexity(tree)
            metrics.maintainability_index = self._calculate_maintainability_index(metrics)
            
            self.metrics.append(metrics)
            
        except SyntaxError as e:
            print(f"[ERROR] Syntax error in {file_path}: {e}")
    
    def _calculate_complexity(self, content: str) -> int:
        """簡易的な複雑度計算"""
        # 制御文のカウント
        complexity_keywords = ['if', 'else', 'elif', 'for', 'while', 'try', 'except', 'catch', 'switch', 'case']
        complexity = 0
        
        for keyword in complexity_keywords:
            complexity += len(re.findall(r'\\b' + keyword + r'\\b', content))
        
        # 論理演算子
        complexity += len(re.findall(r'&&|\\|\\||and|or', content))
        
        return complexity
    
    def _calculate_ast_complexity(self, node) -> int:
        """ASTベースの複雑度計算"""
        complexity = 1
        
        for child in ast.walk(node):
            if isinstance(child, (ast.If, ast.For, ast.While, ast.Try, ast.With)):
                complexity += 1
            elif isinstance(child, ast.BoolOp):
                complexity += len(child.values) - 1
        
        return complexity
    
    def _calculate_maintainability_index(self, metrics: CodeMetrics) -> float:
        """メンテナンス性指数の計算（簡易）"""
        if metrics.lines_of_code == 0:
            return 100.0
        
        # 簡易的な計算式
        loc_factor = max(0, 171 - 5.2 * math.log(metrics.lines_of_code))
        complexity_factor = max(0, 50 - 2 * math.log(metrics.complexity + 1))
        
        return min(100, (loc_factor + complexity_factor) / 2.21)
    
    def _check_long_functions(self, file_path: Path, content: str, lines: List[str]):
        """長すぎる関数をチェック"""
        # 関数ブロックを検出
        function_pattern = r'(?:function|const|let)\\s+(\\w+)\\s*=\\s*(?:\\([^)]*\\)\\s*)?=>|function\\s+(\\w+)\\s*\\([^)]*\\)'
        
        for match in re.finditer(function_pattern, content, re.MULTILINE):
            func_name = match.group(1) or match.group(2)
            start_pos = match.end()
            
            # 関数の終わりを探す（簡易）
            brace_count = 0
            func_lines = 0
            
            for i, char in enumerate(content[start_pos:], start=start_pos):
                if char == '{':
                    brace_count += 1
                elif char == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        break
                elif char == '\\n':
                    func_lines += 1
            
            if func_lines > self.config["max_function_length"]:
                line_num = content[:start_pos].count('\\n') + 1
                self.issues.append(CodeIssue(
                    type="long_function",
                    severity="medium",
                    file_path=str(file_path.relative_to(self.project_root)),
                    line_number=line_num,
                    message=f"Function '{func_name}' is too long ({func_lines} lines)",
                    suggestion=f"Consider breaking down '{func_name}' into smaller functions",
                    auto_fixable=False
                ))
    
    def _check_complexity(self, file_path: Path, metrics: CodeMetrics):
        """複雑度をチェック"""
        if metrics.complexity > self.config["max_file_complexity"]:
            self.issues.append(CodeIssue(
                type="file_complexity",
                severity="high",
                file_path=metrics.file_path,
                line_number=1,
                message=f"File has high complexity ({metrics.complexity})",
                suggestion="Consider splitting file into smaller modules",
                auto_fixable=False
            ))
    
    def _check_unused_variables(self, file_path: Path, content: str):
        """未使用変数をチェック"""
        # 変数宣言を検出
        var_pattern = r'(?:const|let|var)\\s+(\\w+)'
        declared_vars = re.findall(var_pattern, content)
        
        # 使用されている変数を検出
        used_vars = set()
        for var in declared_vars:
            # 変数名の出現回数をカウント
            pattern = r'\\b' + re.escape(var) + r'\\b'
            occurrences = len(re.findall(pattern, content))
            
            # 宣言を除いて1回以上使用されているか
            if occurrences > 1:
                used_vars.add(var)
        
        # 未使用変数を報告
        unused_vars = set(declared_vars) - used_vars
        for var in unused_vars:
            # 特定の変数は無視
            if var.startswith('_') or var in ['React', 'useEffect', 'useState']:
                continue
                
            var_line = content[:content.find(var)].count('\\n') + 1
            self.issues.append(CodeIssue(
                type="unused_variable",
                severity="low",
                file_path=str(file_path.relative_to(self.project_root)),
                line_number=var_line,
                message=f"Variable '{var}' is declared but never used",
                suggestion=f"Remove unused variable '{var}' or use it",
                auto_fixable=True
            ))
    
    def _check_magic_numbers(self, file_path: Path, content: str):
        """マジックナンバーをチェック"""
        # 数字リテラルを検出（一部除外）
        magic_pattern = r'(?<!\\w)(\\d{2,}|[1-9]\\d*)(?!\\w)'
        
        for match in re.finditer(magic_pattern, content):
            number = match.group()
            line_num = content[:match.start()].count('\\n') + 1
            
            # 一般的な値は無視
            if number in ['0', '1', '10', '100', '1000']:
                continue
                
            # CSSクラスやバージョン番号を無視
            line_content = content.split('\\n')[line_num - 1]
            if 'px\\'' in line_content or 'vh\\'' in line_content or '\\\"' in line_content:
                continue
            
            self.issues.append(CodeIssue(
                type="magic_number",
                severity="low",
                file_path=str(file_path.relative_to(self.project_root)),
                line_number=line_num,
                message=f"Magic number '{number}' found",
                suggestion=f"Consider defining a named constant for '{number}'",
                auto_fixable=False
            ))
    
    def _check_large_parameters(self, file_path: Path, content: str):
        """多すぎるパラメータをチェック"""
        # 関数パラメータを検出
        func_pattern = r'\\(([^)]*)\\)\\s*=>|function\\s+\\w+\\s*\\(([^)]*)\\)'
        
        for match in re.finditer(func_pattern, content):
            params_str = match.group(1) or match.group(2)
            if not params_str.strip():
                continue
            
            # パラメータを分割
            params = [p.strip() for p in params_str.split(',') if p.strip()]
            
            if len(params) > self.config["max_parameter_count"]:
                line_num = content[:match.start()].count('\\n') + 1
                self.issues.append(CodeIssue(
                    type="many_parameters",
                    severity="medium",
                    file_path=str(file_path.relative_to(self.project_root)),
                    line_number=line_num,
                    message=f"Function has too many parameters ({len(params)})",
                    suggestion="Consider using an options object or reducing parameters",
                    auto_fixable=False
                ))
    
    def _find_duplicates(self, files: List[Path]):
        """重複コードを検出"""
        print("[DUPLICATES] 重複コードを検出中...")
        
        code_blocks = defaultdict(list)
        
        # ファイルからコードブロックを抽出
        for file_path in files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                lines = content.split('\\n')
                
                # 5行以上のブロックを抽出
                for i in range(len(lines) - self.config["min_duplicate_lines"] + 1):
                    block = '\\n'.join(lines[i:i + self.config["min_duplicate_lines"]])
                    # 空白とコメントを正規化
                    normalized_block = self._normalize_code(block)
                    
                    if len(normalized_block.strip()) > 20:  # 最低長フィルタ
                        code_blocks[normalized_block].append({
                            'file': file_path,
                            'line': i + 1,
                            'content': block
                        })
                        
            except Exception as e:
                print(f"[ERROR] Failed to analyze {file_path} for duplicates: {e}")
        
        # 重複を検出
        for block_hash, occurrences in code_blocks.items():
            if len(occurrences) > 1:
                for occ in occurrences:
                    self.issues.append(CodeIssue(
                        type="duplicate_code",
                        severity="medium",
                        file_path=str(occ['file'].relative_to(self.project_root)),
                        line_number=occ['line'],
                        message=f"Duplicate code block found (appears {len(occurrences)} times)",
                        suggestion="Extract duplicate code into a shared function or utility",
                        auto_fixable=False
                    ))
    
    def _normalize_code(self, code: str) -> str:
        """コードを正規化（比較用）"""
        # 空白を正規化
        normalized = re.sub(r'\\s+', ' ', code)
        # コメントを削除
        normalized = re.sub(r'//.*', '', normalized)
        normalized = re.sub(r'/\\*.*?\\*/', '', normalized, flags=re.DOTALL)
        # 両端の空白を削除
        return normalized.strip()
    
    def _generate_report(self) -> Dict[str, Any]:
        """分析レポートを生成"""
        # 重要度別集計
        severity_counts = defaultdict(int)
        type_counts = defaultdict(int)
        auto_fixable_count = 0
        
        for issue in self.issues:
            severity_counts[issue.severity] += 1
            type_counts[issue.type] += 1
            if issue.auto_fixable:
                auto_fixable_count += 1
        
        # 品質スコア計算
        quality_score = self._calculate_quality_score()
        
        # 平均メトリクス
        avg_complexity = sum(m.complexity for m in self.metrics) / len(self.metrics) if self.metrics else 0
        avg_maintainability = sum(m.maintainability_index for m in self.metrics) / len(self.metrics) if self.metrics else 0
        
        return {
            "summary": {
                "total_files_analyzed": len(self.metrics),
                "total_issues_found": len(self.issues),
                "quality_score": quality_score,
                "auto_fixable_issues": auto_fixable_count,
                "severity_breakdown": dict(severity_counts),
                "type_breakdown": dict(type_counts)
            },
            "metrics": {
                "average_complexity": round(avg_complexity, 2),
                "average_maintainability_index": round(avg_maintainability, 2),
                "total_lines_of_code": sum(m.lines_of_code for m in self.metrics)
            },
            "issues": [
                {
                    "type": issue.type,
                    "severity": issue.severity,
                    "file": issue.file_path,
                    "line": issue.line_number,
                    "message": issue.message,
                    "suggestion": issue.suggestion,
                    "auto_fixable": issue.auto_fixable
                }
                for issue in self.issues
            ],
            "file_metrics": [
                {
                    "file": metric.file_path,
                    "lines_of_code": metric.lines_of_code,
                    "complexity": metric.complexity,
                    "functions": metric.functions,
                    "classes": metric.classes,
                    "maintainability_index": round(metric.maintainability_index, 2)
                }
                for metric in self.metrics
            ]
        }
    
    def _calculate_quality_score(self) -> float:
        """品質スコアを計算"""
        if not self.metrics:
            return 100.0
        
        # 基本スコア
        base_score = 100.0
        
        # 問題による減点
        for issue in self.issues:
            if issue.severity == "critical":
                base_score -= 10
            elif issue.severity == "high":
                base_score -= 5
            elif issue.severity == "medium":
                base_score -= 2
            elif issue.severity == "low":
                base_score -= 1
        
        # メンテナンス性による加減点
        avg_maintainability = sum(m.maintainability_index for m in self.metrics) / len(self.metrics)
        if avg_maintainability < 50:
            base_score -= 10
        elif avg_maintainability > 80:
            base_score += 5
        
        return max(0, min(100, base_score))
    
    def auto_fix_issues(self, dry_run: bool = False) -> Dict[str, Any]:
        """自動修正可能な問題を修正"""
        auto_fixable_issues = [issue for issue in self.issues if issue.auto_fixable]
        
        if not auto_fixable_issues:
            print("[AUTO-FIX] 修正可能な問題が見つかりませんでした")
            return {"fixed_issues": 0, "message": "No auto-fixable issues found"}
        
        print(f"[AUTO-FIX] {len(auto_fixable_issues)}個の問題を修正中...")
        
        fixed_count = 0
        
        for issue in auto_fixable_issues:
            if issue.type == "unused_variable":
                success = self._fix_unused_variable(issue, dry_run)
                if success:
                    fixed_count += 1
        
        result = {
            "fixed_issues": fixed_count,
            "total_auto_fixable": len(auto_fixable_issues),
            "dry_run": dry_run
        }
        
        if dry_run:
            result["message"] = f"Dry run: Would fix {fixed_count} issues"
        else:
            result["message"] = f"Successfully fixed {fixed_count} issues"
        
        return result
    
    def _fix_unused_variable(self, issue: CodeIssue, dry_run: bool = False) -> bool:
        """未使用変数を修正"""
        try:
            file_path = self.project_root / issue.file_path
            
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            lines = content.split('\\n')
            line_idx = issue.line_number - 1
            
            if line_idx < len(lines):
                # 未使用変数の行を削除またはコメントアウト
                if dry_run:
                    print(f"[DRY RUN] Would remove unused variable at line {issue.line_number} in {issue.file_path}")
                else:
                    lines[line_idx] = f"// REMOVED: {lines[line_idx]}"
                    
                    with open(file_path, 'w', encoding='utf-8') as f:
                        f.write('\\n'.join(lines))
                    
                    print(f"[FIXED] Removed unused variable at line {issue.line_number} in {issue.file_path}")
                
                return True
                
        except Exception as e:
            print(f"[ERROR] Failed to fix unused variable in {issue.file_path}: {e}")
        
        return False

def main():
    """メイン実行関数"""
    import math
    
    parser = argparse.ArgumentParser(description="Refactor Assistant Skill")
    parser.add_argument("--path", help="Target path to analyze")
    parser.add_argument("--file", help="Specific file to analyze")
    parser.add_argument("--focus", nargs="+", 
                       choices=["complexity", "duplicates", "smells", "security", "performance"],
                       help="Focus on specific analysis types")
    parser.add_argument("--auto-fix", action="store_true", help="Auto-fix simple issues")
    parser.add_argument("--dry-run", action="store_true", help="Dry run for auto-fix")
    parser.add_argument("--report", action="store_true", help="Generate detailed report")
    parser.add_argument("--verbose", action="store_true", help="Verbose output")
    
    args = parser.parse_args()
    
    assistant = RefactorAssistant()
    
    if args.file:
        # 単一ファイル分析
        file_path = project_root / args.file
        if file_path.exists():
            assistant._analyze_file(file_path)
        else:
            print(f"[ERROR] File not found: {args.file}")
            return
    else:
        # コードベース分析
        result = assistant.analyze_codebase(args.path)
        
        if "error" in result:
            print(f"[ERROR] {result['error']}")
            return
        
        # 結果表示
        print(f"\\n[RESULTS] 分析完了")
        print(f"  分析ファイル数: {result['summary']['total_files_analyzed']}")
        print(f"  発見問題数: {result['summary']['total_issues_found']}")
        print(f"  品質スコア: {result['summary']['quality_score']}/100")
        print(f"  自動修正可能: {result['summary']['auto_fixable_issues']}件")
        
        if args.verbose:
            print(f"\\n[METRICS]")
            print(f"  平均複雑度: {result['metrics']['average_complexity']}")
            print(f"  平均メンテナンス性: {result['metrics']['average_maintainability_index']}")
            print(f"  総コード行数: {result['metrics']['total_lines_of_code']}")
        
        # 重要度別問題表示
        severity_breakdown = result['summary']['severity_breakdown']
        if severity_breakdown:
            print(f"\\n[ISSUES BY SEVERITY]")
            for severity, count in severity_breakdown.items():
                print(f"  {severity}: {count}件")
        
        # 自動修正実行
        if args.auto_fix and result['summary']['auto_fixable_issues'] > 0:
            auto_result = assistant.auto_fix_issues(args.dry_run)
            print(f"\\n[AUTO-FIX] {auto_result['message']}")
        
        # レポート保存
        if args.report:
            report_file = project_root / "refactor_report.json"
            with open(report_file, 'w', encoding='utf-8') as f:
                json.dump(result, f, ensure_ascii=False, indent=2)
            print(f"\\n[REPORT] 詳細レポートを保存しました: {report_file}")

if __name__ == "__main__":
    main()