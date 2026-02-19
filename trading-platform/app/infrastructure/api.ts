/**
 * Infrastructure - API
 * 
 * API通信関連のインフラストラクチャ
 */

export interface ApiClientConfig {
  baseURL: string;
  timeout: number;
  retries: number;
  headers?: Record<string, string>;
}

export class ApiClient {
  private config: ApiClientConfig;

  constructor(config: ApiClientConfig) {
    this.config = config;
  }

  async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.config.baseURL}${endpoint}`;
    let lastError: Error | null = null;

    // Implement retry logic with exponential backoff
    for (let attempt = 0; attempt <= this.config.retries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...this.config.headers,
            ...options?.headers,
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        return response.json();
      } catch (error) {
        clearTimeout(timeoutId);
        lastError = error as Error;

        // Don't retry on last attempt
        if (attempt < this.config.retries) {
          // Exponential backoff: 1s, 2s, 4s, etc.
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        throw lastError;
      }
    }

    // This should never be reached due to throw above, but TypeScript needs it
    throw lastError || new Error('Request failed after all retries');
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.fetch<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body: unknown): Promise<T> {
    return this.fetch<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async put<T>(endpoint: string, body: unknown): Promise<T> {
    return this.fetch<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.fetch<T>(endpoint, { method: 'DELETE' });
  }
}

export const createApiClient = (config: Partial<ApiClientConfig>): ApiClient => {
  return new ApiClient({
    baseURL: config.baseURL || '',
    timeout: config.timeout || 10000,
    retries: config.retries || 3,
    headers: config.headers,
  });
};
