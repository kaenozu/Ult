export interface LearningModule {
  id: string;
  title: string;
  description: string;
  category: 'technical_analysis' | 'fundamental_analysis' | 'risk_management' | 'trading_strategies' | 'market_psychology';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number;
  content: string;
  prerequisites?: string[];
  objectives: string[];
  quizzes?: Quiz[];
  resources?: Resource[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Quiz {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface Resource {
  title: string;
  url: string;
  type: 'article' | 'video' | 'pdf' | 'tool' | 'template';
}

export interface UserProgress {
  userId: string;
  moduleId: string;
  completed: boolean;
  score?: number;
  completedAt?: Date;
  createdAt?: Date;
  progress: number;
  quizResults?: QuizResult[];
}

export interface QuizResult {
  quizId: string;
  selectedAnswer: number;
  isCorrect: boolean;
  answeredAt: Date;
}

export interface LearningPath {
  id: string;
  title: string;
  description: string;
  modules: string[];
  estimatedDuration: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  targetAudience: string;
}
