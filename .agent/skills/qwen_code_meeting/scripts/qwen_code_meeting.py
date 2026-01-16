#!/usr/bin/env python3
"""
Qwen-code Meeting Agent - Code Review and Development Discussion Agent

This script provides an intelligent meeting experience with Qwen-code AI
specifically designed for code reviews, architecture discussions, and development planning.

Usage:
    python qwen_code_meeting.py [--topic "Code Review"] [--files main.py utils.py] [--mode code]
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any

try:
    from openai import OpenAI
    from pydantic import BaseModel, Field
    from dotenv import load_dotenv
except ImportError as e:
    print(f"Required dependencies not found: {e}")
    print("Please install: pip install openai pydantic python-dotenv")
    sys.exit(1)

# Load environment variables
load_dotenv()


class CodeMeetingConfig(BaseModel):
    """Code meeting configuration parameters."""

    topic: str = Field(default="コードレビュー会議", description="Meeting topic")
    code_files: List[str] = Field(default=[], description="Code files to discuss")
    duration_minutes: int = Field(default=45, description="Duration in minutes")
    language: str = Field(default="ja", description="Meeting language")
    review_mode: str = Field(
        default="code",
        description="Review focus: code, architecture, performance, security",
    )
    qwen_model: str = Field(
        default="qwen-coder-plus", description="Qwen-code model to use"
    )


class CodeFile(BaseModel):
    """Represents a code file for discussion."""

    path: str
    content: str
    language: str
    size: int


class CodeDiscussion:
    """Manages code review discussions."""

    def __init__(self, config: CodeMeetingConfig):
        self.config = config
        self.files: List[CodeFile] = []
        self.load_code_files()

    def load_code_files(self):
        """Load code files from specified paths."""
        for file_path in self.config.code_files:
            path_obj = Path(file_path)
            if path_obj.exists():
                try:
                    with open(path_obj, "r", encoding="utf-8") as f:
                        content = f.read()

                    # Detect language from extension
                    ext = path_obj.suffix.lower()
                    lang_map = {
                        ".py": "python",
                        ".js": "javascript",
                        ".ts": "typescript",
                        ".java": "java",
                        ".cpp": "cpp",
                        ".c": "c",
                        ".go": "go",
                        ".rs": "rust",
                        ".php": "php",
                        ".rb": "ruby",
                    }
                    language = lang_map.get(ext, "text")

                    code_file = CodeFile(
                        path=str(path_obj),
                        content=content,
                        language=language,
                        size=len(content),
                    )
                    self.files.append(code_file)
                except Exception as e:
                    print(f"Warning: Could not read {file_path}: {e}")
            else:
                print(f"Warning: File not found: {file_path}")

    def get_files_summary(self) -> str:
        """Get summary of loaded code files."""
        if not self.files:
            return "No code files provided for discussion."

        summary = f"Code Files ({len(self.files)} files):\n"
        for i, file in enumerate(self.files, 1):
            summary += f"{i}. {file.path} ({file.language}, {file.size} chars)\n"
        return summary


class QwenCodeMeetingAgent:
    """Main code meeting agent with Qwen-code AI integration."""

    def __init__(self, config: CodeMeetingConfig):
        self.config = config
        self.client = None
        self.discussion = CodeDiscussion(config)
        self.conversation_history: List[Dict[str, str]] = []
        self.start_time = datetime.now()
        self._init_qwen_client()

    def _init_qwen_client(self):
        """Initialize Qwen-code API client."""
        # Try different Qwen API providers
        api_key = (
            os.getenv("QWEN_CODE_API_KEY")
            or os.getenv("QWEN_API_KEY")
            or os.getenv("DASHSCOPE_API_KEY")
        )
        base_url = os.getenv("QWEN_CODE_BASE_URL") or os.getenv(
            "QWEN_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1"
        )

        if not api_key:
            # Fallback to OpenAI compatible format
            api_key = os.getenv("OPENAI_API_KEY", "dummy-key")
            base_url = os.getenv("OPENAI_BASE_URL", "http://localhost:8000/v1")
            print(
                "Warning: Using OpenAI-compatible fallback. Set QWEN_CODE_API_KEY for Qwen-code access."
            )

        self.client = OpenAI(api_key=api_key, base_url=base_url)

    def _get_system_prompt(self) -> str:
        """Generate system prompt for code review meeting."""
        if self.config.language == "ja":
            return f"""
