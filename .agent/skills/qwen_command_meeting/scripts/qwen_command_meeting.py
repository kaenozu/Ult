#!/usr/bin/env python3
"""
Qwen Command Meeting Agent - Interactive meeting using qwen CLI command

This script provides an intelligent meeting experience using the local qwen command
line tool for conducting discussions, decision making, and generating meeting minutes.

Usage:
    python qwen_command_meeting.py [--topic "Project Planning"] [--duration 30]
"""

import argparse
import json
import os
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any

try:
    from pydantic import BaseModel, Field
    from dotenv import load_dotenv
except ImportError as e:
    print(f"Required dependencies not found: {e}")
    print("Please install: pip install pydantic python-dotenv")
    sys.exit(1)

# Load environment variables
load_dotenv()


class QwenCommandConfig(BaseModel):
    """Meeting configuration parameters."""

    topic: str = Field(default="一般会議", description="Meeting topic")
    duration_minutes: int = Field(default=30, description="Duration in minutes")
    language: str = Field(default="ja", description="Meeting language")
    qwen_model: str = Field(default="qwen", description="Qwen model to use")
    save_transcript: bool = Field(default=True, description="Save transcript")


class Message(BaseModel):
    """Chat message structure."""

    role: str  # user, assistant, system
    content: str
    timestamp: datetime
    speaker: Optional[str] = None


class MeetingTranscript:
    """Handles meeting transcript logging."""

    def __init__(self, config: QwenCommandConfig):
        self.config = config
        self.messages: List[Message] = []
        self.start_time = datetime.now()
        self.transcript_dir = Path("qwen_command_transcripts")
        self.transcript_dir.mkdir(exist_ok=True)

    def add_message(self, role: str, content: str, speaker: Optional[str] = None):
        """Add a message to the transcript."""
        message = Message(
            role=role,
            content=content,
            timestamp=datetime.now(),
            speaker=speaker or role,
        )
        self.messages.append(message)

    def save_transcript(self) -> str:
        """Save the meeting transcript to file."""
        timestamp_str = self.start_time.strftime("%Y%m%d_%H%M%S")
        filename = f"qwen_meeting_{timestamp_str}.json"
        filepath = self.transcript_dir / filename

        transcript_data = {
            "meeting_config": self.config.model_dump(),
            "start_time": self.start_time.isoformat(),
            "end_time": datetime.now().isoformat(),
            "messages": [
                {
                    "role": msg.role,
                    "content": msg.content,
                    "timestamp": msg.timestamp.isoformat(),
                    "speaker": msg.speaker,
                }
                for msg in self.messages
            ],
        }

        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(transcript_data, f, ensure_ascii=False, indent=2)

        return str(filepath)


class QwenCommandExecutor:
    """Handles qwen command execution."""

    def __init__(self, model: str = "qwen"):
        self.model = model
        self._verify_qwen_command()

    def _verify_qwen_command(self):
        """Verify that qwen command is available."""
        try:
            result = subprocess.run(
                ["qwen", "--version"], capture_output=True, text=True, timeout=10
            )
            if result.returncode == 0:
                print(f"✅ Qwen command found: {result.stdout.strip()}")
            else:
                print("⚠️  Qwen command not found. Please install qwen CLI tool.")
                print("   Installation: pip install qwen")
        except (subprocess.TimeoutExpired, FileNotFoundError) as e:
            print("❌ Qwen command not found. Please install qwen CLI tool.")
            print("   Installation: pip install qwen")
            sys.exit(1)

    def call_qwen(self, prompt: str, system_prompt: Optional[str] = None) -> str:
        """Call qwen command with prompt and return response."""
        try:
            # Build command
            cmd = ["qwen"]

            # Add model parameter if not default
            if self.model != "qwen":
                cmd.extend(["--model", self.model])

            # Add system prompt if provided
            if system_prompt:
                cmd.extend(["--system", system_prompt])

            # Add the prompt
            cmd.append(prompt)

            # Execute command
            result = subprocess.run(
                cmd, capture_output=True, text=True, timeout=60, encoding="utf-8"
            )

            if result.returncode == 0:
                return result.stdout.strip()
            else:
                error_msg = result.stderr.strip() or "Unknown error"
                print(f"❌ Qwen command error: {error_msg}")
                return f"申し訳ありません。エラーが発生しました: {error_msg}"

        except subprocess.TimeoutExpired:
            return (
                "申し訳ありません。応答がタイムアウトしました。もう一度お試しください。"
            )
        except Exception as e:
            return f"申し訳ありません。予期せぬエラーが発生しました: {str(e)}"


