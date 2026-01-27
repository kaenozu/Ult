/**
 * API Error Classes
 * Unified with app/types/index.ts to avoid instanceof issues in tests.
 */

export { APIError, NetworkError, RateLimitError, ValidationError } from '@/app/types';
