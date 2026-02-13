import { useState, useEffect, useMemo } from 'react';
import { useJournalStore } from '@/app/store/journalStore';
import { usePsychologyStore } from '@/app/store/psychologyStore';
import { createAITradingCoach, TradingPattern, ImprovementSuggestion } from '@/app/lib/psychology/AITradingCoach';
import { createSentimentAnalyzer, FearGreedIndex, EmotionTradeCorrelation } from '@/app/lib/psychology/SentimentAnalyzer';
import { createDisciplineMonitor, RuleViolation, LearningPattern } from '@/app/lib/psychology/DisciplineMonitor';
import { DisciplineScoreCalculator } from '@/app/lib/psychology/DisciplineScoreCalculator';

export function usePsychologyAnalysis() {
  const { journal } = useJournalStore();
  const { current_mental_health, cooldownRecords } = usePsychologyStore();
  
  const disciplineScoreValue = current_mental_health?.discipline_score ?? 0;
  
  const disciplineMetrics = useMemo(() => {
    const calculator = new DisciplineScoreCalculator();
    const entries = journal || [];
    const records = cooldownRecords || [];
    const detailedScore = calculator.calculateDisciplineScore(entries, records);
    
    return {
      overall: disciplineScoreValue || detailedScore.overall,
      planAdherence: detailedScore.planAdherence,
      emotionalControl: detailedScore.emotionalControl,
      lossManagement: detailedScore.lossManagement,
      journalConsistency: detailedScore.journalConsistency,
      coolingOffCompliance: detailedScore.coolingOffCompliance,
    };
  }, [disciplineScoreValue, journal, cooldownRecords]);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const aiCoach = useMemo(() => createAITradingCoach(), []);
  const sentimentAnalyzer = useMemo(() => createSentimentAnalyzer(), []);
  const disciplineMonitor = useMemo(() => createDisciplineMonitor(), []);

  const [patterns, setPatterns] = useState<TradingPattern[]>([]);
  const [suggestions, setSuggestions] = useState<ImprovementSuggestion[]>([]);
  const [fearGreedIndex, setFearGreedIndex] = useState<FearGreedIndex | null>(null);
  const [correlations, setCorrelations] = useState<EmotionTradeCorrelation[]>([]);
  const [violations, setViolations] = useState<RuleViolation[]>([]);
  const [learningPatterns, setLearningPatterns] = useState<LearningPattern[]>([]);

  useEffect(() => {
    const runAnalysis = () => {
      setIsAnalyzing(true);
      try {
        setPatterns(aiCoach.analyzeTradingPatterns(journal));
        setSuggestions(aiCoach.generateSuggestions(journal, patterns));
        setFearGreedIndex(sentimentAnalyzer.calculateFearGreedIndex(journal));
        setCorrelations(sentimentAnalyzer.analyzeEmotionTradeCorrelation(journal));
        
        journal.forEach(entry => disciplineMonitor.checkEntryForViolations(entry));
        setViolations(disciplineMonitor.getRecentViolations(7));
        setLearningPatterns(disciplineMonitor.extractLearningPatterns(journal));
      } catch (error) {
        console.error('Analysis error:', error);
      } finally {
        setIsAnalyzing(false);
      }
    };

    if (journal.length > 0) runAnalysis();
  }, [journal, aiCoach, sentimentAnalyzer, disciplineMonitor]);

  return {
    journal,
    disciplineMetrics,
    isAnalyzing,
    patterns,
    suggestions,
    fearGreedIndex,
    correlations,
    violations,
    learningPatterns,
  };
}
