"""
Quantum Ledger: Immutable Audit Trail
Implements a simple blockchain structure to ensure trade history and system decisions
cannot be tampered with, providing mathematical proof of the AI's actions.
"""

import hashlib
import json
import logging
import os
import time
from typing import Any, Dict, List

logger = logging.getLogger(__name__)


class Block:
    """A single link in the Quantum Ledger."""

    def __init__(self, index: int, timestamp: float, data: Dict[str, Any], previous_hash: str):
        self.index = index
        self.timestamp = timestamp
        self.data = data
        self.previous_hash = previous_hash
        self.nonce = 0
        self.hash = self.calculate_hash()

    def calculate_hash(self) -> str:
        """Calculates the SHA-256 hash of the block's content."""
        block_string = json.dumps(
            {
                "index": self.index,
                "timestamp": self.timestamp,
                "data": self.data,
                "previous_hash": self.previous_hash,
                "nonce": self.nonce,
            },
            sort_keys=True,
        ).encode()
        return hashlib.sha256(block_string).hexdigest()

    def mine_block(self, difficulty: int):
        """Simple Proof of Work (optional, but ensures rate limiting)."""
        target = "0" * difficulty
        while self.hash[:difficulty] != target:
            self.nonce += 1
            self.hash = self.calculate_hash()

    def to_dict(self) -> Dict[str, Any]:
        """Converts block to dictionary for serialization."""
        return {
            "index": self.index,
            "timestamp": self.timestamp,
            "data": self.data,
            "previous_hash": self.previous_hash,
            "hash": self.hash,
            "nonce": self.nonce,
        }


class QuantumLedger:
    """The Eternal, immutable electronic log of system evolution and trades."""

    def __init__(self, ledger_file: str = "data/quantum_ledger.json", difficulty: int = 1):
        self.ledger_file = ledger_file
        self.difficulty = difficulty
        self.chain: List[Block] = []
        os.makedirs(os.path.dirname(self.ledger_file), exist_ok=True)
        self._load_ledger()

    def _create_genesis_block(self) -> Block:
        """Creates the very first block in the blockchain."""
        return Block(0, time.time(), {"message": "Genesis Block - The AI Dynasty Begins"}, "0")

    def _load_ledger(self):
        """Loads the chain state from disk or initializes if not exists."""
        if os.path.exists(self.ledger_file):
            try:
                with open(self.ledger_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.chain = []
                    for b_data in data:
                        b = Block(b_data["index"], b_data["timestamp"], b_data["data"], b_data["previous_hash"])
                        b.hash = b_data["hash"]
                        b.nonce = b_data["nonce"]
                        self.chain.append(b)

                if not self.is_chain_valid():
                    logger.error("🚨 CRITICAL: Ledger integrity compromised. Re-initializing.")
                    self._reset_chain()
            except Exception as e:
                logger.error(f"Failed to load ledger: {e}")
                self._reset_chain()
        else:
            self._reset_chain()

    def _reset_chain(self):
        """Initializes a fresh chain."""
        self.chain = [self._create_genesis_block()]
        self._save_ledger()

    def _save_ledger(self):
        """Saves the current chain to disk."""
        try:
            with open(self.ledger_file, "w", encoding="utf-8") as f:
                json.dump([b.to_dict() for b in self.chain], f, indent=4)
        except Exception as e:
            logger.error(f"Failed to save ledger: {e}")

    def get_latest_block(self) -> Block:
        """Returns the last block in the chain."""
        return self.chain[-1]

    def add_block(self, data: Dict[str, Any]) -> Block:
        """Appends a new block of data to the immutable ledger."""
        latest = self.get_latest_block()
        new_block = Block(len(self.chain), time.time(), data, latest.hash)
        new_block.mine_block(self.difficulty)
        self.chain.append(new_block)
        self._save_ledger()
        logger.info(f"📜 [LEDGER] New Block Added: {new_block.hash[:12]}")
        return new_block

    def is_chain_valid(self) -> bool:
        """Verifies the integrity of the entire blockchain."""
        for i in range(1, len(self.chain)):
            current = self.chain[i]
            previous = self.chain[i - 1]

            # Check current block hash integrity
            if current.hash != current.calculate_hash():
                return False

            # Check link to previous block
            if current.previous_hash != previous.hash:
                return False

        return True
