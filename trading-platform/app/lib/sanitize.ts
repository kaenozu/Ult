import DOMPurify from 'dompurify';

/**
 * Sanitizes a string to prevent XSS attacks
 * Uses DOMPurify to clean potentially malicious content
 * 
 * @param value - The string value to sanitize
 * @returns The sanitized string safe for rendering
 */
import { logger } from '@/app/core/logger';
export function sanitizeString(value: string | undefined | null): string {
  if (!value) return '';
  
  // Check if we're in a browser environment with a real DOM
  if (typeof window !== 'undefined' && typeof window.document !== 'undefined') {
    try {
      // Client-side: use DOMPurify
      // ALLOWED_TAGS: [] strips all HTML tags but keeps text content
      return DOMPurify.sanitize(value, { 
        ALLOWED_TAGS: [], 
        KEEP_CONTENT: true 
      });
    } catch (error) {
      // Fallback to escaping if DOMPurify fails
      logger.error('DOMPurify failed, falling back to basic escaping:', error instanceof Error ? error : new Error(String(error)));
    }
  }
  
  // Server-side or fallback: basic HTML entity escaping
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitizes a number to ensure it's a valid number
 * Prevents injection through number fields
 * 
 * @param value - The number value to sanitize
 * @returns The sanitized number
 */
export function sanitizeNumber(value: number | undefined | null): number {
  if (value === undefined || value === null || isNaN(value)) {
    return 0;
  }
  return Number(value);
}
