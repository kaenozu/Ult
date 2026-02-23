export class CooldownManager {
  private alertHistory: Map<string, number> = new Map();
  
  constructor(private cooldownMinutes: number) {}

  isInCooldown(key: string): boolean {
    const lastAlert = this.alertHistory.get(key);
    if (!lastAlert) return false;
    const cooldownMs = this.cooldownMinutes * 60 * 1000;
    return Date.now() - lastAlert < cooldownMs;
  }

  recordAlert(key: string): void {
    this.alertHistory.set(key, Date.now());
  }

  clear(): void {
    this.alertHistory.clear();
  }

  updateCooldown(minutes: number): void {
    this.cooldownMinutes = minutes;
  }
}
