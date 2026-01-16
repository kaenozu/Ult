#!/usr/bin/env python3
"""
強化されたNLPベースのキーワード検出器
より文脈的な理解で議論キーワードを検出
"""

import re
import jieba
import sys
from pathlib import Path

# プロジェクトルートの検出
def find_project_root(start_path):
    current = start_path
    while current.parent != current:
        if (current / "package.json").exists():
            return current
        current = current.parent
    raise FileNotFoundError("Project root not found")

project_root = find_project_root(Path(__file__).resolve())
sys.path.insert(0, str(project_root / "backend"))

class EnhancedKeywordDetector:
    """強化されたキーワード検出器"""
    
    def __init__(self):
        # 議論関連キーワード（拡張版）
        self.discussion_keywords = {
            # 基本キーワード
            "議論して", "議論", "検討", "比較", "分析", "どう思う", "意見", "考えて", "意見交換",
            "話し合う", "協議", "相談", "アドバイス", "レビュー", "評価", "検証", "見解",
            
            # 拡張キーワード
            "意見を出す", "考えを出す", "提案", "提言", "勧告", "結論を出す", "まとめる", "整理する",
            "集約する", "統合する", "検討する", "分析する", "考察する", "検証する",
            
            # 文脈理解系
            "どのように", "なぜならば", "どうして", "理由は", "根拠は", "背景は", "状況は", "問題は",
            "課題は", "懸念事項は", "懸念点は",
            
            # 対話・対話系
            "対話する", "話し合う", "意見を交換する", "協議する", "相談に乗る",
            "議論を深める", "意見を交わす", "結論を出し合う",
            
            # 評価・判断系
            "評価する", "判断する", "検討する", "吟味する", "考察する", "分析する",
            "比較検討する", "優劣をつける", "長所短所を分析する",
            
            # 合意形成系
            "合意する", "合意形成する", "コンセンサスを得る", "一致点を探る",
            "共通認識を形成する", "折衷案を出す"
        }
        
        # 文脈理解モデルの初期化
        self.use_nlp = False
        # try:
        #     import jieba
        #     jieba.initialize()
        #     print("✓ NLPモデルを初期化しました")
        # except ImportError:
        #     print("⚠ jiebaがインストールされていません。基本キーワード検出を使用します")
        #     self.use_nlp = False
        # else:
        #     self.use_nlp = True
    
    def detect_discussion_intent(self, text: str) -> dict:
        """議論の意図を検出"""
        results = {
            "is_discussion": False,
            "confidence": 0.0,
            "detected_keywords": [],
            "intent_type": None,
            "nlp_analysis": None
        }
        
        text_lower = text.lower()
        
        # 基本キーワード検出
        detected_keywords = []
        for keyword in self.discussion_keywords:
            if keyword in text_lower:
                detected_keywords.append(keyword)
        
        # 意図タイプの判定
        if len(detected_keywords) == 0:
            results["confidence"] = 0.0
            results["is_discussion"] = False
        elif len(detected_keywords) <= 2:
            results["confidence"] = 0.3
            results["is_discussion"] = True
            results["intent_type"] = "simple"
        elif len(detected_keywords) <= 5:
            results["confidence"] = 0.6
            results["is_discussion"] = True
            results["intent_type"] = "moderate"
        else:
            results["confidence"] = 0.9
            results["is_discussion"] = True
            results["intent_type"] = "complex"
        
        results["detected_keywords"] = detected_keywords
        
        # NLP分析（利用可能な場合）
        if self.use_nlp and len(detected_keywords) > 0:
            try:
                import jieba
                words = jieba.lcut(text)
                nouns = [word for word in words if len(word) > 1 and not word.isdigit()]
                verbs = [word for word in words if word in ["議論", "検討", "分析", "評価", "比較", "考える", "話す"]]
                
                results["nlp_analysis"] = {
                    "total_words": len(words),
                    "nouns_count": len(nouns),
                    "verbs_count": len(verbs),
                    "key_nouns": nouns[:5] if nouns else [],
                    "key_verbs": verbs[:3] if verbs else [],
                    "has_conversation_words": any(word in words for word in ["話", "議論", "意見", "相談"]),
                    "has_analysis_words": any(word in words for word in ["分析", "評価", "検討", "比較"])
                }
            except Exception as e:
                print(f"NLP分析エラー: {e}")
        
        return results
    
    def get_enhanced_prompt(self, topic: str, context: str = "", previous_results: list = None) -> str:
        """強化されたプロンプトを生成"""
        
        # 基本プロンプト
        base_prompt = f"""トピック: {topic}
文脈: {context}

以下の視点から分析してください：

1. 問題の本質を特定する
2. 複数の視点を考慮する
3. 実用的な解決策を提案する
4. 長所と短所をバランス評価する
5. 次のステップを具体的に示す

構造的な回答を心がけてください。"""
        
        # 過去の結果を考慮した追加指示
        if previous_results:
            previous_summary = self._summarize_previous_results(previous_results)
            enhanced_prompt = base_prompt + f"""

過去の議論結果を考慮：
{previous_summary}

これまでの分析を踏まえて、より深い考察をお願いします。"""
        else:
            enhanced_prompt = base_prompt
        
        return enhanced_prompt
    
    def _summarize_previous_results(self, results: list) -> str:
        """過去の結果を要約"""
        if not results:
            return "過去の議論結果はありません"
        
        summary_points = []
        
        # 共通点の抽出
        all_keywords = set()
        for result in results:
            if "detected_keywords" in result:
                all_keywords.update(result["detected_keywords"])
        
        if all_keywords:
            summary_points.append(f"共通キーワード: {', '.join(list(all_keywords)[:5])}")
        
        # 意図タイプの分布
        intent_types = [r.get("intent_type", "unknown") for r in results if "intent_type" in r]
        type_counts = {}
        for intent_type in intent_types:
            type_counts[intent_type] = type_counts.get(intent_type, 0) + 1
        
        if type_counts:
            dominant_type = max(type_counts, key=type_counts.get)
            summary_points.append(f"主要な意図タイプ: {dominant_type}")
        
        return "; ".join(summary_points)

