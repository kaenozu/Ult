#!/usr/bin/env python3
"""
動的なモデル特性分析と対話システム
各モデルの特性を動的に分析して最適な割り当てを決定
"""

import sys
import time
import json
from pathlib import Path
from typing import Dict, List, Any

class ModelCharacteristicsAnalyzer:
    """モデル特性分析器"""
    
    def __init__(self):
        # 各モデルの特性プロファイル
        self.model_profiles = {
            "Big-Pickle": {
                "strengths": ["包括的分析", "バランス", "安定性"],
                "weaknesses": ["深さ", "革新性"],
                "optimal_topics": ["政策", "戦略", "分析"],
                "interaction_style": "丁寧", "体系的",
                "response_time_factor": 1.2
            },
            "GLM-4.7": {
                "strengths": ["詳細さ", "正確性", "専門性"],
                "weaknesses": ["革新性", "実用性"],
                "optimal_topics": ["技術", "研究", "学術"],
                "interaction_style": "厳密", "論理的",
                "response_time_factor": 1.0
            },
            "MiniMax-M2.1": {
                "strengths": ["実用性", "具体性", "実装指向"],
                "weaknesses": ["深い分析", "抽象性"],
                "optimal_topics": ["実装", "開発", "手法"],
                "interaction_style": "直接的", "具体的",
                "response_time_factor": 0.8
            },
            "Grok-Code-Fast-1": {
                "strengths": ["革新性", "効率", "最適化"],
                "weaknesses": ["安定性", "網羅性"],
                "optimal_topics": ["最適化", "革新", "効率"],
                "interaction_style": "革新的", "簡潔",
                "response_time_factor": 0.9
            }
        }
    
    def analyze_topic_complexity(self, topic: str) -> Dict[str, Any]:
        """トピックの複雑度を分析"""
        complexity_indicators = {
            "technical_terms": sum(1 for term in ["実装", "最適化", "パフォーマンス", "アーキテクチャ", "API"] if term in topic),
            "abstract_terms": sum(1 for term in ["哲学", "理論", "概念", "理論構成"] if term in topic),
            "practical_terms": sum(1 for term in ["手法", "具体例", "実装方法", "手順"] if term in topic),
            "length": len(topic.split())
        }
        
        complexity_score = (
            complexity_indicators["technical_terms"] * 2 +
            complexity_indicators["abstract_terms"] * 3 +
            complexity_indicators["practical_terms"] * 1 +
            min(complexity_indicators["length"] / 10, 5)
        )
        
        return {
            "score": complexity_score,
            "is_technical": complexity_indicators["technical_terms"] > 0,
            "is_abstract": complexity_indicators["abstract_terms"] > 0,
            "is_practical": complexity_indicators["practical_terms"] > 0,
            "complexity_level": "high" if complexity_score > 8 else "medium" if complexity_score > 4 else "low"
        }
    
    def get_optimal_assignment(self, topic: str) -> Dict[str, Any]:
        """トピックに基づく最適なモデル割り当てを決定"""
        topic_analysis = self.analyze_topic_complexity(topic)
        
        # 各モデルの適合性スコア計算
        assignments = {}
        
        for model_name, profile in self.model_profiles.items():
            score = 0
            
            # トピック特性とのマッチング
            if topic_analysis["is_technical"] and "専門性" in profile["strengths"]:
                score += 3
            if topic_analysis["is_practical"] and "実用性" in profile["strengths"]:
                score += 2
            if topic_analysis["is_technical"] and "正確性" in profile["strengths"]:
                score += 2
            
            # 最適トピックとのマッチング
            if topic_analysis["complexity_level"] == "high" and "詳細さ" in profile["strengths"]:
                score += 3
            if topic_analysis["complexity_level"] == "low" and "具体性" in profile["strengths"]:
                score += 2
            
            # 適合性マッチング
            for topic_type in profile["optimal_topics"]:
                if topic_type.lower() in topic.lower():
                    score += 2
            
            # 弱点とのマッチング（低いスコア）
            for weakness in profile["weaknesses"]:
                if topic_analysis.get("is_" + weakness, False):
                    score -= 1
            
            assignments[model_name] = {
                "suitability_score": score,
                "is_primary": False,
                "reasoning": []
            }
        
        # 最高スコアのモデルを特定
        if assignments:
            best_model = max(assignments, key=lambda x: x["suitability_score"])
            best_model["is_primary"] = True
            best_model["reasoning"].append(f"最高適合性スコア: {best_model['suitability_score']}")
        
        return assignments
    
    def generate_interaction_plan(self, assignments: Dict[str, Any]) -> Dict[str, Any]:
        """対話計画を生成"""
        primary_model = None
        for model, assignment in assignments.items():
            if assignment["is_primary"]:
                primary_model = model
                break
        
        plan = {
            "primary_model": primary_model,
            "primary_role": "主分析担当",
            "supporting_models": [],
            "interaction_sequence": [],
            "coordination_strategy": ""
        }
        
        # 支援モデルの決定
        for model, assignment in assignments.items():
            if not assignment["is_primary"]:
                plan["supporting_models"].append({
                    "model": model,
                    "role": self._get_supporting_role(assignment),
                    "interaction_timing": "secondary"
                })
        
        # 対話シーケンスの生成
        plan["interaction_sequence"] = [
            {"step": 1, "model": primary_model, "action": "初期分析と視点提示"},
            {"step": 2, "model": primary_model, "action": "深掘り質問"},
            {"step": 3, "model": plan["supporting_models"][0]["model"] if plan["supporting_models"] else None, "action": "補足視点の提供"},
            {"step": 4, "model": primary_model, "action": "総合的な結論の形成"},
            {"step": 5, "model": plan["supporting_models"][1]["model"] if len(plan["supporting_models"]) > 1 else None, "action": "実用的な検証"}
        ]
        
        # 調整戦略
        plan["coordination_strategy"] = "プライマリーモデルが先に分析し、補助的な視点を補完"
        
        return plan

