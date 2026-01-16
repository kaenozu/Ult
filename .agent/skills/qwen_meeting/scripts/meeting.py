#!/usr/bin/env python3
"""
Qwen Meeting Agent - Intelligent Meeting Assistant

This script provides an interactive meeting experience with Qwen AI,
facilitating discussions, decision making, and generating meeting minutes.

Usage:
    python meeting.py [--topic "Project Planning"] [--duration 30] [--language ja]
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


class MeetingConfig(BaseModel):
    """Meeting configuration parameters."""

    topic: str = Field(default="General discussion", description="Meeting topic")
    participants: List[str] = Field(
        default=["User", "Qwen AI"], description="Participants"
    )
    duration_minutes: int = Field(default=30, description="Duration in minutes")
    language: str = Field(default="ja", description="Meeting language")
    save_transcript: bool = Field(default=True, description="Save transcript")
    qwen_model: str = Field(default="qwen-plus", description="Qwen model to use")


class Message(BaseModel):
    """Chat message structure."""

    role: str  # user, assistant, system
    content: str
    timestamp: datetime
    speaker: Optional[str] = None


class MeetingTranscript:
    """Handles meeting transcript logging."""

    def __init__(self, config: MeetingConfig):
        self.config = config
        self.messages: List[Message] = []
        self.start_time = datetime.now()
        self.transcript_dir = Path("meeting_transcripts")
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
        filename = f"meeting_{timestamp_str}.json"
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


class QwenMeetingAgent:
    """Main meeting agent with Qwen AI integration."""

    def __init__(self, config: MeetingConfig):
        self.config = config
        self.client = None
        self.transcript = MeetingTranscript(config)
        self._init_qwen_client()

    def _init_qwen_client(self):
        """Initialize Qwen API client."""
        # Try different Qwen API providers
        api_key = os.getenv("QWEN_API_KEY") or os.getenv("DASHSCOPE_API_KEY")
        base_url = os.getenv(
            "QWEN_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1"
        )

        if not api_key:
            # Fallback to OpenAI compatible format with local model
            api_key = os.getenv("OPENAI_API_KEY", "dummy-key")
            base_url = os.getenv("OPENAI_BASE_URL", "http://localhost:8000/v1")
            print(
                "Warning: Using OpenAI-compatible fallback. Set QWEN_API_KEY for Qwen access."
            )

        self.client = OpenAI(api_key=api_key, base_url=base_url)

    def _get_system_prompt(self) -> str:
        """Generate system prompt based on meeting configuration."""
        if self.config.language == "ja":
            return f"""
あなたはインテリジェントな会議ファシリテーターです。以下の会議を進行してください：

会議テーマ：{self.config.topic}
参加者：{", ".join(self.config.participants)}
予定時間：{self.config.duration_minutes}分
言語：日本語

役割：
1. 会議の進行を管理する
2. 関連する質問を投げかける
3. 意見を整理し、議論を深める
4. 合意形成を助ける
5. 重要なポイントを要約する

コミュニケーションスタイル：
- 丁寧で分かりやすい日本語を使用
- 積極的に聞き手役に回る
- 具体的な提案や質問を行う
- 時間管理を意識する
            """
        elif self.config.language == "en":
            return f"""
You are an intelligent meeting facilitator. Please conduct the following meeting:

Meeting Topic: {self.config.topic}
Participants: {", ".join(self.config.participants)}
Duration: {self.config.duration_minutes} minutes
Language: English

Your Role:
1. Manage meeting flow
2. Ask relevant questions
3. Organize opinions and deepen discussions
4. Help build consensus
5. Summarize important points

Communication Style:
- Use clear, professional English
- Actively listen and engage
- Provide concrete suggestions and questions
- Be mindful of time management
            """
        else:  # Chinese
            return f"""
你是一位智能会议主持人。请主持以下会议：

会议主题：{self.config.topic}
参与者：{", ".join(self.config.participants)}
预计时间：{self.config.duration_minutes}分钟
语言：中文

你的职责：
1. 管理会议进程
2. 提出相关问题
3. 整理意见，深化讨论
4. 帮助达成共识
5. 总结重要观点

