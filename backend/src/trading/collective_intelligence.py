import logging
import json
import os
import hashlib
from typing import Dict, List, Any
from datetime import datetime
from src.utils import retry_with_backoff

logger = logging.getLogger(__name__)

class BlockchainSignalLedger:
    """
    A simulated immutable ledger for trading signals.
    Each signal is a block linked to the previous one via a hash.
    """
    def __init__(self, ledger_path: str = "data/signal_chain.json"):
        self.ledger_path = ledger_path
        self.chain = self._load_chain()

    def _load_chain(self) -> List[Dict[str, Any]]:
        if os.path.exists(self.ledger_path):
            try:
                with open(self.ledger_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Failed to load ledger: {e}")
        
        # Genesis Block
        return [self._create_block("GENESIS", "0")]

    def _create_block(self, data: Any, previous_hash: str) -> Dict[str, Any]:
        block = {
            "index": 0 if data == "GENESIS" else len(self.chain),
            "timestamp": datetime.now().isoformat(),
            "data": data,
            "previous_hash": previous_hash,
            "nonce": 0
        }
        block["hash"] = self._calculate_hash(block)
        return block

    def _calculate_hash(self, block: Dict[str, Any]) -> str:
        block_string = json.dumps({k: v for k, v in block.items() if k != "hash"}, sort_keys=True).encode()
        return hashlib.sha256(block_string).hexdigest()

    @retry_with_backoff(retries=3)
    def add_signal(self, signal: Dict[str, Any]):
        previous_hash = self.chain[-1]["hash"]
        new_block = self._create_block(signal, previous_hash)
        self.chain.append(new_block)
        self._save_chain()

    def _save_chain(self):
        with open(self.ledger_path, "w", encoding="utf-8") as f:
            json.dump(self.chain, f, indent=2, ensure_ascii=False)

    def verify_integrity(self) -> bool:
        """Verifies that the chain has not been tampered with."""
        for i in range(1, len(self.chain)):
            current = self.chain[i]
            previous = self.chain[i-1]
            
            if current["hash"] != self._calculate_hash(current):
                return False
            if current["previous_hash"] != previous["hash"]:
                return False
        return True

class CollectiveIntelligenceManager:
    """
    Manages collective intelligence (signals) shared across multiple instances
    using a simulated Blockchain Ledger.
    """
    
    def __init__(self, node_id: str = "node_01", ledger_path: str = "data/signal_chain.json"):
        self.node_id = node_id
        self.ledger = BlockchainSignalLedger(ledger_path=ledger_path)
        
        if not os.path.exists("data"):
            os.makedirs("data")

    def publish_signal(self, ticker: str, action: str, confidence: float, reason: str):
        """
        Publishes its own signal to the DAO network (Blockchain).
        """
        signal = {
            "node_id": self.node_id,
            "ticker": ticker,
            "action": action,
            "confidence": confidence,
            "reason": reason,
            "timestamp": datetime.now().isoformat()
        }
        
        logger.info(f"🔗 Publishing signal to Blockchain Ledger: {ticker} {action}")
        self.ledger.add_signal(signal)

    def fetch_collective_signals(self) -> List[Dict[str, Any]]:
        """
        Collects all signals from the ledger.
        """
        # Extract signal data from blocks, excluding the genesis block
        return [block["data"] for block in self.ledger.chain if block["data"] != "GENESIS"]

    def get_consensus_signals(self) -> List[Dict[str, Any]]:
        """
        Generates consensus signals based on collective intelligence.
        """
        all_signals = self.fetch_collective_signals()
        if not all_signals:
            return []
            
        ticker_groups = {}
        for s in all_signals:
            t = s["ticker"]
            if t not in ticker_groups:
                ticker_groups[t] = []
            ticker_groups[t].append(s)
            
        consensus = []
        for ticker, signals in ticker_groups.items():
            buy_votes = sum(1 for s in signals if s["action"] == "BUY")
            sell_votes = sum(1 for s in signals if s["action"] == "SELL")
            
            avg_confidence = sum(s["confidence"] for s in signals) / len(signals)
            
            if buy_votes > sell_votes:
                action = "BUY"
                agreement = buy_votes / len(signals)
            elif sell_votes > buy_votes:
                action = "SELL"
                agreement = sell_votes / len(signals)
            else:
                action = "HOLD"
                agreement = 0.5
                
            if agreement >= 0.6: # Adopt only if 60% consensus
                consensus.append({
                    "ticker": ticker,
                    "action": action,
                    "agreement": agreement,
                    "avg_confidence": avg_confidence,
                    "num_nodes": len(signals)
                })
                
        return consensus

if __name__ == "__main__":
    cim = CollectiveIntelligenceManager("AGStock_Node_A")
    cim.publish_signal("7203", "BUY", 0.85, "Blockchain Verified Trend")
    
    print("Consensus Signals:", cim.get_consensus_signals())
    print("Chain Integrity:", cim.ledger.verify_integrity())