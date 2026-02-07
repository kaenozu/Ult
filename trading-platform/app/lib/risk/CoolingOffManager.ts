/**
 * Cooling-off Manager
 * 
 * TRADING-025: クーリングオフタイマーの実装
 * 連続損失や過度取引時に強制的な休憩を設定し、感情的な取引を防止
 */

import { CoolingReason, CooldownRecord } from '@/app/types/risk';

export interface TimeDuration {
  minutes: number;
  hours: number;
  days: number;
}

export interface CoolingOffConfig {
  consecutiveLossThreshold: number; // 連続損失回数の閾値 (default: 3)
  dailyLossLimitPercent: number; // 日次損失限度 (default: 5%)
  weeklyLossLimitPercent: number; // 週次損失限度 (default: 10%)
  maxTradesPerDay: number; // 1日最大取引回数 (default: 5)
  minCooldownMinutes: number; // 最小クーリング時間 (default: 30)
  maxCooldownMinutes: number; // 最大クーリング時間 (default: 1440 = 24 hours)
}

export class CoolingOffManager {
  private cooldownRecords: CooldownRecord[] = [];
  private currentCooldown: CooldownRecord | null = null;
  private config: CoolingOffConfig;

  constructor(config?: Partial<CoolingOffConfig>) {
    this.config = {
      consecutiveLossThreshold: config?.consecutiveLossThreshold ?? 3,
      dailyLossLimitPercent: config?.dailyLossLimitPercent ?? 5,
      weeklyLossLimitPercent: config?.weeklyLossLimitPercent ?? 10,
      maxTradesPerDay: config?.maxTradesPerDay ?? 5,
      minCooldownMinutes: config?.minCooldownMinutes ?? 30,
      maxCooldownMinutes: config?.maxCooldownMinutes ?? 1440,
    };
  }

  /**
   * クーリングオフ期間を強制的に開始
   */
  enforceCoolingOff(reason: CoolingReason): CooldownRecord {
    // 既にクーリング中の場合は延長
    if (this.currentCooldown && !this.isCooldownExpired(this.currentCooldown)) {
      return this.extendCurrentCooldown(reason);
    }

    const duration = this.calculateCooldownPeriod(reason.severity);
    const endTime = new Date(Date.now() + duration.minutes * 60 * 1000);

    const cooldownRecord: CooldownRecord = {
      id: this.generateCooldownId(),
      startTime: new Date(),
      endTime,
      reason,
      duration: duration.minutes,
      wasRespected: true,
      violationCount: 0,
    };

    this.currentCooldown = cooldownRecord;
    this.cooldownRecords.push(cooldownRecord);

    return cooldownRecord;
  }

  /**
   * クーリング期間を計算
   */
  calculateCooldownPeriod(severity: number): TimeDuration {
    // severity: 1-10のスケール
    const baseMinutes = this.config.minCooldownMinutes;
    const maxMinutes = this.config.maxCooldownMinutes;

    // 重症度に応じて線形にクーリング時間を増加
    const minutes = Math.min(
      maxMinutes,
      baseMinutes + ((maxMinutes - baseMinutes) * (severity - 1)) / 9
    );

    return {
      minutes: Math.round(minutes),
      hours: Math.round(minutes / 60 * 10) / 10,
      days: Math.round(minutes / 1440 * 100) / 100,
    };
  }

  /**
   * 現在クーリングオフ中かチェック
   */
  isCurrentlyCoolingOff(): boolean {
    if (!this.currentCooldown) return false;
    return !this.isCooldownExpired(this.currentCooldown);
  }

  /**
   * 取引を許可するかチェック
   */
  canTrade(): {
    allowed: boolean;
    reason?: string;
    remainingTime?: TimeDuration;
  } {
    if (!this.isCurrentlyCoolingOff()) {
      return { allowed: true };
    }

    const remaining = this.getRemainingCooldownTime();
    return {
      allowed: false,
      reason: this.getCooldownReasonMessage(),
      remainingTime: remaining || undefined,
    };
  }

  /**
   * クーリングオフ違反を記録
   */
  recordViolation(): void {
    if (this.currentCooldown) {
      this.currentCooldown.violationCount++;
      this.currentCooldown.wasRespected = false;
    }
  }

  /**
   * 手動でクーリングオフを終了
   */
  manualEndCooldown(): boolean {
    if (!this.currentCooldown) return false;

    // 最小時間が経過していない場合は終了できない
    const elapsed = Date.now() - this.currentCooldown.startTime.getTime();
    const minTime = this.config.minCooldownMinutes * 60 * 1000;

    if (elapsed < minTime) {
      return false;
    }

    this.currentCooldown = null;
    return true;
  }

