import asyncio
import logging
import random
from datetime import datetime
from typing import Optional, Dict, Any
import pandas as pd

from src.core.schemas import ActionSchema, ThoughtSchema, ActionType
from src.security.circuit_breaker import CircuitBreaker
from src.api.websocket_manager import manager as ws_manager
from src.services.approval_service import ApprovalService
from src.api.websocket_types import ApprovalType, ApprovalStatus
from src.execution.news_shock_defense import NewsShockDefense
from src.execution.position_sizer import PositionSizer
from src.agents.consensus_engine import ConsensusEngine
from src.data_temp.data_loader import fetch_stock_data

logger = logging.getLogger(__name__)

class AutonomousAgent:
    """
    Phase 4: Async Agent Loop.
    "The Heartbeat" of the autonomous persona.
    Powered by The Hive (ConsensusEngine).
    """
    def __init__(self, check_interval: float = 60.0): # Slower interval for real API calls
        self.check_interval = check_interval
        self._is_running = False
        self._task: Optional[asyncio.Task] = None
        
        # Dependencies
        self.circuit_breaker = CircuitBreaker()
        self.approval_service = ApprovalService(ws_manager=ws_manager)
        self.shock_defense = NewsShockDefense()
        self.position_sizer = PositionSizer()
        self.consensus = ConsensusEngine()
        
        # State
        self.daily_pnl = 0.0
        self.current_regime = "NEUTRAL"
        self.iteration_count = 0
        self.pending_approval_id: Optional[str] = None
        self.pending_action: Optional[ActionSchema] = None
        
        # Target (Single ticker focus for Phase 4)
        self.target_ticker = "7203.T"

    async def start(self):
        """Start the agent loop"""
        if self._is_running:
            return
            
        self._is_running = True
        self._task = asyncio.create_task(self._loop())
        logger.info("🤖 Autonomous Agent Started (Hive Powered)")
        
    async def stop(self):
        """Stop the agent loop"""
        self._is_running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("🛑 Autonomous Agent Stopped")
        
    async def _loop(self):
        """Main infinite loop"""
        while self._is_running:
            try:
                self.iteration_count += 1
                
                # 1. Perceive (Real Market Data)
                # Fetch data in thread pool to avoid blocking async loop
                market_data = await asyncio.to_thread(self._perceive)
                
                if market_data is None or market_data.empty:
                    logger.warning(f"No data fetched for {self.target_ticker}. Retrying...")
                    await asyncio.sleep(10)
                    continue

                # 2. Safety Check (Circuit Breaker + News Shock)
                if not self.circuit_breaker.check_health(self.daily_pnl):
                    logger.warning("Agent Loop Paused: Circuit Breaker Tripped")
                    await asyncio.sleep(60)
                    continue

                # Phase 7: News Shock Check
                try:
                    shock_status = self.shock_defense.analyze_current_market()
                    if shock_status:
                        emergency = self.shock_defense.get_emergency_action(shock_status)
                        logger.critical(f"⚠️ SHOCK DEFENSE TRIGGERED: {emergency['reason']}")
                        await ws_manager.broadcast_agent_activity({
                            "type": "EMERGENCY", 
                            "content": emergency['reason']
                        })
                        await asyncio.sleep(60)
                        continue
                except Exception as e:
                    logger.error(f"News Shock Check Failed: {e}")

                # 3. Think (Consensus Engine)
                # Optimization: Only call Vision if regime changed or volatility is high
                prev_regime = self.current_regime
                volatility = market_data["Close"].pct_change().std()
                skip_vision = (self.iteration_count % 10 != 0) and (volatility < 0.02)
                
                consensus_result = self.consensus.deliberate(
                    self.target_ticker, 
                    market_data,
                    skip_vision=skip_vision
                )
                
                # Update regime state
                self._update_regime(consensus_result)
                
                # Create detailed thought content
                thought_content = consensus_result["reason"]
                emotion = "CHILL"
                sentiment_score = 0.5 + (consensus_result["consensus_score"] * 0.5)
                
                if consensus_result["signal"] == 1:
                    emotion = "EXCITED"
                elif consensus_result["signal"] == -1:
                    emotion = "FEAR" if consensus_result["confidence"] > 0.7 else "CAUTIOUS"
                
                # Enrich thought with individual agent opinions for UI
                thought_data = {
                    "timestamp": datetime.now().isoformat(),
                    "market_regime": self.current_regime,
                    "content": thought_content,
                    "emotion": emotion,
                    "sentiment_score": round(sentiment_score, 2),
                    "sentiment_label": "POSITIVE" if sentiment_score > 0.6 else ("NEGATIVE" if sentiment_score < 0.4 else "NEUTRAL"),
                    "details": consensus_result.get("details", {}),
                    "iteration": self.iteration_count
                }
                
                await ws_manager.broadcast_agent_thought(thought_data)

                # Check Pending Approval
                if self.pending_approval_id:
                    status = await self.approval_service.check_approval_status(self.pending_approval_id)
                    if status == ApprovalStatus.APPROVED:
                        logger.info(f"✅ Action APPROVED: {self.pending_action.type} {self.pending_action.ticker}")
                        # In real system: execution_service.execute(self.pending_action)
                        await ws_manager.broadcast_agent_action(self.pending_action.model_dump(mode='json'))
                        self.pending_approval_id = None
                        self.pending_action = None
                    elif status in [ApprovalStatus.REJECTED, ApprovalStatus.EXPIRED]:
                        logger.warning(f"❌ Action {status.value}: {self.pending_action.type} {self.pending_action.ticker}")
                        self.pending_approval_id = None
                        self.pending_action = None
                    # If PENDING, wait
                
                # 4. Act (Generate Action based on Consensus)
                elif consensus_result["signal"] != 0:
                    action = self._act(thought, consensus_result)
                    
                    if action:
                        # Risk Check & Approval
                        if action.risk_score > 0.6 or action.type == ActionType.SELL: 
                            logger.info(f"⚠️ Significant Action (Score {action.risk_score}). Requesting Approval...")
                            req_id = await self.approval_service.request_approval(
                                approval_type=ApprovalType.TRADE_EXECUTION,
                                title=f"Execute {action.type} {action.ticker}",
                                description=f"Reason: {action.reason}",
                                context=action.model_dump(mode='json'),
                                priority="high"
                            )
                            self.pending_approval_id = req_id
                            self.pending_action = action
                        else:
                            # Auto-execute low risk actions
                            await ws_manager.broadcast_agent_action(action.model_dump(mode='json'))
                            logger.info(f"Action Proposed: {action.type} {action.ticker}")

                await asyncio.sleep(self.check_interval)
                
            except Exception as e:
                logger.error(f"Error in Agent Loop: {e}")
                await asyncio.sleep(10) # Backoff

    def _update_regime(self, consensus_result: Dict[str, Any]):
        """Update internal regime state based on consensus results."""
        reason = consensus_result.get("reason", "").upper()
        if "TREND" in reason:
            self.current_regime = "TREND"
        elif "RANGE" in reason:
            self.current_regime = "RANGE"
        elif "VOLATILE" in reason:
            self.current_regime = "VOLATILE"
        else:
            self.current_regime = "NEUTRAL"

    def _perceive(self) -> pd.DataFrame:
        """Fetch real market data for target ticker"""
        try:
            # Fetch 1 year of data for analysis
            data_map = fetch_stock_data([self.target_ticker], period="1y", interval="1d")
            return data_map.get(self.target_ticker)
        except Exception as e:
            logger.error(f"Perception failed: {e}")
            return None

    def _think(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Generate a thought based on Consensus Engine"""
        # Run Consensus
        result = self.consensus.deliberate(self.target_ticker, df)
        
        # Update internal state for UI consistency
        # Extract regime from reason if possible, or defaulting
        # Ideally ConsensusEngine should return regime in details
        # For now, let's parse or keep previous
        if "TREND" in result["reason"]: self.current_regime = "TREND"
        elif "RANGE" in result["reason"]: self.current_regime = "RANGE"
        elif "VOLATILE" in result["reason"]: self.current_regime = "VOLATILE"
        
        return result

    def _act(self, thought: ThoughtSchema, consensus_result: Dict[str, Any]) -> Optional[ActionSchema]:
        """Generate an action based on consensus"""
        
        signal = consensus_result["signal"]
        confidence = consensus_result["confidence"]
        
        if signal == 0:
            return None
            
        action_type = ActionType.BUY if signal == 1 else ActionType.SELL
        
        # Calculate Position Size
        # Mock equity for now, or fetch from portfolio
        total_equity = 1000000 
        
        size_res = self.position_sizer.calculate_size(
            ticker=self.target_ticker,
            total_equity=total_equity, 
            win_rate=0.5 + (confidence * 0.4), # Map confidence to win_rate estimate
            sentiment_score=thought.sentiment_score
        )
        
        current_price = 2000.0 # Should get from df actually, but let's assume approx or fetch
        # Ideally pass price from _perceive or _think
        
        quantity = int(size_res['amount'] / current_price)
        if quantity < 1: quantity = 1

        return ActionSchema(
            type=action_type,
            ticker=self.target_ticker,
            quantity=quantity,
            reason=f"{thought.content} (Consensus Score: {consensus_result['consensus_score']})",
            risk_score=1.0 - confidence, # Lower confidence = Higher risk
            confidence=confidence
        )