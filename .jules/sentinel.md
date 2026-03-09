## 2026-02-19 - IP Spoofing via Cloudflare Headers
**Vulnerability:** The application blindly trusted the `CF-Connecting-IP` header regardless of the `TRUST_PROXY` configuration. This allowed attackers to bypass rate limiting by spoofing their IP address if they could access the server directly (bypassing Cloudflare).
**Learning:** Developers often assume `CF-Connecting-IP` is safe because it's "immutable on Cloudflare", forgetting that it can be forged if the request doesn't come from Cloudflare.
**Prevention:** Always wrap proxy header checks (including vendor-specific ones like `CF-Connecting-IP`) inside a configuration check (like `TRUST_PROXY`) to ensure the application only trusts upstream information when explicitly configured to do so.

## 2026-02-19 - Incomplete XSS Sanitization Logic
**Vulnerability:** The `sanitizeText` function only escaped HTML characters if an XSS pattern was detected via regex blacklist. This meant standard HTML tags that didn't match the specific "dangerous" patterns (like `<b>` or `<img src=x>`) were passed through raw, even when `allowHtml` was explicitly false.
**Learning:** Security controls should be positive (allowlist) rather than negative (blacklist). Relying on "detecting badness" is fragile because regexes can be bypassed.
**Prevention:** When sanitizing text, default to escaping ALL HTML characters unless raw HTML is explicitly required and handled by a robust sanitizer (like DOMPurify), rather than conditionally escaping based on pattern matching.

## 2026-02-20 - Hardcoded Admin Backdoor in Auth Store
**Vulnerability:** The authentication system contained a hardcoded admin user (`admin@example.com`) initialized by default in the in-memory store, intended for testing but active in production.
**Learning:** Developers often add "temporary" or "convenience" users for local testing but forget to wrap them in environment checks, creating critical backdoors.
**Prevention:** Always wrap test data initialization in strict `process.env.NODE_ENV !== 'production'` checks, or better yet, use separate seed scripts/fixtures that are never imported in production code.
## 2026-03-01 - Standardizing Secure Identifier Generation
**Vulnerability:** Multiple files (`portfolioStore.ts`, `dashboardStore.ts`, `AlertNotificationSystem.ts`, `PerformanceReporter.ts`, `IndexedDBService.ts`) used the predictable `Math.random().toString(36)` anti-pattern for generating identifiers like event IDs, trade IDs, and order IDs.
**Learning:** The previous remediation in `AuditLogger.ts` was not uniformly applied because the central `generateSecureId()` utility was removed to reduce duplication, leaving other files with the insecure legacy pattern. Furthermore, Node/Jest environments can lack global `crypto.randomUUID()`, requiring `crypto.getRandomValues()` as a robust secondary fallback.
**Prevention:** When removing a shared utility, explicitly audit the codebase to ensure the refactored logic (e.g. secure ID generation using `crypto.randomUUID()` with fallback) is completely correctly duplicated wherever the logic is needed. ID generation should always utilize cryptographic APIs by default.