  /**
   * クーリング履歴を取得
   */
  getCooldownHistory(limit?: number): CooldownRecord[] {
    const sorted = [...this.cooldownRecords].sort(
      (a, b) => b.startTime.getTime() - a.startTime.getTime()
    );
    return limit ? sorted.slice(0, limit) : sorted;
  }

  /**
   * クーリング統計を取得
   */
  getCooldownStats(): {
    totalCooldowns: number;
    totalViolations: number;
    averageDuration: number;
    complianceRate: number;
    lastCooldown?: CooldownRecord;
  } {
    const total = this.cooldownRecords.length;
    const violations = this.cooldownRecords.reduce(
      (sum, record) => sum + record.violationCount,
      0
    );
    const avgDuration =
      total > 0
        ? this.cooldownRecords.reduce((sum, r) => sum + r.duration, 0) / total
        : 0;
    const respectedCount = this.cooldownRecords.filter(r => r.wasRespected).length;
    const complianceRate = total > 0 ? (respectedCount / total) * 100 : 100;

    return {
      totalCooldowns: total,
      totalViolations: violations,
      averageDuration: Math.round(avgDuration),
      complianceRate: Math.round(complianceRate * 10) / 10,
      lastCooldown: this.cooldownRecords[this.cooldownRecords.length - 1],
    };
  }

  /**
   * 現在のクーリング情報を取得
   */
  getCurrentCooldown(): CooldownRecord | null {
    if (!this.isCurrentlyCoolingOff()) return null;
    return this.currentCooldown;
  }

  /**
   * 残りクーリング時間を取得
   */
  getRemainingCooldownTime(): TimeDuration | null {
    if (!this.currentCooldown || this.isCooldownExpired(this.currentCooldown)) {
      return null;
    }

    const remaining = this.currentCooldown.endTime.getTime() - Date.now();
    const minutes = Math.max(0, Math.ceil(remaining / (60 * 1000)));

    return {
      minutes,
      hours: Math.round(minutes / 60 * 10) / 10,
      days: Math.round(minutes / 1440 * 100) / 100,
    };
  }

  /**
   * クーリング設定を更新
   */
  updateConfig(config: Partial<CoolingOffConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * クーリング設定を取得
   */
  getConfig(): CoolingOffConfig {
    return { ...this.config };
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * クーリングが期限切れかチェック
   */
  private isCooldownExpired(cooldown: CooldownRecord): boolean {
    return Date.now() >= cooldown.endTime.getTime();
  }

  /**
   * 現在のクーリングを延長
   */
  private extendCurrentCooldown(reason: CoolingReason): CooldownRecord {
    if (!this.currentCooldown) {
      return this.enforceCoolingOff(reason);
    }

    const additionalDuration = this.calculateCooldownPeriod(reason.severity);
    const currentRemaining = this.currentCooldown.endTime.getTime() - Date.now();
    const newEndTime = new Date(
      Date.now() + currentRemaining + additionalDuration.minutes * 60 * 1000
    );

    this.currentCooldown.endTime = newEndTime;
    this.currentCooldown.duration += additionalDuration.minutes;

    // 新しい理由がより深刻な場合は更新
    if (reason.severity > this.currentCooldown.reason.severity) {
      this.currentCooldown.reason = reason;
    }

    return this.currentCooldown;
  }

  /**
   * クーリング理由のメッセージを取得
   */
  private getCooldownReasonMessage(): string {
    if (!this.currentCooldown) return '';

    const { type, triggerValue } = this.currentCooldown.reason;

    switch (type) {
      case 'consecutive_losses':
        return `連続損失${triggerValue}回により、クーリングオフ期間中です。`;
      case 'daily_loss_limit':
        return `本日の損失限度額${triggerValue}%に達したため、クーリングオフ期間中です。`;
      case 'weekly_loss_limit':
        return `週間損失限度額${triggerValue}%に達したため、クーリングオフ期間中です。`;
      case 'overtrading':
        return `過度な取引（${triggerValue}回/日）により、クーリングオフ期間中です。`;
      case 'manual':
        return '手動でクーリングオフ期間を設定しています。';
      default:
        return 'クーリングオフ期間中です。';
    }
  }

  /**
   * クーリングIDを生成
   */
  private generateCooldownId(): string {
    return `cooldown-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Factory function
 */
export const createCoolingOffManager = (
  config?: Partial<CoolingOffConfig>
): CoolingOffManager => {
  return new CoolingOffManager(config);
};
