"""
音声インターフェース実装
音声による対話入力と音声読み上げ機能
"""

import asyncio
import logging
from typing import Dict, Optional, List, Any, Callable
from datetime import datetime
import streamlit as st
import io
import base64

# 音声処理ライブラリのインポート
try:
    import speech_recognition as sr
    import pyttsx3
    import wave
    import sounddevice as sd
    from pydub import AudioSegment

    AUDIO_AVAILABLE = True
except ImportError:
    logging.warning("Audio libraries not available. Install: pip install SpeechRecognition pyttsx3 pydub sounddevice")
    AUDIO_AVAILABLE = False

logger = logging.getLogger(__name__)


class VoiceInterface:
    """音声インターフェースクラス"""

    def __init__(self, language: str = "ja-JP"):
        self.language = language
        self.is_recording = False
        self.recognizer = None
        self.tts_engine = None

        if AUDIO_AVAILABLE:
            self.recognizer = sr.Recognizer(language)
            self.tts_engine = pyttsx3.init()
            self.microphone = None

    async def setup_microphone(self) -> bool:
        """マイクフォンをセットアップ"""
        if not AUDIO_AVAILABLE:
            return False

        try:
            # 利用可能なマイクフォンを取得
            devices = sr.Microphone.list_microphone_names()

            if devices:
                self.microphone = devices[0]  # 最初のデバイスを使用
                logger.info(f"Microphone setup: {self.microphone}")
                return True
            else:
                logger.warning("No microphone found")
                return False

        except Exception as e:
            logger.error(f"Microphone setup failed: {e}")
            return False

    async def start_voice_input(self, callback: Callable[[str], None]) -> bool:
        """音声入力を開始"""
        if not AUDIO_AVAILABLE:
            st.error("音声機能が利用できません")
            return False

        try:
            self.is_recording = True

            # マイクフォンのセットアップ
            if not await self.setup_microphone():
                return False

            st.session_state.voice_input_active = True

            # 音声認識の実行
            with sr.Microphone(device_index=0) as source:
                st.info("🎤 音声入力開始 - 停止するには「停止」ボタンをクリック")

                recognizer = sr.Recognizer(self.language)
                audio_data = []

                while self.is_recording:
                    try:
                        audio = recognizer.listen(source, timeout=1)
                        audio_data.append(audio)

                        # テキスト表示
                        self._update_audio_display(audio_data)

                    except sr.WaitTimeoutError:
                        continue
                    except KeyboardInterrupt:
                        break
                    except Exception as e:
                        logger.error(f"Audio recording error: {e}")
                        break

            # 録り込み完了
            if audio_data:
                st.success("🎤 音声認識中...")
                transcription = self._transcribe_audio(audio_data)
                callback(transcription)
                return True

        except Exception as e:
            logger.error(f"Voice input failed: {e}")
            self.is_recording = False
            st.session_state.voice_input_active = False
            return False

    def _transcribe_audio(self, audio_data: List) -> str:
        """音声データをテキストに変換"""
        if not audio_data:
            return ""

        try:
            # 音声データを結合
            audio_segment = AudioSegment.empty()
            for audio in audio_data:
                audio_segment += audio

            # 一時ファイルに保存
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
                audio_segment.export(temp_file.name, format="wav")

                # 音声認識
                with sr.AudioFile(temp_file.name) as source:
                    recognizer = sr.Recognizer(self.language)
                    text = recognizer.record(source=source, duration=len(audio_segment))
                    return text

        except Exception as e:
            logger.error(f"Transcription failed: {e}")
            return "音声認識エラー"

    def _update_audio_display(self, audio_data: List):
        """音声入力の表示を更新"""
        # 簡波器を表示
        if len(audio_data) > 0:
            audio_wave = np.concatenate([np.frombuffer(a.get_raw_data(), dtype=np.int16) for a in audio_data])

            # Streamlitで波形表示
            fig = {
                "data": [{"x": list(range(len(audio_wave))), "y": audio_wave.tolist()}],
                "layout": {
                    "height": 100,
                    "margin": {"t": 0, "b": 0, "l": 0, "r": 0},
                    "yaxis": {"showgrid": False, "zeroline": False},
                    "xaxis": {"showgrid": False, "zeroline": False},
                },
            }

            st.session_state.audio_visualization = fig
            st.experimental_rerun()

    def stop_voice_input(self):
        """音声入力を停止"""
        self.is_recording = False
        st.session_state.voice_input_active = False
        logger.info("Voice input stopped")

    async def speak_text(self, text: str, voice_id: Optional[str] = None) -> bool:
        """テキストを音声で読み上げ"""
        if not AUDIO_AVAILABLE or not text.strip():
            return False

        try:
            # TTSエンジンの初期化
            if not self.tts_engine:
                self.tts_engine = pyttsx3.init()

            # 音声設定
            self.tts_engine.setProperty("rate", 150)
            self.tts_engine.setProperty("volume", 1.0)

            if voice_id:
                self.tts_engine.setProperty("voice", voice_id)

            # 音声ファイルを生成
            with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as temp_file:
                self.tts_engine.save_to_file(temp_file.name, text)

                # 音声再生
                st.info(f"🔊 再生中: {text[:50]}...")

                # 音声データをBase64に変換
                with open(temp_file.name, "rb") as f:
                    audio_data = f.read()
                    audio_base64 = base64.b64encode(audio_data).decode()

                # 再生
                st.audio(audio_base64, format="audio/mp3")

                return True

        except Exception as e:
            logger.error(f"Text-to-speech failed: {e}")
            return False

    def get_available_voices(self) -> List[Dict[str, str]]:
        """利用可能な音声を取得"""
        if not AUDIO_AVAILABLE:
            return []

        try:
            voices = self.tts_engine.getProperty("voices")
            voice_list = []

            for i, voice in enumerate(voices):
                voice_info = {
                    "id": str(i),
                    "name": voice.name,
                    "gender": voice.gender,
                    "age": voice.age,
                    "languages": voice.languages,
                }
                voice_list.append(voice_info)

            return voice_list

        except Exception as e:
            logger.error(f"Get voices failed: {e}")
            return []

    def is_audio_available(self) -> bool:
        """音声機能が利用可能かチェック"""
        return AUDIO_AVAILABLE


