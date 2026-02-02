# WebSocket Security Documentation

## Overview

The WebSocket server implements comprehensive security measures to protect against common attack vectors including unauthorized access, DoS attacks, injection attacks, and data leaks.

## Security Features

### 1. Authentication

**Token-Based Authentication**: All WebSocket connections require a valid authentication token.

- Token can be provided via:
  - Query parameter: `ws://server:port/ws?token=YOUR_TOKEN`
  - Authorization header: `Authorization: Bearer YOUR_TOKEN`

**Environment Variable**:
```bash
WS_AUTH_TOKEN=your_secure_random_token_here
```

**Production Requirement**: 
- The `WS_AUTH_TOKEN` environment variable **MUST** be set in production
- Server will fail to start if not provided in production mode
- Development mode auto-generates a token (insecure, for testing only)

**Token Security**:
- Tokens are compared using constant-time comparison to prevent timing attacks
- Minimum token length should be 32 characters
- Use cryptographically secure random tokens

**Generating Secure Tokens**:
```bash
# Using OpenSSL
openssl rand -hex 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using Python
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### 2. Origin Validation (CORS)

**Cross-Site WebSocket Hijacking (CSWSH) Protection**: 
- Only connections from allowed origins are accepted
- Missing Origin headers are blocked (common bot/script behavior)

**Environment Variable**:
```bash
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
```

**Configuration**:
- Comma-separated list of allowed origins
- Default: `http://localhost:3000`
- Must match exactly (protocol, domain, port)

### 3. Rate Limiting

**Per-Client Rate Limiting**:
- Limits number of messages per time window
- Prevents message flooding attacks
- Automatic cleanup of rate limit tracking

**Configuration**:
```bash
WS_RATE_LIMIT_MAX_MESSAGES=100  # Max messages per window
```

**Default Settings**:
- **Window**: 60 seconds
- **Max Messages**: 100 per window
- **Response**: Error message sent, connection remains open

**Exceeded Limit**:
```json
{
  "type": "error",
  "data": { "message": "Rate limit exceeded" },
  "timestamp": 1234567890
}
```

### 4. Connection Limits

**Per-IP Connection Limiting**:
- Prevents single IP from exhausting server resources
- Protects against DoS attacks
- Automatic cleanup when connections close

**Configuration**:
```bash
WS_MAX_CONNECTIONS_PER_IP=5
```

**Default**: 5 connections per IP address

**Exceeded Limit**:
- HTTP 429 (Too Many Requests) response
- Connection immediately closed

### 5. Message Size Limits

**Maximum Message Size**:
- Prevents memory exhaustion attacks
- Protects against bandwidth abuse

**Configuration**:
```bash
WS_MAX_MESSAGE_SIZE=1048576  # 1MB in bytes
```

**Default**: 1MB (1,048,576 bytes)

**Exceeded Limit**:
- Error message sent
- Connection closed with code 1009

### 6. Input Validation & Sanitization

**Message Validation**:
- All messages must be valid JSON
- Required fields: `type` (string)
- Optional fields: `data`, `timestamp`

**Data Sanitization**:
- Removes potentially dangerous characters: `<`, `>`, `'`, `"`
- Limits key lengths to prevent DoS (max 100 chars)
- Recursive sanitization of nested objects and arrays

**Invalid Messages**:
```json
{
  "type": "error",
  "data": { "message": "Invalid message format" },
  "timestamp": 1234567890
}
```

### 7. Connection Monitoring

**Heartbeat Mechanism**:
- Server pings clients every 30 seconds
- Inactive clients are terminated
- Prevents zombie connections

**Client Tracking**:
- Unique client ID per connection
- IP address tracking
- Connection time tracking
- Message count statistics
- Last message timestamp

**Automatic Cleanup**:
- Dead connections terminated
- IP connection counts updated
- Rate limit data cleaned up

### 8. Secure Logging

**Security Event Logging**:
- Connection attempts with IP addresses
- Authentication failures
- Rate limit violations
- Origin validation failures
- Connection rejections

**What's Logged**:
- ✅ Client IP addresses
- ✅ Authentication attempts
- ✅ Security violations
- ❌ Authentication tokens (never logged)
- ❌ Message content (only message types)

## Connection Flow

```
1. Client attempts to connect
   ↓
2. IP connection limit check
   ↓ (429 if exceeded)
3. Path validation (/ws only)
   ↓ (404 if wrong path)
4. Authentication token validation
   ↓ (401 if invalid/missing)
5. Origin header validation
   ↓ (403 if unauthorized)
6. Connection established
   ↓
7. Rate limiting applied per message
   ↓
8. Message size & validation checks
```

## Client Implementation Example

```typescript
// Secure WebSocket client connection
const token = 'your_secure_token_here';
const wsUrl = `ws://localhost:3001/ws?token=${token}`;

const ws = new WebSocket(wsUrl);

