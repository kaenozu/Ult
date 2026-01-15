import logging
from . import Agent

logger = logging.getLogger(__name__)

class BaseAgent(Agent):
    """
    Stubbed BaseAgent for backward compatibility.
    """
    def __init__(self, name: str, role: str):
        super().__init__(name, role)

    def analyze(self, data):
        from .committee import TradingDecision
        class Analysis:
            def __init__(self, name):
                self.decision = TradingDecision.HOLD
                self.reasoning = "Stubbed"
                self.agent_name = name
            def model_dump(self): return {"agent_name": self.agent_name, "decision": self.decision.value, "reasoning": self.reasoning}
        return Analysis(self.name)