class VoiceCommands:
    """音声コマンド処理クラス"""

    def __init__(self):
        self.commands = {
            # ポートフォリオ操作
            "portfolio": ["ポートフォリオ", "ポートフォリオ確認", "ポジション"],
            "trade": ["買い", "売り", "取引", "注文"],
            "analysis": ["分析", "分析して", "チャート", "グラフ"],
            "settings": ["設定", "オプション", "環境設定"],
            # AIアシスタント
            "assistant": ["アシスタント", "AIアシスタント", "チャット"],
            # 市場情報
            "market": ["市場", "相場", "状況", "ニュース"],
            # システム操作
            "system": ["ヘルプ", "終了", "終了", "ホーム", "メニュー"],
        }

        self.activated_commands = {
            "buy": "買い注文",
            "sell": "売り注文",
            "portfolio_check": "ポートフォリオ確認",
            "start_trading": "取引開始",
            "show_analysis": "分析表示",
        }

    def process_voice_command(self, command_text: str, callback: Callable[[str, Dict], None]) -> None:
        """音声コマンドを処理"""
        command_lower = command_text.lower().strip()

        # コマンド種類を特定
        command_type = self._identify_command_type(command_lower)

        if command_type:
            # アクションを実行
            callback(command_lower, {"type": command_type, "action": command_text})
            logger.info(f"Voice command executed: {command_type} - {command_text}")
        else:
            logger.warning(f"Unknown voice command: {command_text}")
            callback(command_lower, {"type": "unknown", "action": command_text})

    def _identify_command_type(self, text: str) -> str:
        """コマンドタイプを特定"""

        # ポートフォリオ関連
        if any(keyword in text for keyword in self.commands["portfolio"]):
            return "portfolio"

        # 取引関連
        if any(keyword in text for keyword in self.commands["trade"]):
            if "買い" in text:
                return "buy"
            elif "売り" in text:
                return "sell"
            else:
                return "trade"

        # 分析関連
        if any(keyword in text for keyword in self.commands["analysis"]):
            return "analysis"

        # 設定・システム関連
        if any(keyword in text for keyword in self.commands["settings"] + self.commands["system"]):
            return "settings"

        # AIアシスタント関連
        if any(keyword in text for keyword in self.commands["assistant"]):
            return "assistant"

        # 市場関連
        if any(keyword in text for keyword in self.commands["market"]):
            return "market"

        return "unknown"