def main():
    """メイン関数"""
    if len(sys.argv) < 2:
        print("使い方: python enhanced_detector.py \"<検出するテキスト>\"")
        print("例: python enhanced_detector.py \"この提案について議論して\"")
        sys.exit(1)
    
    # 検出器の初期化
    detector = EnhancedKeywordDetector()
    
    # 検出対象テキスト
    test_text = " ".join(sys.argv[1:])
    
    print(f"=== 強化されたキーワード検出 ===")
    print(f"検出テキスト: {test_text}")
    print()
    
    # 検出実行
    result = detector.detect_discussion_intent(test_text)
    
    # 結果表示
    print("=== 検出結果 ===")
    print(f"議論キーワード: {len(result['detected_keywords'])個")
    print(f"検出されたキーワード: {', '.join(result['detected_keywords'])}")
    print(f"議論の確信度: {result['confidence']:.2f}")
    print(f"意図タイプ: {result['intent_type']}")
    print(f"議論判定: {'はい' if result['is_discussion'] else 'いいえ'}")
    
    if result.get("nlp_analysis"):
        nlp = result["nlp_analysis"]
        print()
        print("=== NLP分析 ===")
        print(f"総単語数: {nlp['total_words']}")
        print(f"名詞数: {nlp['nouns_count']}")
        print(f"動詞数: {nlp['verbs_count']}")
        print(f"主要な名詞: {', '.join(nlp['key_nouns'])}")
        print(f"主要な動詞: {', '.join(nlp['key_verbs'])}")
        print(f"対話ワード有り: {'はい' if nlp['has_conversation_words'] else 'いいえ'}")
        print(f"分析ワード有り: {'はい' if nlp['has_analysis_words'] else 'いいえ'}")
    
    # 強化されたプロンプト生成例
    print()
    print("=== 強化されたプロンプト例 ===")
    enhanced_prompt = detector.get_enhanced_prompt(
        "提案の実装方針",
        "Reactコンポーネントの最適化",
        [{"model": "Big-Pickle", "detected_keywords": ["提案", "実装"], "intent_type": "moderate"}]
    )
    
    print("サンプル:")
    print(enhanced_prompt)

if __name__ == "__main__":
    main()