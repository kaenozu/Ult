import { LearningModule, UserProgress, LearningPath } from './types';
import { sampleModules } from './content';

export class UserEducationModuleService {
  private modules: Map<string, LearningModule> = new Map();
  private userProgress: Map<string, UserProgress[]> = new Map();
  private learningPaths: Map<string, LearningPath> = new Map();

  addLearningModule(module: LearningModule): void {
    this.modules.set(module.id, module);
  }

  updateLearningModule(moduleId: string, updates: Partial<LearningModule>): void {
    const existingModule = this.modules.get(moduleId);
    if (existingModule) {
      this.modules.set(moduleId, { ...existingModule, ...updates, updatedAt: new Date() });
    }
  }

  removeLearningModule(moduleId: string): void {
    this.modules.delete(moduleId);
  }

  getLearningModule(moduleId: string): LearningModule | undefined {
    return this.modules.get(moduleId);
  }

  getAllLearningModules(): LearningModule[] {
    return Array.from(this.modules.values());
  }

  getModulesByCategory(category: string): LearningModule[] {
    return Array.from(this.modules.values()).filter(module => module.category === category);
  }

  getModulesByDifficulty(difficulty: string): LearningModule[] {
    return Array.from(this.modules.values()).filter(module => module.difficulty === difficulty);
  }

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

    const correctAnswers = moduleProgress.quizResults.filter(result => result.isCorrect).length;
    const totalQuestions = moduleProgress.quizResults.length;
    if (totalQuestions > 0) {
      moduleProgress.score = (correctAnswers / totalQuestions) * 100;
    }
  }

  getUserProgress(userId: string, moduleId?: string): UserProgress[] {
    const userProgress = this.userProgress.get(userId) || [];
    if (moduleId) {
      return userProgress.filter(progress => progress.moduleId === moduleId);
    }
    return userProgress;
  }

  addLearningPath(path: LearningPath): void {
    this.learningPaths.set(path.id, path);
  }

  getLearningPath(pathId: string): LearningPath | undefined {
    return this.learningPaths.get(pathId);
  }

  getAllLearningPaths(): LearningPath[] {
    return Array.from(this.learningPaths.values());
  }

  recommendLearningPath(userId: string, userSkillLevel: 'beginner' | 'intermediate' | 'advanced'): LearningPath | null {
    const userProgress = this.getUserProgress(userId);
    const completedModules = userProgress.filter(p => p.completed).map(p => p.moduleId);

    for (const [, path] of this.learningPaths) {
      if (path.difficulty === userSkillLevel) {
        const incompleteModules = path.modules.filter(mid => !completedModules.includes(mid));
        if (incompleteModules.length > 0) {
          return path;
        }
      }
    }

    for (const [, path] of this.learningPaths) {
      if (path.difficulty === 'beginner') {
        return path;
      }
    }

    return null;
  }

  searchLearningContent(query: string): LearningModule[] {
    const searchTerm = query.toLowerCase();
    return Array.from(this.modules.values()).filter(module => 
      module.title.toLowerCase().includes(searchTerm) ||
      module.description.toLowerCase().includes(searchTerm) ||
      module.content.toLowerCase().includes(searchTerm) ||
      module.objectives.some(obj => obj.toLowerCase().includes(searchTerm))
    );
  }

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

    const totalLearningTime = completedModules.reduce((sum, progress) => {
      const learningModule = this.getLearningModule(progress.moduleId);
      return sum + (learningModule?.duration || 0);
    }, 0);

    const scores = userProgress.filter(p => p.score !== undefined).map(p => p.score!) || [0];
    const averageQuizScore = scores.length > 0 
      ? scores.reduce((sum, score) => sum + score, 0) / scores.length 
      : 0;

    const currentStreak = 1;

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

  loadSampleModules(): void {
    for (const module of sampleModules) {
      this.addLearningModule(module);
    }
  }
}

export const userEducationModuleService = new UserEducationModuleService();
