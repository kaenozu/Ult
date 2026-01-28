# Sentinel's Journal

## 2024-05-22 - API Key Exposure Prevention
**Vulnerability:** Found `NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY` usage in `AlphaVantageClient`. This prefix exposes the API key to the client-side bundle, making it accessible to anyone who inspects the network traffic or source code.
**Learning:** Even unused code ("dead code") can be a security risk if it contains patterns that developers might copy or mistakenly use.
**Prevention:** Always use server-side environment variables (no `NEXT_PUBLIC_` prefix) for secrets. Add runtime environment checks (`typeof window === 'undefined'`) for sensitive utility classes.