ws.onopen = () => {
  console.log('Connected');
  
  // Send authenticated message
  ws.send(JSON.stringify({
    type: 'subscribe',
    data: { channel: 'market_data' }
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = (event) => {
  console.log('Connection closed:', event.code, event.reason);
};
```

## Environment Variables Summary

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `WS_AUTH_TOKEN` | Production | auto-generated | Authentication token (32+ chars) |
| `WS_PORT` | No | 3001 | Server port |
| `WS_HOST` | No | 0.0.0.0 | Server host |
| `ALLOWED_ORIGINS` | No | http://localhost:3000 | Comma-separated origins |
| `WS_MAX_CONNECTIONS_PER_IP` | No | 5 | Max connections per IP |
| `WS_MAX_MESSAGE_SIZE` | No | 1048576 | Max message size in bytes |
| `WS_RATE_LIMIT_MAX_MESSAGES` | No | 100 | Max messages per minute |
| `NODE_ENV` | No | development | Environment mode |

## Security Best Practices

### For Production Deployment

1. **Always set `WS_AUTH_TOKEN`**:
   ```bash
   WS_AUTH_TOKEN=$(openssl rand -hex 32)
   ```

2. **Restrict allowed origins**:
   ```bash
   ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
   ```

3. **Use HTTPS/WSS**:
   - Deploy behind a reverse proxy (nginx, Apache)
   - Terminate TLS at the proxy
   - Use `wss://` protocol for clients

4. **Monitor and log**:
   - Set up logging aggregation
   - Monitor for unusual patterns
   - Alert on security events

5. **Regular security updates**:
   - Keep dependencies updated
   - Review security advisories
   - Run `npm audit` regularly

6. **Network security**:
   - Use firewall rules
   - Rate limit at network level
   - Consider DDoS protection services

### For Development

1. **Use auto-generated token** (default behavior)
2. **Allow localhost origin** (default)
3. **Monitor console for warnings**
4. **Test authentication failures**

## Security Audit Checklist

- [ ] `WS_AUTH_TOKEN` set in production
- [ ] `ALLOWED_ORIGINS` configured correctly
- [ ] TLS/SSL configured (wss://)
- [ ] Firewall rules in place
- [ ] Logging and monitoring configured
- [ ] Rate limits appropriate for use case
- [ ] Connection limits prevent abuse
- [ ] Message size limits prevent DoS
- [ ] Input validation and sanitization working
- [ ] Security testing completed

## Common Security Issues

### Issue: Unauthorized Access

**Symptom**: Connections without token succeed

**Solution**: 
- Verify `WS_AUTH_TOKEN` is set
- Check authentication logic in upgrade handler
- Ensure clients send token

### Issue: CORS Errors

**Symptom**: Browser blocks WebSocket connection

**Solution**:
- Add client origin to `ALLOWED_ORIGINS`
- Check for protocol/port mismatches
- Verify Origin header is sent

### Issue: Rate Limit False Positives

**Symptom**: Legitimate clients rate limited

**Solution**:
- Increase `WS_RATE_LIMIT_MAX_MESSAGES`
- Review client message frequency
- Implement backoff on client side

### Issue: Connection Limit Hit

**Symptom**: Can't connect from same IP

**Solution**:
- Increase `WS_MAX_CONNECTIONS_PER_IP`
- Implement connection pooling
- Close unused connections properly

## Threat Model

### Threats Mitigated

| Threat | Mitigation |
|--------|------------|
| Unauthorized Access | Token authentication |
| CSWSH | Origin validation |
| DoS (message flood) | Rate limiting |
| DoS (connection flood) | IP connection limits |
| DoS (large messages) | Message size limits |
| Injection attacks | Input sanitization |
| Timing attacks | Constant-time comparison |
| Resource exhaustion | Heartbeat + cleanup |

### Residual Risks

| Risk | Mitigation Strategy |
|------|---------------------|
| Token theft | Use short-lived tokens, rotate regularly |
| Distributed DoS | Use CDN/DDoS protection service |
| Protocol vulnerabilities | Keep ws library updated |
| Network-level attacks | Deploy behind WAF/firewall |

## Testing Security

```bash
# Test without token (should fail)
wscat -c ws://localhost:3001/ws
# Expected: 401 Unauthorized

# Test with invalid token (should fail)
wscat -c "ws://localhost:3001/ws?token=invalid"
# Expected: 401 Unauthorized

# Test with valid token (should succeed)
wscat -c "ws://localhost:3001/ws?token=YOUR_TOKEN"
# Expected: Connection successful

# Test rate limiting
# Send 100+ messages rapidly
# Expected: Rate limit error after threshold

# Test message size limit
# Send message > 1MB
# Expected: Connection closed with code 1009
```

## Support and Questions

For security issues or questions:
1. Review this documentation
2. Check server logs
3. Test with wscat or similar tool
4. Report security vulnerabilities privately (see SECURITY.md)

## References

- [OWASP WebSocket Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html)
- [RFC 6455 - The WebSocket Protocol](https://tools.ietf.org/html/rfc6455)
- [Node.js ws Library Security](https://github.com/websockets/ws#security-issues)