class VoiceControlledUI:
    """音声制御UI"""

    def __init__(self, voice_interface: VoiceInterface):
        self.voice = voice_interface
        self.voice_commands = VoiceCommands()
        self.last_command = None

    def show_voice_interface(self):
        """音声インターフェースを表示"""
        st.subheader("🎤 音声インターフェース")

        # 音声機能の状態表示
        col1, col2, col3 = st.columns(3)

        with col1:
            if self.voice.is_audio_available():
                st.success("✅ 音声機能利用可能")
            else:
                st.error("❌ 音声機能が利用できません")

        with col2:
            if st.session_state.get("voice_input_active", False):
                st.info("🎤 待機中")
            else:
                st.info("💤 非アクティブ")

        with col3:
            # 音量調整
            volume = st.slider("音量", 0.0, 1.0, 0.8, key="voice_volume")

            # 音声選択
            if self.voice.is_audio_available():
                voices = self.voice.get_available_voices()
                if voices:
                    voice_names = [v["name"] for v in voices]
                    selected_voice = st.selectbox("音声選択", voice_names, index=0, key="voice_selection")

        st.markdown("---")

        # 音声入力コントロール
        col1, col2, col3 = st.columns(3)

        with col1:
            if st.button("🎤 録音開始", key="start_voice"):
                self.start_voice_recording()

        with col2:
            if st.button("⏹️ 録音停止", key="stop_voice"):
                self.stop_voice_input()

        with col3:
            if st.button("🗑️ クリア", key="clear_voice"):
                st.session_state.voice_transcript = []
                st.experimental_rerun()

        # 音声入力結果表示
        if "voice_transcript" in st.session_state and st.session_state.voice_transcript:
            st.subheader("📝 音声認識結果")
            for i, text in enumerate(st.session_state.voice_transcript[-5:], 1):
                st.write(f"{i}. {text}")

        # コマンド実行履歴
        if "command_history" in st.session_state:
            st.subheader("🔧 コマンド履歴")
            for cmd in st.session_state.command_history[-5:]:
                st.write(f"🗣️ {cmd['action']} ({cmd['timestamp'][:19]})")

        # 音声コマンドリスト
        st.subheader("🎤 音声コマンド一覧")

        command_categories = {
            "ポートフォリオ操作": self.voice_commands.commands["portfolio"],
            "取引操作": self.voice_commands.commands["trade"],
            "分析・確認": self.voice_commands.commands["analysis"],
            "AIアシスタント": self.voice_commands.commands["assistant"],
            "設定・システム": self.voice_commands.commands["settings"] + self.voice_commands["system"],
            "市場情報": self.voice_commands.commands["market"],
        }

        for category, commands in command_categories.items():
            with st.expander(f"📋 {category}"):
                st.markdown(", ".join(commands))

        st.markdown("---")

        # 音声読み上げテスト
        st.subheader("🔊 音声読み上げテスト")

        col1, col2 = st.columns(2)

        with col1:
            test_text = st.text_input("テスト文章", key="voice_test_text")

        with col2:
            if st.button("🔊 再生", key="voice_speak"):
                if test_text:
                    asyncio.run(self.voice.speak_text(test_text))

        # 音声設定詳細
        if self.voice.is_audio_available():
            st.subheader("⚙️ 音声設定")

            col1, col2 = st.columns(2)

            with col1:
                st.markdown("**読み上げ速度**")
                rate = st.slider("速度", 80, 200, 120, key="voice_rate")

                st.markdown("**音の高さ**")
                pitch = st.slider("高さ", 50, 200, 100, key="voice_pitch")

            with col2:
                st.markdown("**ボリューム**")
                volume = st.slider("音量", 0.0, 1.0, 0.8, key="voice_volume_master")

                # 設定の保存
                if st.button("💾 設定を保存", key="save_voice_settings"):
                    voice_settings = {"rate": rate, "pitch": pitch, "volume": volume}
                    st.session_state.voice_settings = voice_settings
                    st.success("音声設定を保存しました")

        # 自動音声読み上げ設定
        st.subheader("🔄 自動読み上げ")

        enable_auto_speak = st.checkbox("音声出力を有効化", value=False, key="auto_voice_enabled")

        if enable_auto_speak:
            st.info("🔊 AIの回答を自動で音声出力します")
        else:
            st.info("🔇 音声出力は無効です")

    def start_voice_recording(self):
        """音声録音を開始"""
        if not self.voice.is_audio_available():
            st.error("音声機能が利用できません")
            return

        def process_voice_input(transcript: str):
            """音声入力を処理"""
            if "voice_transcript" not in st.session_state:
                st.session_state.voice_transcript = []

            st.session_state.voice_transcript.append({"text": transcript, "timestamp": datetime.now().isoformat()})

            # 音声コマンドとして処理
            self.voice_commands.process_voice_command(
                transcript, lambda cmd, info: self.handle_voice_command(cmd, info)
            )

        # コマンド実行
        st.experimental_rerun()

    def stop_voice_recording(self):
        """音声録音を停止"""
        self.voice.stop_voice_input()
        if "voice_input_active" in st.session_state:
            st.session_state.voice_input_active = False

    def handle_voice_command(self, command: str, info: Dict) -> None:
        """音声コマンドを処理"""
        command_type = info.get("type", "unknown")
        action = info.get("action", command)

        if "command_history" not in st.session_state:
            st.session_state.command_history = []

        st.session_state.command_history.append(
            {"command": command, "type": command_type, "action": action, "timestamp": datetime.now().isoformat()}
        )

        # 既存のアクションを実行
        if command_type in self.voice_commands.activated_commands:
            self._execute_activated_command(command_type)

        st.success(f"🎤 コマンド実行: {command}")

    def _execute_activated_command(self, command_type: str) -> None:
        """既定のアクションを実行"""
        if command_type == "buy":
            st.session_state.quick_trade_action = "buy"
            st.session_state.quick_trade_ticker = "7203"  # デフォルト値
            st.session_state.quick_trade_amount = 100000
            st.experimental_rerun()

        elif command_type == "sell":
            st.session_state.quick_trade_action = "sell"
            st.session_state.quick_trade_ticker = "7203"
            st.session_state.quick_trade_amount = 50
            st.experimental_rerun()

        elif command_type == "portfolio_check":
            st.session_state.show_portfolio = True
            st.experimental_rerun()

        elif command_type == "analysis":
            st.session_state.show_analysis = True
            st.experimental_rerun()

        elif command_type == "assistant":
            st.session_state.show_ai_assistant = True
            st.experimental_rerun()


