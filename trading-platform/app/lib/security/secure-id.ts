/**
 * Secure ID Generation Utility
 *
 * Provides cryptographically secure unique identifiers.
 * Replaces insecure Math.random() usage for sensitive components.
 */

export function generateSecureId(): string {
  // Primary: Native crypto.randomUUID()
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Secondary: Fallback to crypto.getRandomValues() for older environments (Node/Jest)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const arr = new Uint32Array(4);
    crypto.getRandomValues(arr);
    return `${Date.now()}_${arr[0].toString(36)}${arr[1].toString(36)}`;
  }

  // Last resort (should practically never hit in modern environments)
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
