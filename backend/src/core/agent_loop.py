import asyncio
import logging
import random
from datetime import datetime
from typing import Optional

from src.core.schemas import ActionSchema, ThoughtSchema, ActionType, AgentState
from src.security.circuit_breaker import CircuitBreaker
from src.api.websocket_manager import manager as ws_manager
from src.services.approval_service import ApprovalService
from src.api.websocket_types import ApprovalType, ApprovalStatus
from src.execution.news_shock_defense import NewsShockDefense
from src.execution.position_sizer import PositionSizer
# from src.security.risk_manager import get_risk_manager

logger = logging.getLogger(__name__)

class AutonomousAgent:
    """
    Phase 4: Async Agent Loop.
    "The Heartbeat" of the autonomous persona.
    """
    def __init__(self, check_interval: float = 2.0):
        self.check_interval = check_interval
        self._is_running = False
        self._task: Optional[asyncio.Task] = None
        
        # Dependencies
        self.circuit_breaker = CircuitBreaker()
        self.approval_service = ApprovalService(ws_manager=ws_manager)
        self.shock_defense = NewsShockDefense()
        self.position_sizer = PositionSizer()
        
        # State
        self.daily_pnl = 0.0
        self.current_regime = "NEUTRAL"
        self.iteration_count = 0
        self.pending_approval_id: Optional[str] = None
        self.pending_action: Optional[ActionSchema] = None

    async def start(self):
        """Start the agent loop"""
        if self._is_running:
            return
            
        self._is_running = True
        self._task = asyncio.create_task(self._loop())
        logger.info("🤖 Autonomous Agent Started")
        
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
                
                # 1. Perceive (Mock Market Data)
                market_state = self._perceive()
                
                # 2. Safety Check (Circuit Breaker + News Shock)
                if not self.circuit_breaker.check_health(self.daily_pnl):
                    logger.warning("Agent Loop Paused: Circuit Breaker Tripped")
                    await asyncio.sleep(5)
                    continue

                # Phase 7: News Shock Check
                try:
                    shock_status = self.shock_defense.analyze_current_market()
                    if shock_status:
                        emergency = self.shock_defense.get_emergency_action(shock_status)
                        logger.critical(f"⚠️ SHOCK DEFENSE TRIGGERED: {emergency['reason']}")
                        # Broadcast Emergency
                        await ws_manager.broadcast_agent_activity({
                            "type": "EMERGENCY", 
                            "content": emergency['reason']
                        })
                        # In real system, execute the action (PARTIAL_LIQUIDATE) here
                        await asyncio.sleep(10) # Pause for shock
                        continue
                except Exception as e:
                    logger.error(f"News Shock Check Failed: {e}")

                # 3. Think (Generate Thought)
                thought = self._think(market_state)
                await ws_manager.broadcast_agent_thought(thought.model_dump(mode='json'))

                # Check Pending Approval
                if self.pending_approval_id:
                    status = await self.approval_service.check_approval_status(self.pending_approval_id)
                    if status == ApprovalStatus.APPROVED:
                        logger.info(f"✅ Action APPROVED: {self.pending_action.type} {self.pending_action.ticker}")
                        # Execute Action Logic Here (Mock execution)
                        await ws_manager.broadcast_agent_action(self.pending_action.model_dump(mode='json'))
                        self.pending_approval_id = None
                        self.pending_action = None
                    elif status in [ApprovalStatus.REJECTED, ApprovalStatus.EXPIRED]:
                        logger.warning(f"❌ Action {status.value}: {self.pending_action.type} {self.pending_action.ticker}")
                        self.pending_approval_id = None
                        self.pending_action = None
                    # If PENDING, do nothing (wait)
                
                # 4. Act (Generate Action)
                # Only act if no pending approval
                elif random.random() < 0.3: 
                    action = self._act(thought)
                    
                    # Risk Check
                    if action.risk_score > 0.5: # Threshold for approval
                        logger.info(f"⚠️ High Risk Action (Score {action.risk_score}). Requesting Approval...")
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
                        await ws_manager.broadcast_agent_action(action.model_dump(mode='json'))
                        logger.info(f"Action Proposed: {action.type} {action.ticker}")

                await asyncio.sleep(self.check_interval)
                
            except Exception as e:
                logger.error(f"Error in Agent Loop: {e}")
                await asyncio.sleep(5) # Backoff

    def _perceive(self) -> str:
        """Fetch market state (Mock for Phase 4 Step 3)"""
        regimes = ["BULL_FRENZY", "BEAR_PANIC", "SIDEWAYS_CHOP", "NEUTRAL"]
        # In a real impl, this would query MarketProvider
        return random.choice(regimes)

    def _think(self, market_regime: str) -> ThoughtSchema:
        """Generate a thought based on regime"""
        
        # Mock Logic
        content = f"Market seems {market_regime}. Monitoring volatility."
        emotion = "CHILL"
        
        sentiment_score = 0.5
        sentiment_label = "NEUTRAL"
        
        if market_regime == "BULL_FRENZY":
            content = "Liquidity is flowing! Looking for breakouts."
            emotion = "EXCITED"
            sentiment_score = 0.8
            sentiment_label = "POSITIVE"
        elif market_regime == "BEAR_PANIC":
            content = "Risk metrics spiking. Capital preservation mode."
            emotion = "FEAR"
            sentiment_score = 0.9
            sentiment_label = "NEGATIVE"
            
        return ThoughtSchema(
            timestamp=datetime.now(),
            market_regime=market_regime,
            content=content,
            emotion=emotion,
            sentiment_score=sentiment_score,
            sentiment_label=sentiment_label
        )

    def _act(self, thought: ThoughtSchema) -> ActionSchema:
        """Generate an action based on thought"""
        
        # Mock Logic based on thought emotion
        action_type = ActionType.HOLD
        ticker = "SPY"
        reason = thought.content
        confidence = 0.5
        risk_score = 0.1
        
        if thought.emotion == "EXCITED":
            action_type = ActionType.BUY
            ticker = "NVDA"
            confidence = 0.9
            risk_score = 0.7
        elif thought.emotion == "FEAR":
            action_type = ActionType.SELL
            ticker = "BTC"
            confidence = 0.8
            risk_score = 0.2
            
            
        # Calculate Position Size using Neural Kelly
        size_res = self.position_sizer.calculate_size(
            ticker=ticker,
            total_equity=1000000, # Mock Equity
            win_rate=confidence,
            sentiment_score=thought.sentiment_score
        )
        quantity = int(size_res['amount'] / 150) # Assuming price ~150 (mock) or use real price
        if quantity < 1: quantity = 1

        return ActionSchema(
            type=action_type,
            ticker=ticker,
            quantity=quantity,
            reason=f"{reason} (Neural Sizing: {size_res['equity_fraction']*100:.1f}%)",
            risk_score=risk_score,
            confidence=confidence
        )