def _get_supporting_role(self, assignment: Dict[str, Any]) -> str:
    """支援モデルの役割を取得"""
    score = assignment["suitability_score"]
    if score >= 8:
        return "専門的支援"
    elif score >= 5:
        return "実用的支援"
    else:
        return "一般的支援"

def main():
    """メイン関数"""
    if len(sys.argv) < 2:
        print("使い方: python dynamic_analyzer.py \"<分析するトピック>\"")
        print("例: python dynamic_analyzer.py \"Reactコンポーネントの最適化手法について\"")
        sys.exit(1)
    
    topic = " ".join(sys.argv[1:])
    analyzer = ModelCharacteristicsAnalyzer()
    
    print(f"=== 動的モデル分析 ===")
    print(f"分析トピック: {topic}")
    print()
    
    # トピック複雑度分析
    topic_analysis = analyzer.analyze_topic_complexity(topic)
    print(f"トピック複雑度: {topic_analysis['complexity_level']} (スコア: {topic_analysis['score']})")
    print(f"技術的: {topic_analysis['is_technical']}")
    print(f"実用的: {topic_analysis['is_practical']}")
    print(f"抽象的: {topic_analysis['is_abstract']}")
    print()
    
    # モデル割り当て分析
    assignments = analyzer.get_optimal_assignment(topic)
    print("=== モデル割り当て分析 ===")
    
    for model, assignment in assignments.items():
        status = "【主担当】" if assignment["is_primary"] else "【支援】"
        print(f"{model}: {status} (適合スコア: {assignment['suitability_score']})")
        if assignment.get("reasoning"):
            for reason in assignment["reasoning"]:
                print(f"  理由: {reason}")
    
    # 対話計画生成
    print()
    print("=== 対話計画 ===")
    interaction_plan = analyzer.generate_interaction_plan(assignments)
    
    print(f"主担当モデル: {interaction_plan['primary_model']}")
    print(f"主役割: {interaction_plan['primary_role']}")
    print(f"支援モデル数: {len(interaction_plan['supporting_models'])}")
    print(f"調整戦略: {interaction_plan['coordination_strategy']}")
    print()
    print("対話シーケンス:")
    for step in interaction_plan["interaction_sequence"]:
        print(f"  ステップ{step['step']}: {step['model']} - {step['action']}")
    
    # 結果保存
    result = {
        "topic": topic,
        "topic_analysis": topic_analysis,
        "model_assignments": assignments,
        "interaction_plan": interaction_plan,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    }
    
    result_file = Path("dynamic_analysis_result.json")
    with open(result_file, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    print(f"\n結果を保存しました: {result_file}")

if __name__ == "__main__":
    main()