あなたは経験豊富なコードレビューア兼開発メンターです。以下のコードレビュー会議をファシリテートしてください。

会議テーマ：{self.config.topic}
レビューモード：{self.config.review_mode}
言語：日本語
予定時間：{self.config.duration_minutes}分

コードファイル：
{self.discussion.get_files_summary()}

役割と責任：
1. コードの品質を評価し、改善点を指摘する
2. ベストプラクティスと設計パターンを提案する
3. パフォーマンスとセキュリティの問題を特定する
4. 建設的なフィードバックを提供する
5. チームの学習を促進する

レビューの重点：
{
                "コード品質：読みやすさ、保守性、テストカバレッジ"
                if self.config.review_mode == "code"
                else "アーキテクチャ：設計の健全性、スケーラビリティ、依存関係"
                if self.config.review_mode == "architecture"
                else "パフォーマンス：効率、最適化、リソース使用"
                if self.config.review_mode == "performance"
                else "セキュリティ：脆弱性、入力検証、アクセス制御"
            }

コミュニケーションスタイル：
- 技術的に正確で分かりやすい説明
- 具体的な改善提案を提示
- ポジティブで建設的なアプローチ
- コードの意図を尊重し、学習機会を提供
            """
        else:  # English
            return f"""
You are an experienced code reviewer and development mentor. Please facilitate the following code review meeting.

Meeting Topic: {self.config.topic}
Review Mode: {self.config.review_mode}
Language: English
Duration: {self.config.duration_minutes} minutes

Code Files:
{self.discussion.get_files_summary()}

Your Responsibilities:
1. Evaluate code quality and suggest improvements
2. Recommend best practices and design patterns
3. Identify performance and security issues
4. Provide constructive feedback
5. Promote team learning

Review Focus:
{
                "Code Quality: readability, maintainability, test coverage"
                if self.config.review_mode == "code"
                else "Architecture: design soundness, scalability, dependencies"
                if self.config.review_mode == "architecture"
                else "Performance: efficiency, optimization, resource usage"
                if self.config.review_mode == "performance"
                else "Security: vulnerabilities, input validation, access control"
            }