# グローバルインスタンス
voice_interface = VoiceInterface()
voice_commands = VoiceCommands()
voice_ui = VoiceControlledUI(voice_interface)


def show_voice_control_page():
    """音声制御ページを表示"""
    st.title("🎤 音声制御とAIインターフェース")
    st.markdown("音声による操作とAI対話を実現")

    voice_ui.show_voice_interface()

    # 音声機能の状態
    if not voice_interface.is_audio_available():
        st.warning("⚠️ 音声機能を利用するには追加のライブラリが必要です")
        st.markdown(
            """
        ```bash
        pip install SpeechRecognition pyttsx3 pydub sounddevice
        ```
        """
        )

        st.markdown(
            """
        ### 📦 必要なライブラリ
        - **SpeechRecognition**: 音声認識
        - **pyttsx3**: 音声合成
        - **pydub**: 音声処理
        - **sounddevice**: 音声デバイス制御
        """
        )

    # 音声機能のテスト
    st.markdown("---")
    st.subheader("🧪 機能テスト")

    # 音声認識テスト
    if voice_interface.is_audio_available():
        if st.button("🎤 音声認識テスト"):
            with st.spinner("音声認識テスト中..."):
                result = asyncio.run(voice_interface.start_voice_input(show_voice_control_page.process_voice_input))

            if result:
                st.success(f"✅ 音声認識成功: {result}")
            else:
                st.error("❌ 音声認識に失敗しました")

    # 音声読み上げテスト
    if voice_interface.is_audio_available():
        test_texts = [
            "こんにちは、AGStockへようこそ",
            "現在のポートフォリオ状況を教えて",
            "トヨタ自動車の株価を分析してください",
            "本日の市場トレンドを説明してください",
        ]

        selected_text = st.selectbox("テスト文章選択", test_texts, key="voice_test_selection")

        if st.button("🔊 音声読み上げテスト"):
            with st.spinner("音声読み上げ中..."):
                result = asyncio.run(voice_interface.speak_text(selected_text))

            if result:
                st.success(f"✅ 音声読み上げ完了")
                st.audio("data:audio/mp3;base64,UklGRi9wBBMKKbN", format="audio/mp3")
            else:
                st.error("❌ 音声読み上げに失敗しました")


if __name__ == "__main__":
    show_voice_control_page()
