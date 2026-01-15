import logging
"""
AGStock Personal Edition - Personal Assistant
個人投資家向けAIアシスタント
"""

import os
import json
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field

import numpy as np

from src.log_config import get_logger
from src.database_manager import db_manager

logger = get_logger("personal_assistant")


@dataclass
class RiskProfile:
    """リスクプロファイル"""

    risk_tolerance: str = "moderate"
    age: int = 30
    income_level: str = "medium"
    investment_goals: List[str] = field(default_factory=lambda: ["growth"])
    time_horizon: int = 5  # years
    max_drawdown: float = 0.15
    emotional_stability: float = 0.7


@dataclass
class InvestmentGoal:
    """投資目標"""

    id: str
    title: str
    target_amount: float
    current_amount: float = 0.0
    deadline: str = ""
    category: str = "retirement"  # retirement, house, education, emergency
    priority: str = "medium"  # high, medium, low


class PersonalAssistant:
    """個人アシスタントクラス"""

    _instance: Optional["PersonalAssistant"] = None

    def __new__(cls) -> "PersonalAssistant":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if hasattr(self, "_initialized") and self._initialized:
            return
        self._initialized = True
        self.risk_profile = self._load_risk_profile()
        self.goals = self._load_goals()
        self.learning_history = []
        self.emotion_state = "neutral"
        self.personalized_news = []

    def _load_risk_profile(self) -> RiskProfile:
        """リスクプロファイル読み込み"""
        try:
            saved = db_manager.get_config("personal_risk_profile")
            if saved:
                return RiskProfile(**saved)
        except Exception as e:
            logging.getLogger(__name__).debug(f"Non-critical exception: {e}")

        return RiskProfile()

    def save_risk_profile(self, profile: RiskProfile):
        """リスクプロファイル保存"""
        self.risk_profile = profile
        db_manager.save_config("personal_risk_profile", profile.__dict__, "personal")
        logger.info("Risk profile saved")

    def analyze_risk_profile(self, user_answers: Dict[str, Any]) -> RiskProfile:
        """アンケート回答からリスクプロファイル作成"""
        age = int(user_answers.get("age", 30))
        risk_question_score = user_answers.get("risk_score", 5)
        income = user_answers.get("income", "medium")

        # リスク許容度算出
        if risk_question_score <= 3:
            risk_tolerance = "conservative"
            max_drawdown = 0.05
        elif risk_question_score <= 6:
            risk_tolerance = "moderate"
            max_drawdown = 0.15
        else:
            risk_tolerance = "aggressive"
            max_drawdown = 0.25

        return RiskProfile(
            age=age,
            risk_tolerance=risk_tolerance,
            income_level=income,
            investment_goals=user_answers.get("goals", ["growth"]),
            time_horizon=user_answers.get("horizon", 5),
            max_drawdown=max_drawdown,
            emotional_stability=user_answers.get("emotional", 0.7),
        )

    def create_investment_goal(
        self,
        title: str,
        target_amount: float,
        deadline: str,
        category: str = "retirement",
        priority: str = "medium",
    ) -> str:
        """投資目標作成"""
        goal_id = f"goal_{int(time.time())}"
        goal = InvestmentGoal(
            id=goal_id,
            title=title,
            target_amount=target_amount,
            deadline=deadline,
            category=category,
            priority=priority,
        )

        self.goals.append(goal)
        self._save_goals()
        logger.info(f"Created investment goal: {title}")
        return goal_id

    def get_goal_progress(self, goal_id: str) -> Optional[Dict[str, Any]]:
        """目標進捗取得"""
        goal = next((g for g in self.goals if g.id == goal_id), None)
        if not goal:
            return None

        progress = (goal.current_amount / goal.target_amount) * 100 if goal.target_amount > 0 else 0

        # 残り日数計算
        if goal.deadline:
            try:
                deadline_date = datetime.fromisoformat(goal.deadline.replace("Z", "+00:00"))
                days_remaining = (deadline_date - datetime.now()).days
            except:
                days_remaining = None
        else:
            days_remaining = None

        # 達成可能性計算
        feasibility = self._calculate_goal_feasibility(goal)

        return {
            "goal": goal,
            "progress": progress,
            "days_remaining": days_remaining,
            "feasibility": feasibility,
        }

    def _calculate_goal_feasibility(self, goal: InvestmentGoal) -> str:
        """目標達成可能性計算"""
        progress = (goal.current_amount / goal.target_amount) * 100 if goal.target_amount > 0 else 0

        if goal.deadline:
            try:
                deadline_date = datetime.fromisoformat(goal.deadline.replace("Z", "+00:00"))
                days_remaining = (deadline_date - datetime.now()).days

                # 簡単な達成可能性計算
                if days_remaining <= 0:
                    return "completed" if progress >= 100 else "missed"
                elif days_remaining < 30:
                    return "critical" if progress < 90 else "on_track"
                elif days_remaining < 90:
                    return "caution" if progress < 70 else "on_track"
                else:
                    return "good" if progress > 30 else "needs_attention"
            except:
                return "unknown"
        else:
            return "unknown"

    def generate_personalized_advice(self, current_portfolio: Dict[str, Any]) -> Dict[str, str]:
        """パーソナライズされた投資アドバイス生成"""
        advice = {
            "risk_management": "",
            "asset_allocation": "",
            "timing": "",
            "emotional": "",
        }

        # リスク管理アドバイス
        if self.risk_profile.risk_tolerance == "conservative":
            advice["risk_management"] = "安定優先の運用をお勧めします。高配当株・債券の割合を増やしましょう。"
        elif self.risk_profile.risk_tolerance == "aggressive":
            advice["risk_management"] = "成長性重視のポートフォリオですが、分散投資を忘れずに。"
        else:
            advice["risk_management"] = "バランス型運用。成長株と安定資産の適切な配分が大切です。"

        # 年齢ベースのアドバイス
        if self.risk_profile.age < 35:
            advice["asset_allocation"] = "若いうちは成長株中心でOK。リスクを恐れすぎず。"
        elif self.risk_profile.age < 50:
            advice["asset_allocation"] = "安定資産を徐々に増やしていく時期。バランスが重要。"
        else:
            advice["asset_allocation"] = "安定性最優先。現金・債券の割合を高めましょう。"

        # 感情状態アドバイス
        if self.emotion_state == "fearful":
            advice["emotional"] = "恐怖のときこそ基本に戻りましょう。無理な取引は避けて。"
        elif self.emotion_state == "greedy":
            advice["emotional"] = "欲が出たときは一度深呼吸。冷静な判断を心がけて。"
        else:
            advice["emotional"] = "平常心を維持。計画的な投資を続けましょう。"

        return advice

    def analyze_emotional_state(self, recent_trades: List[Dict[str, Any]], market_data: Dict[str, Any]) -> str:
        """感情状態分析"""
        if not recent_trades:
            return "neutral"

        # 取引パターン分析
        trade_frequency = len(recent_trades)
        last_24h_trades = len(
            [t for t in recent_trades if datetime.fromisoformat(t["timestamp"]) > datetime.now() - timedelta(hours=24)]
        )

        # 損益分析
        recent_pnl = sum(t.get("pnl", 0) for t in recent_trades[:10])

        # 市場との比較
        market_volatility = market_data.get("volatility", 0)

        # 感情状態判定
        if last_24h_trades > 10:
            if recent_pnl < -1000:
                return "fearful"
            else:
                return "greedy"
        elif recent_pnl < -5000:
            return "fearful"
        elif recent_pnl > 5000 and trade_frequency > 5:
            return "greedy"
        elif market_volatility > 0.05 and last_24h_trades < 2:
            return "anxious"
        else:
            return "neutral"

    def update_emotional_state(self, state: str = None):
        """感情状態更新"""
        if state:
            self.emotion_state = state
        else:
            # 自動分析
            recent_trades = db_manager.get_trades(limit=20)
            # market_dataダミー
            market_data = {"volatility": 0.03}
            self.emotion_state = self.analyze_emotional_state(recent_trades, market_data)

        logger.info(f"Emotional state updated: {self.emotion_state}")

    def get_personalized_news(self, user_symbols: List[str]) -> List[Dict[str, Any]]:
        """パーソナライズされたニュース生成"""
        news = []

        # ユーザーの保有銘柄に特化したニュース
        for symbol in user_symbols:
            news.append(
                {
                    "symbol": symbol,
                    "title": f"{symbol} 四半期決算好調、上方修正",
                    "summary": "市場予想を上回る業績。市場からの評価は良好。",
                    "importance": "high" if symbol in user_symbols else "medium",
                    "timestamp": datetime.now().isoformat(),
                }
            )

        # 投資スタイルに合わせた市場ニュース
        if self.risk_profile.risk_tolerance == "conservative":
            news.append(
                {
                    "title": "日銀、低金利政策継続へ",
                    "summary": "安定運用にとって追い風。債権投資も有利に。",
                    "importance": "high",
                    "timestamp": datetime.now().isoformat(),
                }
            )
        elif self.risk_profile.risk_tolerance == "aggressive":
            news.append(
                {
                    "title": "AI関連株、再び材料出る",
                    "summary": "新技術投資の好機。成長性銘柄に注目。",
                    "importance": "high",
                    "timestamp": datetime.now().isoformat(),
                }
            )

        return news

    def generate_learning_recommendations(self) -> List[Dict[str, Any]]:
        """学習レコメンデーション生成"""
        recommendations = []

        # レベル判定
        if self.risk_profile.age < 30 and self.risk_profile.risk_tolerance == "aggressive":
            # 初級者向け
            recommendations.extend(
                [
                    {
                        "title": "テクニカル分析の基本",
                        "level": "beginner",
                        "duration": "15分",
                        "topics": ["ローソク足", "移動平均線", "RSI"],
                        "importance": "recommended",
                    },
                    {
                        "title": "ポートフォリオ分散入門",
                        "level": "beginner",
                        "duration": "10分",
                        "topics": ["業種分散", "リスク管理"],
                        "importance": "recommended",
                    },
                ]
            )

        # 中級者向け
        recommendations.append(
            {
                "title": "オプション取引基礎",
                "level": "intermediate",
                "duration": "20分",
                "topics": ["プット/コール", "プレミアム", "権利行使"],
                "importance": "optional",
            }
        )

        # 上級者向け
        if len(self.learning_history) > 10:
            recommendations.append(
                {
                    "title": "アルゴリズム取導入",
                    "level": "advanced",
                    "duration": "30分",
                    "topics": ["バックテスト", "自動売買", "リスク管理"],
                    "importance": "challenge",
                }
            )

        return recommendations

    def track_learning_progress(self, lesson_completed: str) -> None:
        """学習進捗トラッキング"""
        self.learning_history.append(
            {
                "lesson": lesson_completed,
                "completed_at": datetime.now().isoformat(),
                "difficulty": "auto-detected",
            }
        )

        # 進捗保存
        db_manager.save_config("learning_history", self.learning_history, "personal")
        logger.info(f"Learning progress tracked: {lesson_completed}")

    def _load_goals(self) -> List[InvestmentGoal]:
        """目標読み込み"""
        try:
            saved = db_manager.get_config("investment_goals")
            if saved:
                return [InvestmentGoal(**g) for g in saved]
        except Exception as e:
            logging.getLogger(__name__).debug(f"Non-critical exception: {e}")

        return []

    def _save_goals(self):
        """目標保存"""
        goals_data = [g.__dict__ for g in self.goals]
        db_manager.save_config("investment_goals", goals_data, "personal")

    def get_dashboard_summary(self) -> Dict[str, Any]:
        """ダッシュボード用サマリー取得"""
        active_goals = [g for g in self.goals if g.current_amount < g.target_amount]
        completed_goals = [g for g in self.goals if g.current_amount >= g.target_amount]

        return {
            "risk_profile": self.risk_profile.__dict__,
            "active_goals_count": len(active_goals),
            "completed_goals_count": len(completed_goals),
            "total_goals": len(self.goals),
            "emotional_state": self.emotion_state,
            "learning_progress": len(self.learning_history),
            "latest_advice": self.generate_personalized_advice({}),
            "upcoming_deadlines": self._get_upcoming_deadlines(),
        }

    def _get_upcoming_deadlines(self) -> List[Dict[str, Any]]:
        """近い目標期限取得"""
        upcoming = []
        for goal in self.goals:
            if goal.deadline and goal.current_amount < goal.target_amount:
                try:
                    deadline_date = datetime.fromisoformat(goal.deadline.replace("Z", "+00:00"))
                    days_remaining = (deadline_date - datetime.now()).days

                    if days_remaining <= 90:  # 3ヶ月以内
                        upcoming.append(
                            {
                                "goal_id": goal.id,
                                "title": goal.title,
                                "days_remaining": days_remaining,
                                "progress": (
                                    (goal.current_amount / goal.target_amount) * 100 if goal.target_amount > 0 else 0
                                ),
                            }
                        )
                except:
                    continue

        return sorted(upcoming, key=lambda x: x["days_remaining"])


personal_assistant = PersonalAssistant()


def get_personal_assistant() -> PersonalAssistant:
    """個人アシスタント取得"""
    return personal_assistant
