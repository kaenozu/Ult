"""
Shared Experience Memory (Akashic Records)
エージェント間で共有される取引経験・集合知データベース
"""

import os
import json
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional

try:
    import chromadb
    from chromadb.utils import embedding_functions
    CHROMA_AVAILABLE = True
except ImportError:
    CHROMA_AVAILABLE = False

logger = logging.getLogger(__name__)

class ExperienceMemory:
    """
    過去の取引状況、判断、結果を記憶し、類似状況下での意思決定をサポートするクラス
    """

    def __init__(self, persist_directory: str = "./data/chroma_experiences"):
        self.persist_directory = persist_directory
        self.client = None
        self.collection = None
        
        if CHROMA_AVAILABLE:
            try:
                self.client = chromadb.PersistentClient(path=persist_directory)
                # デフォルトの埋め込み関数（SentenceTransformer等）を使用
                self.embedding_fn = embedding_functions.DefaultEmbeddingFunction()
                self.collection = self.client.get_or_create_collection(
                    name="trading_experiences",
                    embedding_function=self.embedding_fn
                )
                logger.info("Akashic Records (Experience Memory) initialized.")
            except Exception as e:
                logger.error(f"Failed to initialize ChromaDB: {e}")
                self.client = None

    def record_experience(
        self, 
        context: Dict[str, Any], 
        decision: str, 
        outcome: float, 
        tags: List[str] = None
    ):
        """
        新しい経験をデータベースに記録する
        """
        if not self.collection:
            return

        exp_id = f"exp_{{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}}"
        
        # コンテキストを文字列化して検索可能にする
        context_str = f"Market: {context.get('market_trend')}, VIX: {context.get('vix')}, Sentiment: {context.get('sentiment')}. "
        context_str += f"Strategy used: {context.get('strategy')}. Decision was {decision}."
        
        metadata = {
            "timestamp": datetime.now().isoformat(),
            "decision": decision,
            "outcome": float(outcome),
            "tags": json.dumps(tags or []),
            "strategy": context.get('strategy', 'unknown')
        }

        try:
            self.collection.add(
                documents=[context_str],
                metadatas=[metadata],
                ids=[exp_id]
            )
            logger.info(f"Recorded new experience: {exp_id} (Outcome: {outcome:+.2%})")
        except Exception as e:
            logger.error(f"Error recording experience: {e}")

    def query_similar_experiences(self, current_context: Dict[str, Any], n_results: int = 3) -> List[Dict]:
        """
        現在の状況に似た過去の経験を検索する
        """
        if not self.collection:
            return []

        query_str = f"Market: {current_context.get('market_trend')}, VIX: {current_context.get('vix')}, Sentiment: {current_context.get('sentiment')}"
        
        try:
            results = self.collection.query(
                query_texts=[query_str],
                n_results=n_results
            )
            
            experiences = []
            if results and results['documents']:
                for i in range(len(results['documents'][0])):
                    experiences.append({
                        "context": results['documents'][0][i],
                        "metadata": results['metadatas'][0][i],
                        "distance": results['distances'][0][i] if 'distances' in results else 0
                    })
            return experiences
        except Exception as e:
            logger.error(f"Error querying experiences: {e}")
            return []

    def get_collective_wisdom(self, current_context: Dict[str, Any]) -> str:
        """
        類似した過去事例から「知恵（アドバイス）」を抽出する
        """
        similars = self.query_similar_experiences(current_context)
        if not similars:
            return "類似する過去の経験は見つかりませんでした。独自の判断を行ってください。"

        wisdom = "【過去の知見】\n"
        for exp in similars:
            outcome = exp['metadata']['outcome']
            status = "成功" if outcome > 0 else "失敗"
            wisdom += f"・過去の類似状況（{status}, リターン: {outcome:+.2%}）: "
            wisdom += f"判断は {exp['metadata']['decision']}。戦略は {exp['metadata']['strategy']} でした。\n"
            
        return wisdom

if __name__ == "__main__":
    # テスト
    memory = ExperienceMemory() 
    
    # 経験の記録テスト
    test_context = {
        "market_trend": "DOWN",
        "vix": 35.0,
        "sentiment": "Fear",
        "strategy": "Contrarian"
    }
    memory.record_experience(test_context, "BUY", -0.05, ["vix_spike", "bottom_fishing"])
    
    # 検索テスト
    wisdom = memory.get_collective_wisdom({"market_trend": "DOWN", "vix": 32.0})
    print(wisdom)
