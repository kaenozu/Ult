/**
 * Mock API Client
 * 
 * テスト用のAPIクライアントモック
 */

import { IApiClient } from '../interfaces';

export class MockApiClient implements IApiClient {
  private mockResponses = new Map<string, unknown>();
  private callHistory: { method: string; url: string; body?: unknown }[] = [];

  setMockResponse(url: string, response: unknown): void {
    this.mockResponses.set(url, response);
  }

  async fetch<T>(url: string, options?: RequestInit): Promise<T> {
    this.callHistory.push({ method: 'fetch', url, body: options?.body });
    const response = this.mockResponses.get(url);
    if (response === undefined) {
      throw new Error(`No mock response set for ${url}`);
    }
    return Promise.resolve(response as T);
  }

  async post<T>(url: string, body: unknown): Promise<T> {
    this.callHistory.push({ method: 'post', url, body });
    const response = this.mockResponses.get(url);
    if (response === undefined) {
      throw new Error(`No mock response set for ${url}`);
    }
    return Promise.resolve(response as T);
  }

  async get<T>(url: string): Promise<T> {
    this.callHistory.push({ method: 'get', url });
    const response = this.mockResponses.get(url);
    if (response === undefined) {
      throw new Error(`No mock response set for ${url}`);
    }
    return Promise.resolve(response as T);
  }

  getCallHistory(): { method: string; url: string; body?: unknown }[] {
    return [...this.callHistory];
  }

  reset(): void {
    this.mockResponses.clear();
    this.callHistory = [];
  }

  wasCalled(url: string): boolean {
    return this.callHistory.some(call => call.url === url);
  }
}