class QwenCommandMeetingAgent:
    """Main meeting agent using qwen command line tool."""

    def __init__(self, config: QwenCommandConfig):
        self.config = config
        self.qwen_executor = QwenCommandExecutor(config.qwen_model)
        self.transcript = MeetingTranscript(config)

    def _get_system_prompt(self) -> str:
        """Generate system prompt based on meeting configuration."""
        if self.config.language == "ja":
            return f"""
あなたはインテリジェントな会議ファシリテーターです。以下の会議を進行してください：

会議テーマ：{self.config.topic}
参加者：ユーザー、Qwen AI
予定時間：{self.config.duration_minutes}分
言語：日本語

役割：
1. 会議の進行を管理する
2. 関連する質問を投げかける
3. 意見を整理し、議論を深める
4. 合意形成を助ける
5. 重要なポイントを要約する
6. 時間管理を意識する

コミュニケーションスタイル：
- 丁寧で分かりやすい日本語を使用
- 積極的に聞き手役に回る
- 具体的な提案や質問を行う
- 建設的な対話を促進する
            """
        elif self.config.language == "en":
            return f"""
You are an intelligent meeting facilitator. Please conduct the following meeting:

Meeting Topic: {self.config.topic}
Participants: User, Qwen AI
Duration: {self.config.duration_minutes} minutes
Language: English

Your Role:
1. Manage meeting flow
2. Ask relevant questions
3. Organize opinions and deepen discussions
4. Help build consensus
5. Summarize important points
6. Be mindful of time management

Communication Style:
- Use clear, professional English
- Actively listen and engage
- Provide concrete suggestions and questions
- Facilitate constructive dialogue
            """
        else:  # Chinese
            return f"""
你是一位智能会议主持人。请主持以下会议：

会议主题：{self.config.topic}
参与者：用户、Qwen AI
预计时间：{self.config.duration_minutes}分钟
语言：中文

你的职责：
1. 管理会议进程
2. 提出相关问题
3. 整理意见，深化讨论
4. 帮助达成共识
5. 总结重要观点
6. 注意时间管理

沟通风格：
- 使用清晰、专业的中文
- 积极倾听和参与
- 提供具体建议和问题
- 促进建设性对话
            """

    def start_meeting(self):
        """Start the interactive meeting."""
        # Add initial system message
        system_prompt = self._get_system_prompt()
        self.transcript.add_message("system", system_prompt)

        # Get opening message from Qwen
        opening_prompt = (
            "会議を開始してください。"
            if self.config.language == "ja"
            else "Please start the meeting."
            if self.config.language == "en"
            else "请开始会议。"
        )

        opening_response = self.qwen_executor.call_qwen(opening_prompt, system_prompt)

        print(f"\n{'=' * 60}")
        print(f"🤖 Qwen Command Meeting Agent - {self.config.topic}")
        print(f"{'=' * 60}")
        print(f"\n📋 Meeting: {self.config.topic}")
        print(f"⏱️  Duration: {self.config.duration_minutes} minutes")
        print(f"🔧 Model: {self.config.qwen_model}")
        print(f"\n🎯 Qwen AI:")
        print(f"{opening_response}\n")

        self.transcript.add_message("assistant", opening_response, "Qwen AI")

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
                user_input = input("\n💬 Your input (or 'quit', 'summary'): ").strip()

                if user_input.lower() in ["quit", "exit", "終了", "退出"]:
                    self._end_meeting()
                    break

                if user_input.lower() in ["summary", "要約", "总结"]:
                    self._generate_summary()
                    continue

                # Add user message
                self.transcript.add_message("user", user_input, "User")

                # Get response from Qwen
                system_prompt = self._get_system_prompt()
                response = self.qwen_executor.call_qwen(user_input, system_prompt)

                print(f"\n🤖 Qwen AI:")
                print(f"{response}")

                self.transcript.add_message("assistant", response, "Qwen AI")

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

    def _generate_summary(self):
        """Generate AI-powered meeting summary."""
        recent_messages = self.transcript.messages[-8:]  # Last 8 messages
        conversation = "\n".join(
            [f"{msg.speaker}: {msg.content}" for msg in recent_messages]
        )

        summary_prompt = (
            f"""
以下の会議内容を要約してください：

{conversation}

重要なポイント、決定事項、次のアクション項目を整理してください。
会議の結論と今後の展望を含めてください。
        """
            if self.config.language == "ja"
            else f"""
Please summarize the following meeting content:

{conversation}

Please organize the key points, decisions, and next action items.
Include meeting conclusions and future outlook.
        """
        )

        system_prompt = self._get_system_prompt()
        summary = self.qwen_executor.call_qwen(summary_prompt, system_prompt)

        print(f"\n📝 **AI Meeting Summary:**")
        print(f"{summary}")

        self.transcript.add_message(
            "assistant", f"Summary: {summary}", "Qwen AI Summary"
        )

    def _end_meeting(self):
        """End the meeting and save transcript."""
        print("\n🎯 Meeting Concluding...")

        # Get closing message from Qwen
        closing_prompt = (
            "会議を締めくくる言葉を述べてください。重要な議論の要約と次のステップを含めてください。"
            if self.config.language == "ja"
            else "Please provide closing remarks for the meeting, including summary of key discussions and next steps."
        )

        system_prompt = self._get_system_prompt()
        closing_response = self.qwen_executor.call_qwen(closing_prompt, system_prompt)

        print(f"\n🤖 Qwen AI - Closing Remarks:")
        print(f"{closing_response}")

        self.transcript.add_message("assistant", closing_response, "Qwen AI")

        if self.config.save_transcript:
            transcript_file = self.transcript.save_transcript()
            print(f"\n💾 Meeting transcript saved to: {transcript_file}")

        print("\n✅ Meeting completed. Thank you for participating!")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Qwen Command Meeting Agent")
    parser.add_argument("--topic", default="一般会議", help="Meeting topic")
    parser.add_argument("--duration", type=int, default=30, help="Duration in minutes")
    parser.add_argument(
        "--language", choices=["ja", "en", "zh"], default="ja", help="Meeting language"
    )
    parser.add_argument("--model", default="qwen", help="Qwen model to use")
    parser.add_argument(
        "--no-transcript", action="store_true", help="Don't save transcript"
    )

    args = parser.parse_args()

    config = QwenCommandConfig(
        topic=args.topic,
        duration_minutes=args.duration,
        language=args.language,
        qwen_model=args.model,
        save_transcript=not args.no_transcript,
    )

    agent = QwenCommandMeetingAgent(config)
    agent.start_meeting()


if __name__ == "__main__":
    main()