Communication Style:
- Technically accurate and clear explanations
- Provide specific improvement suggestions
- Positive and constructive approach
- Respect code intent and provide learning opportunities
            """

    def _chat_with_qwen_code(self, messages: List[Dict[str, str]]) -> str:
        """Send messages to Qwen-code and get response."""
        try:
            response = self.client.chat.completions.create(
                model=self.config.qwen_model,
                messages=messages,
                temperature=0.3,  # Lower temperature for more consistent code analysis
                max_tokens=1500,
            )
            return response.choices[0].message.content
        except Exception as e:
            error_msg = f"Error communicating with Qwen-code: {e}"
            print(error_msg)
            if self.config.language == "ja":
                return "申し訳ありません。Qwen-codeとの通信エラーが発生しました。もう一度お試しください。"
            else:
                return "I apologize. A communication error with Qwen-code occurred. Please try again."

    def start_code_meeting(self):
        """Start the code review meeting."""
        print(f"\n{'=' * 70}")
        print(f"💻 Qwen-code Meeting Agent - {self.config.topic}")
        print(f"{'=' * 70}")
        print(f"\n📋 Meeting: {self.config.topic}")
        print(f"🎯 Review Mode: {self.config.review_mode}")
        print(f"📁 Files: {len(self.discussion.files)} files")
        print(f"⏱️  Duration: {self.config.duration_minutes} minutes")
        print(f"\n📁 Code Files:")
        for file in self.discussion.files:
            print(f"   • {file.path} ({file.language})")

        if not self.discussion.files:
            print(
                f"\n⚠️  No code files loaded. Please provide file paths using --files option."
            )
            print(f"   Example: python qwen_code_meeting.py --files main.py utils.py")
            return

        # Get opening message from Qwen-code
        system_prompt = self._get_system_prompt()
        self.conversation_history.append({"role": "system", "content": system_prompt})

        initial_prompt = (
            f"このコードレビュー会議を開始してください。提供されたコードファイルの評価から始めてください。"
            if self.config.language == "ja"
            else "Please start this code review meeting. Begin by evaluating the provided code files."
        )

        self.conversation_history.append({"role": "user", "content": initial_prompt})

        opening_response = self._chat_with_qwen_code(self.conversation_history)
        self.conversation_history.append(
            {"role": "assistant", "content": opening_response}
        )

        print(f"\n🤖 Qwen-code:")
        print(f"{opening_response}\n")

        # Main meeting loop
        self._meeting_loop()

    def _meeting_loop(self):
        """Main interactive meeting loop."""
        start_time = time.time()
        max_duration = self.config.duration_minutes * 60

        while time.time() - start_time < max_duration:
            remaining_time = max_duration - (time.time() - start_time)
            if remaining_time < 60:
                print(f"\n⏰ {int(remaining_time)}秒で会議が終了します。")

            try:
                user_input = input(
                    "\n💬 Your input (or 'quit', 'summary', 'review [file]'): "
                ).strip()

                if user_input.lower() in ["quit", "exit", "終了", "退出"]:
                    self._end_meeting()
                    break

                if user_input.lower() == "summary":
                    self._generate_summary()
                    continue

                if user_input.startswith("review "):
                    filename = user_input[7:].strip()
                    self._review_specific_file(filename)
                    continue

                if user_input.startswith("analyze "):
                    filename = user_input[8:].strip()
                    self._analyze_file(filename)
                    continue

                # Add user message
                self.conversation_history.append(
                    {"role": "user", "content": user_input}
                )

                # Get response from Qwen-code
                response = self._chat_with_qwen_code(self.conversation_history)
                self.conversation_history.append(
                    {"role": "assistant", "content": response}
                )

                print(f"\n🤖 Qwen-code:")
                print(f"{response}")

            except KeyboardInterrupt:
                print("\n\n⚡ Meeting interrupted by user.")
                self._end_meeting()
                break
            except EOFError:
                print("\n\n⚡ Meeting ended.")
                self._end_meeting()
                break

        if time.time() - start_time >= max_duration:
            print(
                f"\n⏰ Meeting time ({self.config.duration_minutes} minutes) completed."
            )
            self._end_meeting()

    def _review_specific_file(self, filename: str):
        """Review a specific code file in detail."""
        target_file = None
        for file in self.discussion.files:
            if filename in Path(file.path).name:
                target_file = file
                break

        if not target_file:
            print(f"❌ File '{filename}' not found in loaded files.")
            return

        review_prompt = (
            f"""
以下のファイル '{target_file.path}' を詳細にレビューしてください：

```{target_file.language}
{target_file.content}
```

特に以下の点に注目してください：
1. コードの品質と読みやすさ
2. バグや論理エラーの可能性
3. パフォーマンスの改善点
4. ベストプラクティスの適用
5. セキュリティ上の問題

具体的な改善案とコード例を示してください。
        """
            if self.config.language == "ja"
            else f"""
Please review the following file '{target_file.path}' in detail:

```{target_file.language}
{target_file.content}
```

Please focus on:
1. Code quality and readability
2. Potential bugs or logic errors
3. Performance improvements
4. Best practices application
5. Security issues

Provide specific improvement suggestions with code examples.
        """
        )

        self.conversation_history.append({"role": "user", "content": review_prompt})
        response = self._chat_with_qwen_code(self.conversation_history)
        self.conversation_history.append({"role": "assistant", "content": response})

        print(f"\n🤖 Qwen-code - File Review:")
        print(f"{response}")

    def _analyze_file(self, filename: str):
        """Analyze a specific code file for patterns and suggestions."""
        target_file = None
        for file in self.discussion.files:
            if filename in Path(file.path).name:
                target_file = file
                break

        if not target_file:
            print(f"❌ File '{filename}' not found in loaded files.")
            return

        analyze_prompt = (
            f"""
ファイル '{target_file.path}' のコードパターンと構造を分析してください：

```{target_file.language}
{target_file.content}
```

