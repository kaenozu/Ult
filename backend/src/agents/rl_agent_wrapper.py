import logging
from . import Agent

logger = logging.getLogger(__name__)

class RLAgentWrapper(Agent):
    def __init__(self, agent_id="rl_agent"):
        super().__init__(f"RL Agent ({agent_id})", "Reinforcement Learning agent.")

    def vote(self, ticker, data):
        from . import AgentVote
        return AgentVote(self.name, "HOLD", 0.5, "Stubbed.")