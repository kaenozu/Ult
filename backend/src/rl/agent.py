import logging
import os
import random
from collections import deque

import numpy as np

try:
    import torch
    import torch.nn as nn
    import torch.optim as optim
except ImportError:
    # Fallback/Mock for environments without torch (though requirements say otherwise)
    torch = None

logger = logging.getLogger(__name__)


class QNetwork(nn.Module):
    """Q-Network: 状態から各行動のQ値を予測するニューラルネットワーク"""

    def __init__(self, state_size: int, action_size: int, hidden_size: int = 64):
        super(QNetwork, self).__init__()
        self.fc1 = nn.Linear(state_size, hidden_size)
        self.fc2 = nn.Linear(hidden_size, hidden_size)
        self.fc3 = nn.Linear(hidden_size, action_size)
        self.relu = nn.ReLU()

    def forward(self, x):
        x = self.relu(self.fc1(x))
        x = self.relu(self.fc2(x))
        return self.fc3(x)


class DQNAgent:
    """Deep Q-Network Agent"""

    def __init__(
        self,
        state_size: int,
        action_size: int,
        hidden_size: int = 64,
        learning_rate: float = 0.001,
    ):
        if torch is None:
            raise ImportError("PyTorch is required for RL Agent.")

        self.state_size = state_size
        self.action_size = action_size
        self.memory = deque(maxlen=2000)  # Experience Replay Buffer
        self.gamma = 0.95  # 割引率
        self.epsilon = 1.0  # 探索率 (初期値)
        self.epsilon_min = 0.01
        self.epsilon_decay = 0.995
        self.batch_size = 32
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        # Q-Networks (Main and Target)
        self.model = QNetwork(state_size, action_size, hidden_size).to(self.device)
        self.target_model = QNetwork(state_size, action_size, hidden_size).to(self.device)
        self.update_target_model()

        self.optimizer = optim.Adam(self.model.parameters(), lr=learning_rate)
        self.criterion = nn.MSELoss()

        logger.info(f"DQN Agent initialized on {self.device}")

    def update_target_model(self):
        """ターゲットネットワークをメインネットワークと同期"""
        self.target_model.load_state_dict(self.model.state_dict())

    def remember(self, state, action, reward, next_state, done):
        """経験をメモリに保存"""
        self.memory.append((state, action, reward, next_state, done))

    def act(self, state):
        """行動を選択 (Epsilon-Greedy + Oracle Masking)"""
        # Oracle Safety Check
        oracle_mask = None
        try:
            from src.oracle.oracle_2026 import Oracle2026

            oracle = Oracle2026()
            guidance = oracle.get_risk_guidance()

            if guidance.get("safety_mode", False):
                # Mask BUY action (action 1) - Agent can only HOLD or SELL
                oracle_mask = [0, 2]  # Available actions in crisis
        except Exception:
            pass  # Oracle unavailable

        if np.random.rand() <= self.epsilon:
            if oracle_mask:
                return random.choice(oracle_mask)
            return random.randrange(self.action_size)

        state_tensor = torch.FloatTensor(state).unsqueeze(0).to(self.device)
        with torch.no_grad():
            act_values = self.model(state_tensor)

            # Apply Oracle Mask if active
            if oracle_mask:
                # Set BUY Q-value to very negative
                act_values[0][1] = float("-inf")

        return torch.argmax(act_values).item()

    def replay(self):
        """経験再生による学習"""
        if len(self.memory) < self.batch_size:
            return

        minibatch = random.sample(self.memory, self.batch_size)

        states = torch.FloatTensor(np.array([i[0] for i in minibatch])).to(self.device)
        actions = torch.LongTensor(np.array([i[1] for i in minibatch])).unsqueeze(1).to(self.device)
        rewards = torch.FloatTensor(np.array([i[2] for i in minibatch])).to(self.device)
        next_states = torch.FloatTensor(np.array([i[3] for i in minibatch])).to(self.device)
        dones = torch.FloatTensor(np.array([i[4] for i in minibatch])).to(self.device)

        # Current Q values
        current_q = self.model(states).gather(1, actions).squeeze(1)

        # Next Q values (from Target Network)
        with torch.no_grad():
            max_next_q = self.target_model(next_states).max(1)[0]
            target_q = rewards + (self.gamma * max_next_q * (1 - dones))

        # Loss and Optimize
        loss = self.criterion(current_q, target_q)
        self.optimizer.zero_grad()
        loss.backward()
        self.optimizer.step()

        # Epsilon decay
        if self.epsilon > self.epsilon_min:
            self.epsilon *= self.epsilon_decay

    def load(self, name):
        if os.path.exists(name):
            self.model.load_state_dict(torch.load(name, map_location=self.device))
            self.update_target_model()
            logger.info(f"Model loaded from {name}")
        else:
            logger.warning(f"Model file {name} not found.")

    def save(self, name):
        # Create directory if necessary
        os.makedirs(os.path.dirname(name), exist_ok=True)
        torch.save(self.model.state_dict(), name)
        logger.info(f"Model saved to {name}")
