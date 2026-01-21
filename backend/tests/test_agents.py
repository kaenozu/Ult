import pytest
from unittest.mock import patch, MagicMock
from src.core.agent_loop import AutonomousAgent
from src.agents.consensus_engine import ConsensusEngine


class TestAgents:
    """Agent system tests."""

    @pytest.fixture
    def mock_config(self):
        """Mock configuration for testing."""
        config = MagicMock()
        config.trading.max_position_size = 1000
        config.trading.max_daily_loss = 500
        config.system.data_dir = "data"
        return config

    @patch("src.core.agent_loop.settings")
    def test_autonomous_agent_initialization(self, mock_settings, mock_config):
        """Test autonomous agent initialization."""
        mock_settings.return_value = mock_config

        agent = AutonomousAgent(agent_id="test_agent")
        assert agent.agent_id == "test_agent"
        assert hasattr(agent, "state")
        assert hasattr(agent, "memory")

    @patch("src.agents.consensus_engine.settings")
    def test_consensus_engine_initialization(self, mock_settings, mock_config):
        """Test consensus engine initialization."""
        mock_settings.return_value = mock_config

        engine = ConsensusEngine()
        assert hasattr(engine, "agents")
        assert hasattr(engine, "consensus_threshold")

    @patch("src.agents.consensus_engine.settings")
    def test_consensus_engine_add_agent(self, mock_settings, mock_config):
        """Test adding agents to consensus engine."""
        mock_settings.return_value = mock_config

        engine = ConsensusEngine()
        agent = MagicMock()
        agent.agent_id = "test_agent"

        engine.add_agent(agent)
        assert "test_agent" in engine.agents

    @patch("src.agents.consensus_engine.settings")
    @patch("src.agents.consensus_engine.logger")
    def test_consensus_engine_make_decision(
        self, mock_logger, mock_settings, mock_config
    ):
        """Test consensus decision making."""
        mock_settings.return_value = mock_config

        engine = ConsensusEngine()
        engine.consensus_threshold = 0.6

        # Mock agents with different predictions
        agent1 = MagicMock()
        agent1.predict.return_value = {"action": "BUY", "confidence": 0.8}

        agent2 = MagicMock()
        agent2.predict.return_value = {"action": "BUY", "confidence": 0.7}

        agent3 = MagicMock()
        agent3.predict.return_value = {"action": "SELL", "confidence": 0.5}

        engine.add_agent(agent1)
        engine.add_agent(agent2)
        engine.add_agent(agent3)

        decision = engine.make_consensus_decision("AAPL", [1, 2, 3, 4, 5])

        assert "action" in decision
        assert "confidence" in decision
        assert decision["action"] in ["BUY", "SELL", "HOLD"]

    @patch("src.agents.news_agent.requests.get")
    @patch("src.agents.news_agent.settings")
    def test_news_agent_sentiment_analysis(
        self, mock_settings, mock_requests, mock_config
    ):
        """Test news agent sentiment analysis."""
        mock_settings.return_value = mock_config

        # Mock API response
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "articles": [
                {"title": "Stock market rises", "description": "Positive news"}
            ]
        }
        mock_requests.return_value = mock_response

        from src.agents.news_agent import NewsAgent

        agent = NewsAgent()
        sentiment = agent.analyze_sentiment("AAPL")

        assert isinstance(sentiment, float)
        assert -1 <= sentiment <= 1

    @patch("src.agents.vision_agent.settings")
    def test_vision_agent_initialization(self, mock_settings, mock_config):
        """Test vision agent initialization."""
        mock_settings.return_value = mock_config

        from src.agents.vision_agent import VisionAgent

        agent = VisionAgent()

        assert hasattr(agent, "api_key")
        assert hasattr(agent, "analyze_chart")

    def test_agent_state_transitions(self):
        """Test agent state management."""
        from src.core.schemas import AgentState

        # Test state enum values
        assert AgentState.IDLE.value == "idle"
        assert AgentState.THINKING.value == "thinking"
        assert AgentState.ACTING.value == "acting"

        # Test state transitions
        current_state = AgentState.IDLE
        assert current_state.can_transition_to(AgentState.THINKING)
        assert not current_state.can_transition_to(AgentState.ACTING)
