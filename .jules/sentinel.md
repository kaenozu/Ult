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
