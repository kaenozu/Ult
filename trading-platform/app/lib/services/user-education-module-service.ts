/**
 * User Education Module Service
 * 
 * このモジュールは、ユーザー教育コンテンツを提供する機能を提供します。
 * 技術分析、ファンダメンタル分析、リスク管理、取引戦略などに関する学習コンテンツを含みます。
 */

export interface LearningModule {
  id: string;
  title: string;
  description: string;
  category: 'technical_analysis' | 'fundamental_analysis' | 'risk_management' | 'trading_strategies' | 'market_psychology';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number; // 所要時間（分）
  content: string; // 学習コンテンツ（Markdown形式）
  prerequisites?: string[]; // 前提知識
  objectives: string[]; // 学習目標
  quizzes?: Quiz[];
  resources?: Resource[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Quiz {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number; // 正解のインデックス
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
  score?: number; // クイズのスコア
  completedAt?: Date;
  progress: number; // 0-100%
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
  modules: string[]; // module IDs
  estimatedDuration: number; // 推定所要時間（分）
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  targetAudience: string;
}

class UserEducationModuleService {
  private modules: Map<string, LearningModule> = new Map();
  private userProgress: Map<string, UserProgress[]> = new Map(); // userId -> progress array
  private learningPaths: Map<string, LearningPath> = new Map();

  /**
   * 学習モジュールを追加
   */
  addLearningModule(module: LearningModule): void {
    this.modules.set(module.id, module);
  }

  /**
   * 学習モジュールを更新
   */
  updateLearningModule(moduleId: string, updates: Partial<LearningModule>): void {
    const existingModule = this.modules.get(moduleId);
    if (existingModule) {
      this.modules.set(moduleId, { ...existingModule, ...updates, updatedAt: new Date() });
    }
  }

  /**
   * 学習モジュールを削除
   */
  removeLearningModule(moduleId: string): void {
    this.modules.delete(moduleId);
  }

  /**
   * 学習モジュールを取得
   */
  getLearningModule(moduleId: string): LearningModule | undefined {
    return this.modules.get(moduleId);
  }

  /**
   * すべての学習モジュールを取得
   */
  getAllLearningModules(): LearningModule[] {
    return Array.from(this.modules.values());
  }

  /**
   * カテゴリ別の学習モジュールを取得
   */
  getModulesByCategory(category: string): LearningModule[] {
    return Array.from(this.modules.values()).filter(module => module.category === category);
  }

  /**
   * 難易度別の学習モジュールを取得
   */
  getModulesByDifficulty(difficulty: string): LearningModule[] {
    return Array.from(this.modules.values()).filter(module => module.difficulty === difficulty);
  }

  /**
   * ユ習進捗を記録
   */
  recordUserProgress(userId: string, moduleId: string, progress: number, completed: boolean): void {
    if (!this.userProgress.has(userId)) {
      this.userProgress.set(userId, []);
    }

    const userProgress = this.userProgress.get(userId)!;
    const existingProgress = userProgress.find(p => p.moduleId === moduleId);

    if (existingProgress) {
      existingProgress.progress = progress;
      existingProgress.completed = completed;
      if (completed) {
        existingProgress.completedAt = new Date();
      }
    } else {
      userProgress.push({
        userId,
        moduleId,
        completed,
        progress,
        createdAt: new Date()
      });
    }
  }

  /**
   * クイズ結果を記録
   */
  recordQuizResult(userId: string, moduleId: string, quizId: string, selectedAnswer: number, isCorrect: boolean): void {
    if (!this.userProgress.has(userId)) {
      this.userProgress.set(userId, []);
    }

    const userProgress = this.userProgress.get(userId)!;
    let moduleProgress = userProgress.find(p => p.moduleId === moduleId);

    if (!moduleProgress) {
      moduleProgress = {
        userId,
        moduleId,
        completed: false,
        progress: 0,
        quizResults: []
      };
      userProgress.push(moduleProgress);
    }

    if (!moduleProgress.quizResults) {
      moduleProgress.quizResults = [];
    }

    moduleProgress.quizResults.push({
      quizId,
      selectedAnswer,
      isCorrect,
      answeredAt: new Date()
    });

    // スコアを計算
    const correctAnswers = moduleProgress.quizResults.filter(result => result.isCorrect).length;
    const totalQuestions = moduleProgress.quizResults.length;
    if (totalQuestions > 0) {
      moduleProgress.score = (correctAnswers / totalQuestions) * 100;
    }
  }

  /**
   * ユ習進捗を取得
   */
  getUserProgress(userId: string, moduleId?: string): UserProgress[] {
    const userProgress = this.userProgress.get(userId) || [];
    if (moduleId) {
      return userProgress.filter(progress => progress.moduleId === moduleId);
    }
    return userProgress;
  }

  /**
   * ユ習パスを追加
   */
  addLearningPath(path: LearningPath): void {
    this.learningPaths.set(path.id, path);
  }

  /**
   * 学習パスを取得
   */
  getLearningPath(pathId: string): LearningPath | undefined {
    return this.learningPaths.get(pathId);
  }

  /**
   * すべての学習パスを取得
   */
  getAllLearningPaths(): LearningPath[] {
    return Array.from(this.learningPaths.values());
  }

  /**
   * ユ習パスをユーザーに推奨
   */
  recommendLearningPath(userId: string, userSkillLevel: 'beginner' | 'intermediate' | 'advanced'): LearningPath | null {
    // ユ習履歴を確認
    const userProgress = this.getUserProgress(userId);
    const completedModules = userProgress.filter(p => p.completed).map(p => p.moduleId);

    // ユ習パスから候補を検索
    for (const [, path] of this.learningPaths) {
      if (path.difficulty === userSkillLevel) {
        // すべてのモジュールが未完了または一部完了しているパスを優先
        const incompleteModules = path.modules.filter(mid => !completedModules.includes(mid));
        if (incompleteModules.length > 0) {
          return path;
        }
      }
    }

    // 該当するパスがない場合は最初の初心者パスを返す
    for (const [, path] of this.learningPaths) {
      if (path.difficulty === 'beginner') {
        return path;
      }
    }

    return null;
  }

  /**
   * ユ習コンテンツを検索
   */
  searchLearningContent(query: string): LearningModule[] {
    const searchTerm = query.toLowerCase();
    return Array.from(this.modules.values()).filter(module => 
      module.title.toLowerCase().includes(searchTerm) ||
      module.description.toLowerCase().includes(searchTerm) ||
      module.content.toLowerCase().includes(searchTerm) ||
      module.objectives.some(obj => obj.toLowerCase().includes(searchTerm))
    );
  }

  /**
   * ユ習統計を取得
   */
  getUserLearningStatistics(userId: string): {
    totalModulesCompleted: number;
    totalLearningTime: number;
    averageQuizScore: number;
    currentStreak: number;
    topCategories: string[];
  } {
    const userProgress = this.getUserProgress(userId);
    const completedModules = userProgress.filter(p => p.completed);
    const totalModulesCompleted = completedModules.length;

    // 学習時間の計算（簡易版）
    const totalLearningTime = completedModules.reduce((sum, progress) => {
      const learningModule = this.getLearningModule(progress.moduleId);
      return sum + (learningModule?.duration || 0);
    }, 0);

    // 平均クイズスコア
    const scores = userProgress.filter(p => p.score !== undefined).map(p => p.score!) || [0];
    const averageQuizScore = scores.length > 0 
      ? scores.reduce((sum, score) => sum + score, 0) / scores.length 
      : 0;

    // 現在の連続学習日数（簡易版）
    const currentStreak = 1; // 実際には日付データが必要

    // 最も学習したカテゴリ
    const categoryCount: Record<string, number> = {};
    for (const progress of completedModules) {
      const learningModule = this.getLearningModule(progress.moduleId);
      if (learningModule) {
        categoryCount[learningModule.category] = (categoryCount[learningModule.category] || 0) + 1;
      }
    }
    const topCategories = Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]);

    return {
      totalModulesCompleted,
      totalLearningTime,
      averageQuizScore,
      currentStreak,
      topCategories
    };
  }

