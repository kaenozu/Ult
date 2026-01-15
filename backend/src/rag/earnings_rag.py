"""
Earnings RAG Engine
決算短信PDFのベクトル化と検索機能を提供
"""

import logging
import os
from typing import Dict, List, Any

import chromadb
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings

logger = logging.getLogger(__name__)


class EarningsRAG:
    """
    決算短信用のRAG（Retrieval-Augmented Generation）エンジン
    """

    def __init__(self, persist_directory: str = "./data/chroma_earnings"):
        """
        初期化

        Args:
            persist_directory: ChromaDBの永続化ディレクトリ
        """
        self.persist_directory = persist_directory
        os.makedirs(persist_directory, exist_ok=True)

        # ChromaDB クライアント初期化
        self.client = chromadb.PersistentClient(path=persist_directory)

        # コレクション取得または作成
        try:
            self.collection = self.client.get_collection(name="earnings_reports")
            logger.info("Loaded existing earnings collection")
        except BaseException:
            self.collection = self.client.create_collection(
                name="earnings_reports",
                metadata={"description": "Earnings reports vector store"},
            )
            logger.info("Created new earnings collection")

        # Gemini Embeddings初期化
        try:
            api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
            if not api_key:
                logger.warning("No Gemini API key found. RAG will not work properly.")
                self.embeddings = None
            else:
                self.embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001", google_api_key=api_key)
                logger.info("Initialized Gemini embeddings")
        except Exception as e:
            logger.error(f"Failed to initialize embeddings: {e}")
            self.embeddings = None

        # テキスト分割器
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
        )

    def index_document(self, pdf_data: Dict[str, Any], doc_id: str) -> bool:
        """
        PDFドキュメントをインデックス化

        Args:
            pdf_data: PDFローダーから取得したデータ
            doc_id: ドキュメントID（例: "7203_2024Q3"）

        Returns:
            成功したかどうか
        """
        if not self.embeddings:
            logger.error("Embeddings not initialized. Cannot index document.")
            return False

        try:
            # テキスト取得
            text = pdf_data.get("text", "")
            if not text:
                logger.warning("No text found in PDF data")
                return False

            # チャンク分割
            chunks = self.text_splitter.split_text(text)
            logger.info(f"Split document into {len(chunks)} chunks")

            # メタデータ
            metadata = pdf_data.get("metadata", {})

            # 埋め込み生成とChromaDBに追加
            for i, chunk in enumerate(chunks):
                chunk_id = f"{doc_id}_chunk_{i}"

                # 埋め込み生成
                embedding = self.embeddings.embed_query(chunk)

                # ChromaDBに追加
                self.collection.add(
                    ids=[chunk_id],
                    embeddings=[embedding],
                    documents=[chunk],
                    metadatas=[
                        {
                            "doc_id": doc_id,
                            "chunk_index": i,
                            "company": metadata.get("company", "Unknown"),
                            "date": metadata.get("date", "Unknown"),
                        }
                    ],
                )

            logger.info(f"Successfully indexed document: {doc_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to index document: {e}")
            return False

    def query(self, question: str, n_results: int = 5, filter_doc_id: str = None) -> List[Dict[str, Any]]:
        """
        質問に関連するチャンクを検索

        Args:
            question: 検索クエリ
            n_results: 返す結果の数
            filter_doc_id: 特定のドキュメントIDでフィルタ（オプション）

        Returns:
            関連チャンクのリスト
        """
        if not self.embeddings:
            logger.error("Embeddings not initialized. Cannot query.")
            return []

        try:
            # 質問の埋め込み生成
            query_embedding = self.embeddings.embed_query(question)

            # フィルタ設定
            where_filter = None
            if filter_doc_id:
                where_filter = {"doc_id": filter_doc_id}

            # ChromaDBで検索
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=n_results,
                where=where_filter,
            )

            # 結果を整形
            formatted_results = []
            if results and results["documents"]:
                for i in range(len(results["documents"][0])):
                    formatted_results.append(
                        {
                            "text": results["documents"][0][i],
                            "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                            "distance": results["distances"][0][i] if results["distances"] else None,
                        }
                    )

            logger.info(f"Found {len(formatted_results)} relevant chunks for query")
            return formatted_results

        except Exception as e:
            logger.error(f"Query failed: {e}")
            return []

    def get_document_summary(self, doc_id: str) -> Dict[str, Any]:
        """
        特定ドキュメントの要約情報を取得

        Args:
            doc_id: ドキュメントID

        Returns:
            要約情報
        """
        try:
            # ドキュメントの全チャンクを取得
            results = self.collection.get(where={"doc_id": doc_id})

            if not results or not results["documents"]:
                return {"error": "Document not found"}

            return {
                "doc_id": doc_id,
                "num_chunks": len(results["documents"]),
                "metadata": results["metadatas"][0] if results["metadatas"] else {},
            }

        except Exception as e:
            logger.error(f"Failed to get document summary: {e}")
            return {"error": str(e)}

    def delete_document(self, doc_id: str) -> bool:
        """
        ドキュメントを削除

        Args:
            doc_id: ドキュメントID

        Returns:
            成功したかどうか
        """
        try:
            # ドキュメントの全チャンクを削除
            self.collection.delete(where={"doc_id": doc_id})
            logger.info(f"Deleted document: {doc_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete document: {e}")
            return False


if __name__ == "__main__":
    # テスト
    logging.basicConfig(level=logging.INFO)

    rag = EarningsRAG()

    # サンプルデータでテスト
    sample_pdf_data = {
        "text": "当社の2024年第3四半期の売上高は1000億円で、前年同期比15%増となりました。営業利益は120億円で、利益率は12%です。",
        "metadata": {"company": "サンプル株式会社", "date": "2024-11-01"},
    }

    # インデックス化
    success = rag.index_document(sample_pdf_data, "SAMPLE_2024Q3")
    print(f"Indexing success: {success}")

    # 検索
    results = rag.query("売上高はいくらですか？")
    print(f"Query results: {results}")