以下の分析を含めてください：
1. デザインパターンの識別
2. コードの複雑度評価
3. リファクタリングの提案
4. テスト戦略の提案
5. 将来の拡張性に関する考慮事項
        """
            if self.config.language == "ja"
            else f"""
Analyze the code patterns and structure of file '{target_file.path}':

```{target_file.language}
{target_file.content}
```

Please include:
1. Design pattern identification
2. Code complexity assessment
3. Refactoring recommendations
4. Testing strategy suggestions
5. Considerations for future extensibility
        """
        )

        self.conversation_history.append({"role": "user", "content": analyze_prompt})
        response = self._chat_with_qwen_code(self.conversation_history)
        self.conversation_history.append({"role": "assistant", "content": response})

        print(f"\n🤖 Qwen-code - Code Analysis:")
        print(f"{response}")

    def _generate_summary(self):
        """Generate comprehensive meeting summary."""
        summary_prompt = (
            """
このコードレビュー会議の要約を生成してください：
1. 議論された主要なポイント
2. 特定された問題と課題
3. 提案された改善策
4. 次のアクション項目
5. 学んだ教訓やベストプラクティス

会議の内容を技術的に正確かつ実用的に要約してください。
        """
            if self.config.language == "ja"
            else """
Generate a comprehensive summary of this code review meeting:
1. Key points discussed
2. Issues and challenges identified
3. Improvement recommendations
4. Next action items
5. Lessons learned and best practices

Please provide a technically accurate and practical summary of the meeting content.
        """
        )

        self.conversation_history.append({"role": "user", "content": summary_prompt})
        summary = self._chat_with_qwen_code(self.conversation_history)
        self.conversation_history.append({"role": "assistant", "content": summary})

        print(f"\n📝 **Code Review Summary:**")
        print(f"{summary}")

    def _end_meeting(self):
        """End the code review meeting."""
        print("\n🎯 Code Review Meeting Concluding...")

        closing_prompt = (
            """
コードレビュー会議を締めくくってください。主要な発見、決定事項、推奨される次のステップを要約し、チームへの最終的なアドバイスを提供してください。
        """
            if self.config.language == "ja"
            else """
Please conclude the code review meeting. Summarize the key findings, decisions, recommended next steps, and provide final advice to the team.
        """
        )

        closing_response = self._chat_with_qwen_code(
            [
                {"role": "system", "content": self._get_system_prompt()},
                {"role": "user", "content": closing_prompt},
            ]
        )

        print(f"\n🤖 Qwen-code - Closing Remarks:")
        print(f"{closing_response}")

        # Save meeting transcript
        self._save_transcript()
        print("\n✅ Code review meeting completed. Thank you!")

    def _save_transcript(self):
        """Save the meeting transcript to file."""
        timestamp_str = self.start_time.strftime("%Y%m%d_%H%M%S")
        filename = f"code_review_{timestamp_str}.json"
        transcript_dir = Path("code_review_transcripts")
        transcript_dir.mkdir(exist_ok=True)
        filepath = transcript_dir / filename

        transcript_data = {
            "meeting_config": self.config.model_dump(),
            "files_reviewed": [file.path for file in self.discussion.files],
            "start_time": self.start_time.isoformat(),
            "end_time": datetime.now().isoformat(),
            "conversation": self.conversation_history,
        }

        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(transcript_data, f, ensure_ascii=False, indent=2)

        print(f"\n💾 Meeting transcript saved to: {filepath}")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Qwen-code Meeting Agent")
    parser.add_argument("--topic", default="コードレビュー会議", help="Meeting topic")
    parser.add_argument("--files", nargs="+", default=[], help="Code files to review")
    parser.add_argument("--duration", type=int, default=45, help="Duration in minutes")
    parser.add_argument(
        "--language", choices=["ja", "en"], default="ja", help="Meeting language"
    )
    parser.add_argument(
        "--mode",
        choices=["code", "architecture", "performance", "security"],
        default="code",
        help="Review focus mode",
    )

    args = parser.parse_args()

    config = CodeMeetingConfig(
        topic=args.topic,
        code_files=args.files,
        duration_minutes=args.duration,
        language=args.language,
        review_mode=args.mode,
    )

    agent = QwenCodeMeetingAgent(config)
    agent.start_code_meeting()


if __name__ == "__main__":
    main()