  /**
   * 学習モジュールのサンプルデータを生成
   */
  generateSampleModules(): void {
    // 技術分析入門モジュール
    this.addLearningModule({
      id: 'ta_intro',
      title: '技術分析入門',
      description: 'チャート分析の基礎を学びましょう',
      category: 'technical_analysis',
      difficulty: 'beginner',
      duration: 30,
      content: `
# 技術分析入門

## 1. ローソク足チャートとは

ローソク足チャートは、価格の変動を視覚的に表現するためのチャートです。以下の4つの価格情報を含みます：

- 始値（Open）
- 高値（High）
- 安値（Low）
- 終値（Close）

## 2. 基本的なローソク足パターン

### 陽線と陰線
- 陽線：終値 > 始値（価格が上がった）
- 陰線：終値 < 始値（価格が下がった）

### 代表的なローソク足パターン
- 丸坊主（始値=終値）
- トンカチ
- 逆トンカチ
- 十線

## 3. 代表的なテクニカル指標

### 移動平均線（MA）
- 単純移動平均（SMA）
- 指数平滑移動平均（EMA）

### RSI（Relative Strength Index）
- 70以上：買われすぎ
- 30以下：売られすぎ

## 4. サポートラインとレジスタンスライン

- サポート：価格が下落する際に支えるライン
- レジスタンス：価格が上昇する際に阻むライン
      `,
      prerequisites: [],
      objectives: [
        'ローソク足の読み方がわかる',
        '基本的なチャートパターンを認識できる',
        '移動平均線の使い方がわかる',
        'RSIの基本的な解釈ができる'
      ],
      quizzes: [
        {
          id: 'quiz_ta_1',
          question: 'RSIが70以上の場合、一般的に何を意味しますか？',
          options: [
            '売られすぎ',
            '買われすぎ',
            'トレンド転換',
            '横這い相場'
          ],
          correctAnswer: 1,
          explanation: 'RSIが70以上は買われすぎ状態を示し、反落の可能性があります。'
        }
      ],
      resources: [
        { title: 'ローソク足の基本', url: 'https://example.com/candlestick-basics', type: 'article' },
        { title: '移動平均線の使い方', url: 'https://example.com/moving-averages', type: 'video' }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // リスク管理モジュール
    this.addLearningModule({
      id: 'rm_basics',
      title: 'リスク管理の基礎',
      description: '取引におけるリスク管理の重要性と基本手法',
      category: 'risk_management',
      difficulty: 'beginner',
      duration: 45,
      content: `
# リスク管理の基礎

## 1. リスク管理とは

リスク管理とは、投資や取引において損失を最小限に抑えるための戦略や手法です。

## 2. 基本的なリスク管理手法

### 1. ポ的損失額の設定
- 1取引当たりの損失を資産の2%未満に抑える

### 2. ストップロスの設定
- あらかじめ損切り価格を決めておく

### 3. ポ的ポジションサイズ
- 資産に応じてポジションサイズを調整

### 4. 分散投資
- 一つの銘柄に集中投資しない

## 3. リスコ指標

### シャープレシオ
- リスコ調整済みリターンを示す指標
- (リターン - 無リスクレート) / 標準偏差

### 最大ドローダウン
- ピークから最も下げた値段までの下落幅

## 4. リスコ管理の実践

### ポ的設定
- 損失許容度を明確にする
- 月間・年間の損失上限を設定

### リスコ管理ルールの文書化
- 自分の取引ルールを明文化する
- 守るべきルールを明確にする
      `,
      prerequisites: [],
      objectives: [
        'リスク管理の重要性を理解する',
        '基本的なリスク管理手法を説明できる',
        'シャープレシオの計算方法を理解する',
        '自分のリスク許容度を設定できる'
      ],
      quizzes: [
        {
          id: 'quiz_rm_1',
          question: '1取引当たりの損失を資産の何%未満に抑えるのが一般的ですか？',
          options: [
            '1%',
            '2%',
            '5%',
            '10%'
          ],
          correctAnswer: 1,
          explanation: '一般的には、1取引当たりの損失を資産の2%未満に抑えることが推奨されます。'
        }
      ],
      resources: [
        { title: 'リスク管理の基本原則', url: 'https://example.com/risk-management-principles', type: 'article' },
        { title: '最大ドローダウンの計算方法', url: 'https://example.com/max-drawdown', type: 'pdf' }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }
}

export const userEducationModuleService = new UserEducationModuleService();