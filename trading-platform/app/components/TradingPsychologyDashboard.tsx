/**
 * Trading Psychology Dashboard
 *
 * TRADING-029: トレード心理学分析
 * 心理状態の可視化、取引パターンのグラフ表示
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useJournalStore } from '@/app/store/journalStore';
import { usePsychologyStore } from '@/app/store/psychologyStore';
import { createAITradingCoach, TradingPattern, ImprovementSuggestion } from '@/app/lib/psychology/AITradingCoach';
import { createSentimentAnalyzer, FearGreedIndex, EmotionTradeCorrelation } from '@/app/lib/psychology/SentimentAnalyzer';
import { createDisciplineMonitor, RuleViolation, LearningPattern } from '@/app/lib/psychology/DisciplineMonitor';
import { cn } from '@/app/lib/utils';

interface TradingPsychologyDashboardProps {
  className?: string;
}

export function TradingPsychologyDashboard({ className }: TradingPsychologyDashboardProps) {
  const { journal } = useJournalStore();
  const { disciplineScore } = usePsychologyStore();

  const [activeTab, setActiveTab] = useState<'overview' | 'patterns' | 'sentiment' | 'discipline'>('overview');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // AIコーチ、センチメントアナライザー、規律モニターのインスタンス
  const aiCoach = useMemo(() => createAITradingCoach(), []);
  const sentimentAnalyzer = useMemo(() => createSentimentAnalyzer(), []);
  const disciplineMonitor = useMemo(() => createDisciplineMonitor(), []);

  // 分析結果の状態
  const [patterns, setPatterns] = useState<TradingPattern[]>([]);
  const [suggestions, setSuggestions] = useState<ImprovementSuggestion[]>([]);
  const [fearGreedIndex, setFearGreedIndex] = useState<FearGreedIndex | null>(null);
  const [correlations, setCorrelations] = useState<EmotionTradeCorrelation[]>([]);
  const [violations, setViolations] = useState<RuleViolation[]>([]);
  const [learningPatterns, setLearningPatterns] = useState<LearningPattern[]>([]);

  // 分析を実行
  useEffect(() => {
    const runAnalysis = () => {
      setIsAnalyzing(true);

      try {
        // パターン分析
        const newPatterns = aiCoach.analyzeTradingPatterns(journal);
        setPatterns(newPatterns);

        // 改善提案
        const newSuggestions = aiCoach.generateSuggestions(journal, newPatterns);
        setSuggestions(newSuggestions);

        // センチメント分析
        const fearGreed = sentimentAnalyzer.calculateFearGreedIndex(journal);
        setFearGreedIndex(fearGreed);

        const newCorrelations = sentimentAnalyzer.analyzeEmotionTradeCorrelation(journal);
        setCorrelations(newCorrelations);

        // 規律チェック
        journal.forEach(entry => {
          disciplineMonitor.checkEntryForViolations(entry);
        });

        const recentViolations = disciplineMonitor.getRecentViolations(7);
        setViolations(recentViolations);

        const newLearningPatterns = disciplineMonitor.extractLearningPatterns(journal);
        setLearningPatterns(newLearningPatterns);

      } catch (error) {
        console.error('Analysis error:', error);
      } finally {
        setIsAnalyzing(false);
      }
    };

    if (journal.length > 0) {
      runAnalysis();
    }
  }, [journal, aiCoach, sentimentAnalyzer, disciplineMonitor]);

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBgColor = (score: number): string => {
    if (score >= 80) return 'bg-green-500/20 border-green-500/50';
    if (score >= 60) return 'bg-yellow-500/20 border-yellow-500/50';
    return 'bg-red-500/20 border-red-500/50';
  };

  const getPatternImpactColor = (impact: string): string => {
    if (impact === 'positive') return 'text-green-400';
    if (impact === 'negative') return 'text-red-400';
    return 'text-gray-400';
  };

  const getPriorityColor = (priority: string): string => {
    if (priority === 'high') return 'bg-red-500/20 text-red-400 border-red-500/50';
    if (priority === 'medium') return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
    return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
  };

  const getSeverityColor = (severity: string): string => {
    if (severity === 'critical' || severity === 'major') return 'bg-red-500/20 text-red-400';
    if (severity === 'moderate') return 'bg-yellow-500/20 text-yellow-400';
    return 'bg-blue-500/20 text-blue-400';
  };

  if (journal.length === 0) {
    return (
      <div className={cn('p-6 text-center text-gray-400', className)}>
        <p>取引データがありません。取引を開始すると、心理分析が表示されます。</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">トレード心理学分析</h2>
        {isAnalyzing && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400" />
            分析中...
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700 pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={cn(
            'px-4 py-2 rounded-lg transition-colors',
            activeTab === 'overview'
              ? 'bg-blue-500/20 text-blue-400'
              : 'text-gray-400 hover:bg-gray-700/50'
          )}
        >
          概要
        </button>
        <button
          onClick={() => setActiveTab('patterns')}
          className={cn(
            'px-4 py-2 rounded-lg transition-colors',
            activeTab === 'patterns'
              ? 'bg-blue-500/20 text-blue-400'
              : 'text-gray-400 hover:bg-gray-700/50'
          )}
        >
          取引パターン
        </button>
        <button
          onClick={() => setActiveTab('sentiment')}
          className={cn(
            'px-4 py-2 rounded-lg transition-colors',
            activeTab === 'sentiment'
              ? 'bg-blue-500/20 text-blue-400'
              : 'text-gray-400 hover:bg-gray-700/50'
          )}
        >
          センチメント
        </button>
        <button
          onClick={() => setActiveTab('discipline')}
          className={cn(
            'px-4 py-2 rounded-lg transition-colors',
            activeTab === 'discipline'
              ? 'bg-blue-500/20 text-blue-400'
              : 'text-gray-400 hover:bg-gray-700/50'
          )}
        >
          規律
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Score Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 規律スコア */}
            {disciplineScore && (
              <div className={cn(
                'p-4 rounded-lg border',
                getScoreBgColor(disciplineScore.overall)
              )}>
                <div className="text-sm text-gray-400 mb-1">規律スコア</div>
                <div className={cn('text-3xl font-bold', getScoreColor(disciplineScore.overall))}>
                  {disciplineScore.overall}
                </div>
                <div className="mt-2 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">計画遵守</span>
                    <span className={getScoreColor(disciplineScore.planAdherence)}>
                      {disciplineScore.planAdherence.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">感情コントロール</span>
                    <span className={getScoreColor(disciplineScore.emotionalControl)}>
                      {disciplineScore.emotionalControl.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">損失管理</span>
                    <span className={getScoreColor(disciplineScore.lossManagement)}>
                      {disciplineScore.lossManagement.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Fear & Greed Index */}
            {fearGreedIndex && (
              <div className={cn(
                'p-4 rounded-lg border',
                fearGreedIndex.current < 40 ? 'bg-green-500/20 border-green-500/50' :
                fearGreedIndex.current < 60 ? 'bg-yellow-500/20 border-yellow-500/50' :
                'bg-red-500/20 border-red-500/50'
              )}>
                <div className="text-sm text-gray-400 mb-1">恐怖 & 貪欲指数</div>
                <div className="text-3xl font-bold text-white">
                  {fearGreedIndex.current}
                </div>
                <div className="text-sm text-gray-300 mt-1">{fearGreedIndex.label}</div>
                <div className="mt-2 text-xs text-gray-400">
                  トレンド: {
                    fearGreedIndex.trend === 'increasing' ? '上昇' :
                    fearGreedIndex.trend === 'decreasing' ? '下降' : '安定'
                  }
                </div>
              </div>
            )}

            {/* Pattern Count */}
            <div className="p-4 rounded-lg border border-gray-700 bg-gray-800/50">
              <div className="text-sm text-gray-400 mb-1">検出されたパターン</div>
              <div className="text-3xl font-bold text-white">
                {patterns.length}
              </div>
              <div className="mt-2 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">改善提案</span>
                  <span className="text-blue-400">{suggestions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">ルール違反</span>
                  <span className="text-red-400">{violations.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Suggestions */}
          {suggestions.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white">改善提案</h3>
              <div className="space-y-3">
                {suggestions.slice(0, 3).map((suggestion, index) => (
                  <div
                    key={index}
                    className={cn(
                      'p-4 rounded-lg border',
                      getPriorityColor(suggestion.priority)
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-white">{suggestion.title}</h4>
                      <span className={cn(
                        'text-xs px-2 py-1 rounded',
                        getPriorityColor(suggestion.priority)
                      )}>
                        {suggestion.priority === 'high' ? '高' :
                         suggestion.priority === 'medium' ? '中' : '低'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 mb-2">{suggestion.description}</p>
                    <div className="text-xs text-gray-400">
                      <div className="font-medium mb-1">アクション:</div>
                      <ul className="list-disc list-inside space-y-1">
                        {suggestion.actionableSteps.slice(0, 2).map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Patterns Tab */}
      {activeTab === 'patterns' && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-white">検出された取引パターン</h3>

          {patterns.length === 0 ? (
            <div className="p-6 text-center text-gray-400 border border-gray-700 rounded-lg">
              <p>パターンは検出されませんでした。</p>
            </div>
          ) : (
            <div className="space-y-3">
              {patterns.map((pattern, index) => (
                <div
                  key={index}
                  className="p-4 rounded-lg border border-gray-700 bg-gray-800/50"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-white">
                      {pattern.patternType.replace(/_/g, ' ').toUpperCase()}
                    </h4>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'text-xs px-2 py-1 rounded',
                        getPatternImpactColor(pattern.impact)
                      )}>
                        {pattern.impact === 'positive' ? 'ポジティブ' :
                         pattern.impact === 'negative' ? 'ネガティブ' : '中立'}
                      </span>
                      <span className="text-xs text-gray-400">
                        信頼度: {Math.round(pattern.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-300 mb-2">{pattern.description}</p>
                  <div className="text-xs text-gray-400">
                    頻度: {Math.round(pattern.frequency * 100)}%
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* All Suggestions */}
          {suggestions.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white">すべての改善提案</h3>
              <div className="space-y-3">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className={cn(
                      'p-4 rounded-lg border',
                      getPriorityColor(suggestion.priority)
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-white">{suggestion.title}</h4>
                      <span className={cn(
                        'text-xs px-2 py-1 rounded',
                        getPriorityColor(suggestion.priority)
                      )}>
                        {suggestion.priority === 'high' ? '高' :
                         suggestion.priority === 'medium' ? '中' : '低'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 mb-3">{suggestion.description}</p>
                    <div className="space-y-2">
                      <div className="text-xs text-gray-400">
                        <div className="font-medium mb-1">アクションステップ:</div>
                        <ul className="list-disc list-inside space-y-1">
                          {suggestion.actionableSteps.map((step, i) => (
                            <li key={i}>{step}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="text-xs text-gray-400 pt-2 border-t border-gray-700">
                        <div>期待される効果: {suggestion.expectedImpact}</div>
                        <div>タイムフレーム: {suggestion.timeframe}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sentiment Tab */}
      {activeTab === 'sentiment' && (
        <div className="space-y-6">
          {/* Fear & Greed Index Detail */}
          {fearGreedIndex && (
            <div className="p-4 rounded-lg border border-gray-700 bg-gray-800/50">
              <h3 className="text-lg font-semibold text-white mb-3">恐怖 & 貪欲指数 詳細</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-400">{fearGreedIndex.components.fear}</div>
                  <div className="text-xs text-gray-400 mt-1">恐怖</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">{fearGreedIndex.components.greed}</div>
                  <div className="text-xs text-gray-400 mt-1">貪欲</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">{fearGreedIndex.components.confidence}</div>
                  <div className="text-xs text-gray-400 mt-1">自信</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">{fearGreedIndex.components.stress}</div>
                  <div className="text-xs text-gray-400 mt-1">ストレス</div>
                </div>
              </div>
            </div>
          )}

          {/* Emotion-Trade Correlations */}
          {correlations.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white">感情-取引 相関分析</h3>
              <div className="space-y-3">
                {correlations.map((corr, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-lg border border-gray-700 bg-gray-800/50"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-white">
                        {corr.emotionType === 'fear' ? '恐怖' :
                         corr.emotionType === 'greed' ? '貪欲' :
                         corr.emotionType === 'confidence' ? '自信' : 'ストレス'}
                      </h4>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'text-xs px-2 py-1 rounded',
                          corr.significance === 'high' ? 'bg-red-500/20 text-red-400' :
                          corr.significance === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-blue-500/20 text-blue-400'
                        )}>
                          {corr.significance === 'high' ? '高' :
                           corr.significance === 'medium' ? '中' : '低'}
                        </span>
                        <span className={cn(
                          'text-sm',
                          corr.correlationCoefficient > 0 ? 'text-green-400' : 'text-red-400'
                        )}>
                          {corr.correlationCoefficient > 0 ? '+' : ''}{corr.correlationCoefficient}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-300 mb-2">{corr.recommendation}</p>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center p-2 bg-gray-700/50 rounded">
                        <div className="text-gray-400">低感情時利益</div>
                        <div className="text-white font-medium">
                          ${corr.impactOnProfit.lowEmotionProfit.toFixed(2)}
                        </div>
                      </div>
                      <div className="text-center p-2 bg-gray-700/50 rounded">
                        <div className="text-gray-400">高感情時利益</div>
                        <div className="text-white font-medium">
                          ${corr.impactOnProfit.highEmotionProfit.toFixed(2)}
                        </div>
                      </div>
                      <div className="text-center p-2 bg-gray-700/50 rounded">
                        <div className="text-gray-400">差異</div>
                        <div className={cn(
                          'font-medium',
                          corr.impactOnProfit.difference > 0 ? 'text-green-400' : 'text-red-400'
                        )}>
                          {corr.impactOnProfit.difference > 0 ? '+' : ''}${corr.impactOnProfit.difference.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {correlations.length === 0 && (
            <div className="p-6 text-center text-gray-400 border border-gray-700 rounded-lg">
              <p>相関分析を行うには、より多くの取引データが必要です。</p>
            </div>
          )}
        </div>
      )}

      {/* Discipline Tab */}
      {activeTab === 'discipline' && (
        <div className="space-y-6">
          {/* Rule Violations */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white">最近のルール違反（過去7日間）</h3>

            {violations.length === 0 ? (
              <div className="p-6 text-center text-green-400 border border-green-500/50 rounded-lg bg-green-500/10">
                <p className="font-medium">ルール違反はありません！素晴らしい規律です。</p>
              </div>
            ) : (
              <div className="space-y-2">
                {violations.map((violation, index) => (
                  <div
                    key={index}
                    className={cn(
                      'p-3 rounded-lg border',
                      getSeverityColor(violation.severity)
                    )}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <span className="font-medium text-white">
                        {violation.type.replace(/_/g, ' ').toUpperCase()}
                      </span>
                      <span className={cn(
                        'text-xs px-2 py-1 rounded',
                        getSeverityColor(violation.severity)
                      )}>
                        {violation.severity === 'critical' ? '重大' :
                         violation.severity === 'major' ? '重要' :
                         violation.severity === 'moderate' ? '中程度' : '軽微'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300">{violation.description}</p>
                    {violation.impact && (
                      <div className="text-xs text-gray-400 mt-1">
                        影響: {violation.impact.actualLoss ? `$${violation.impact.actualLoss.toFixed(2)}` :
                               `最大 $${violation.impact.potentialLoss?.toFixed(2)}`}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Learning Patterns */}
          {learningPatterns.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white">学習パターン</h3>
              <div className="space-y-3">
                {learningPatterns.map((pattern, index) => (
                  <div
                    key={index}
                    className={cn(
                      'p-4 rounded-lg border',
                      pattern.patternType === 'successful_behavior' ? 'border-green-500/50 bg-green-500/10' :
                      pattern.patternType === 'failure_pattern' ? 'border-red-500/50 bg-red-500/10' :
                      'border-blue-500/50 bg-blue-500/10'
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-white">{pattern.description}</h4>
                      <span className="text-xs text-gray-400">
                        信頼度: {Math.round(pattern.confidence * 100)}%
                      </span>
                    </div>
                    {pattern.recommendation && (
                      <p className="text-sm text-gray-300">{pattern.recommendation}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Discipline Score Breakdown */}
          {disciplineScore && (
            <div className="p-4 rounded-lg border border-gray-700 bg-gray-800/50">
              <h3 className="text-lg font-semibold text-white mb-3">規律スコア詳細</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">計画遵守</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full transition-all',
                          disciplineScore.planAdherence >= 80 ? 'bg-green-500' :
                          disciplineScore.planAdherence >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        )}
                        style={{ width: `${disciplineScore.planAdherence}%` }}
                      />
                    </div>
                    <span className="text-sm text-white font-medium">
                      {disciplineScore.planAdherence.toFixed(1)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">感情コントロール</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full transition-all',
                          disciplineScore.emotionalControl >= 80 ? 'bg-green-500' :
                          disciplineScore.emotionalControl >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        )}
                        style={{ width: `${disciplineScore.emotionalControl}%` }}
                      />
                    </div>
                    <span className="text-sm text-white font-medium">
                      {disciplineScore.emotionalControl.toFixed(1)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">損失管理</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full transition-all',
                          disciplineScore.lossManagement >= 80 ? 'bg-green-500' :
                          disciplineScore.lossManagement >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        )}
                        style={{ width: `${disciplineScore.lossManagement}%` }}
                      />
                    </div>
                    <span className="text-sm text-white font-medium">
                      {disciplineScore.lossManagement.toFixed(1)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">ジャーナル記録</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full transition-all',
                          disciplineScore.journalConsistency >= 80 ? 'bg-green-500' :
                          disciplineScore.journalConsistency >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        )}
                        style={{ width: `${disciplineScore.journalConsistency}%` }}
                      />
                    </div>
                    <span className="text-sm text-white font-medium">
                      {disciplineScore.journalConsistency.toFixed(1)}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">クーリングオフ遵守</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full transition-all',
                          disciplineScore.coolingOffCompliance >= 80 ? 'bg-green-500' :
                          disciplineScore.coolingOffCompliance >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        )}
                        style={{ width: `${disciplineScore.coolingOffCompliance}%` }}
                      />
                    </div>
                    <span className="text-sm text-white font-medium">
                      {disciplineScore.coolingOffCompliance.toFixed(1)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
