# Sentinel's Journal

## 2024-05-22 - API Key Exposure Prevention
**Vulnerability:** Found `NEXT_PUBLIC_ALPHA_VANTAGE_API_KEY` usage in `AlphaVantageClient`. This prefix exposes the API key to the client-side bundle, making it accessible to anyone who inspects the network traffic or source code.
**Learning:** Even unused code ("dead code") can be a security risk if it contains patterns that developers might copy or mistakenly use.
**Prevention:** Always use server-side environment variables (no `NEXT_PUBLIC_` prefix) for secrets. Add runtime environment checks (`typeof window === 'undefined'`) for sensitive utility classes.

## 2026-01-29 - WebSocket Cross-Site Hijacking Prevention
**Vulnerability:** The WebSocket server (`scripts/websocket-server.js`) accepted connections from any Origin, allowing Cross-Site WebSocket Hijacking (CSWSH). A malicious site could connect to the local WebSocket server and send/receive messages on behalf of the user.
**Learning:** Standalone scripts often bypass standard framework security protections (like Next.js headers). Explicit Origin validation is mandatory for WebSockets.
**Prevention:** Always validate the `Origin` header during the WebSocket handshake (`upgrade` event). Use an allowlist of trusted origins (e.g., `http://localhost:3000`).