沟通风格：
- 使用清晰、专业的中文
- 积极倾听和参与
- 提供具体建议和问题
- 注意时间管理
            """

    def _chat_with_qwen(self, messages: List[Dict[str, str]]) -> str:
        """Send messages to Qwen and get response."""
        try:
            response = self.client.chat.completions.create(
                model=self.config.qwen_model,
                messages=messages,
                temperature=0.7,
                max_tokens=1000,
            )
            return response.choices[0].message.content
        except Exception as e:
            error_msg = f"Error communicating with Qwen: {e}"
            print(error_msg)
            if self.config.language == "ja":
                return "申し訳ありません。通信エラーが発生しました。もう一度お試しいただくか、後ほど会議を再開してください。"
            elif self.config.language == "en":
                return "I apologize. A communication error occurred. Please try again or resume the meeting later."
            else:
                return "抱歉。发生了通信错误。请重试或稍后恢复会议。"

    def start_meeting(self):
        """Start the interactive meeting."""
        # Add initial system message
        system_prompt = self._get_system_prompt()
        self.transcript.add_message("system", system_prompt)

        # Get opening message from Qwen
        opening_response = self._chat_with_qwen(
            [
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": "会議を開始してください。"
                    if self.config.language == "ja"
                    else "Please start the meeting."
                    if self.config.language == "en"
                    else "请开始会议。",
                },
            ]
        )

        print(f"\n{'=' * 60}")
        print(f"🤖 Qwen Meeting Agent - {self.config.topic}")
        print(f"{'=' * 60}")
        print(f"\n📋 Meeting: {self.config.topic}")
        print(f"⏱️  Duration: {self.config.duration_minutes} minutes")
        print(f"👥 Participants: {', '.join(self.config.participants)}")
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
                user_input = input(
                    "\n💬 Your input (or 'quit' to end, 'summary' for AI summary): "
                ).strip()

                if user_input.lower() in ["quit", "exit", "終了", "退出"]:
                    self._end_meeting()
                    break

                if user_input.lower() in ["summary", "要約", "总结"]:
                    self._generate_summary()
                    continue

                # Add user message
                self.transcript.add_message("user", user_input, "User")

                # Get response from Qwen
                messages = [
                    {"role": "system", "content": self._get_system_prompt()},
                    *[
                        {"role": msg.role, "content": msg.content}
                        for msg in self.transcript.messages[-5:]
                    ],  # Last 5 messages for context
                ]

                response = self._chat_with_qwen(messages)
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
        recent_messages = self.transcript.messages[-10:]  # Last 10 messages
        conversation = "\n".join(
            [f"{msg.speaker}: {msg.content}" for msg in recent_messages]
        )

        summary_prompt = (
            f"""
以下の会議内容を要約してください：

{conversation}

重要なポイント、決定事項、次のアクション項目を整理してください。
        """
            if self.config.language == "ja"
            else f"""
Please summarize the following meeting content:

{conversation}

Please organize the key points, decisions, and next action items.
        """
        )

        summary = self._chat_with_qwen(
            [
                {
                    "role": "system",
                    "content": "あなたは専門的な会議の要約者です。"
                    if self.config.language == "ja"
                    else "You are a professional meeting summarizer.",
                },
                {"role": "user", "content": summary_prompt},
            ]
        )

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

        closing_response = self._chat_with_qwen(
            [
                {"role": "system", "content": self._get_system_prompt()},
                {"role": "user", "content": closing_prompt},
            ]
        )

        print(f"\n🤖 Qwen AI - Closing Remarks:")
        print(f"{closing_response}")

        self.transcript.add_message("assistant", closing_response, "Qwen AI")

        if self.config.save_transcript:
            transcript_file = self.transcript.save_transcript()
            print(f"\n💾 Meeting transcript saved to: {transcript_file}")

        print("\n✅ Meeting completed. Thank you for participating!")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Qwen Meeting Agent")
    parser.add_argument("--topic", default="General discussion", help="Meeting topic")
    parser.add_argument("--duration", type=int, default=30, help="Duration in minutes")
    parser.add_argument(
        "--language", choices=["ja", "en", "zh"], default="ja", help="Meeting language"
    )
    parser.add_argument(
        "--no-transcript", action="store_true", help="Don't save transcript"
    )

    args = parser.parse_args()

    config = MeetingConfig(
        topic=args.topic,
        duration_minutes=args.duration,
        language=args.language,
        save_transcript=not args.no_transcript,
    )

    agent = QwenMeetingAgent(config)
    agent.start_meeting()


if __name__ == "__main__":
    main()
