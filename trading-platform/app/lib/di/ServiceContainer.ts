/**
 * サービスコンテナ - DI (Dependency Injection) のための簡易レジストリ
 */
export class ServiceContainer {
  private static services = new Map<string, any>();

  /**
   * サービスを登録する
   */
  static register<T>(key: string, service: T): void {
    this.services.set(key, service);
  }

  /**
   * サービスを取得する
   */
  static resolve<T>(key: string): T {
    const service = this.services.get(key);
    if (!service) {
      throw new Error(`Service not found: ${key}. Make sure it is registered in the container.`);
    }
    return service as T;
  }

  /**
   * 登録されたサービスをリセットする（テスト用）
   */
  static reset(): void {
    this.services.clear();
  }
}

// サービス識別子の定数
export const TOKENS = {
  MarketDataService: 'MarketDataService',
  TechnicalIndicatorService: 'TechnicalIndicatorService',
  AnalysisService: 'AnalysisService',
} as const;
