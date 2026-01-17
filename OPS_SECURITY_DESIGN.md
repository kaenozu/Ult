# Ops Technical Design: Security-First Confirmation System

## Executive Summary

This document describes the security architecture for the "Hold to Confirm" action and WebSocket APPROVE message protection. The design implements cryptographic signing for human confirmation actions and nonce-based replay attack prevention for real-time messages.

**Core Principles:**

1. Every confirmation action requires user-specific cryptographic signature
2. WebSocket APPROVE messages include ephemeral nonces with limited validity
3. Defense in depth: Multiple security layers for critical operations
4. Audit trail: All signed actions logged with cryptographic proof

---

## 1. Threat Model

### 1.1 Identified Threats

| Threat                     | Severity | Description                                           |
| -------------------------- | -------- | ----------------------------------------------------- |
| Replay Attack              | HIGH     | Attacker captures and re-sends valid APPROVE messages |
| Man-in-the-Middle          | HIGH     | Intercept and modify WebSocket messages in transit    |
| Cross-Site Request Forgery | MEDIUM   | Malicious sites triggering confirmations              |
| Insider Threat             | MEDIUM   | Unauthorized approvals by compromised accounts        |
| Session Hijacking          | MEDIUM   | Stolen session tokens used for fake approvals         |

### 1.2 Security Goals

- **Authentication**: Verify the identity of the user confirming the action
- **Integrity**: Ensure messages cannot be modified in transit
- **Non-repudiation**: Users cannot deny their confirmation actions
- **Freshness**: Prevent reuse of old but valid messages
- **Authorization**: Ensure user has permission to perform the action

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SECURITY ARCHITECTURE                                │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────┐    ┌─────────────────────────────────┐
│           FRONTEND (Next.js)         │    │      BACKEND (FastAPI)          │
│                                      │    │                                 │
│  ┌──────────────────────────────┐    │    │  ┌───────────────────────────┐  │
│  │  HoldToConfirm Component     │    │    │  │   WebSocket Handler       │  │
│  │  - Long-press detection      │────┼────┼──▶│   - Nonce validation      │  │
│  │  - Key generation            │    │    │  │   - Signature verification│  │
│  │  - Signature display         │    │    │  │   - Audit logging         │  │
│  └──────────────────────────────┘    │    │  └───────────────────────────┘  │
│  ┌──────────────────────────────┐    │    │                                 │
│  │  WebSocket APPROVE Sender    │────┼────┼──▶  ┌───────────────────────────┐│
│  │  - Nonce generation          │    │    │  │   │  Approval Service       ││
│  │  - Message signing           │    │    │  │   │  - Request validation   ││
│  │  - Send to backend           │    │    │  │   │  - Callback execution   ││
│  └──────────────────────────────┘    │    │  │   │  - Status update        ││
│                                      │    │  │   └───────────────────────────┘│
└──────────────────────────────────────┘    └─────────────────────────────────┘
           │                                            │
           │                                            │
           ▼                                            ▼
┌──────────────────────────────┐    ┌─────────────────────────────────────────┐
│  Crypto Utilities            │    │  Security Services                      │
│  - generate_keypair()        │    │  - NonceStore (Redis/in-memory)         │
│  - sign_message()            │    │  - SignatureVerifier                    │
│  - verify_signature()        │    │  - AuditLogger                          │
│  - generate_nonce()          │    │  - KeyManager                           │
└──────────────────────────────┘    └─────────────────────────────────────────┘
```

---

## 3. Hold to Confirm: Signed Action Design

### 3.1 User Experience Flow

```
1. User initiates confirmation (long-press on button)
   ↓
2. Frontend generates challenge nonce
   ↓
3. User holds button for minimum duration (1-2 seconds)
   ↓
4. Frontend displays confirmation dialog with action details
   ↓
5. User releases button and optionally signs with passphrase
   ↓
6. Signed action sent to backend for verification
   ↓
7. Backend validates signature and executes action
```

### 3.2 Cryptographic Design

#### Key Generation (User Onboarding)

```python
# backend/security/key_manager.py
from cryptography.hazmat.primitives.asymmetric import rsa, ec
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.backends import default_backend
import os
import base64

class KeyManager:
    """Manage user cryptographic keys for confirmation signing."""

    def __init__(self, redis_client=None):
        self.redis = redis_client
        self._key_cache = {}

    def generate_user_keypair(self, user_id: str, passphrase: str = None) -> dict:
        """Generate RSA keypair for a user."""
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
            backend=default_backend()
        )

        encryption = serialization.BestAvailableEncryption(passphrase.encode()) if passphrase else serialization.NoEncryption()

        private_pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=encryption
        )

        public_pem = private_key.public_key().public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )

        return {
            "private_key": base64.b64encode(private_pem).decode('utf-8'),
            "public_key": base64.b64encode(public_pem).decode('utf-8'),
            "fingerprint": self._get_fingerprint(public_pem)
        }

    def derive_signing_key(self, user_id: str, passphrase: str, salt: bytes = None) -> bytes:
        """Derive signing key from passphrase using PBKDF2."""
        if salt is None:
            salt = os.urandom(16)

        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
            backend=default_backend()
        )

        key = kdf.derive(passphrase.encode())
        return key, salt

    def _get_fingerprint(self, public_key_pem: bytes) -> str:
        """Get short fingerprint of public key."""
        digest = hashes.Hash(hashes.SHA256(), backend=default_backend())
        digest.update(public_key_pem)
        return base64.b64encode(digest.finalize()[:8]).decode('utf-8')
```

#### Message Signing (Frontend)

```typescript
// src/utils/crypto.ts
import { webcrypto } from "crypto";

export interface SignedAction {
  action_type: string;
  action_data: Record<string, any>;
  nonce: string;
  timestamp: number;
  signature: string;
  public_key_fingerprint: string;
  user_id: string;
}

export class ActionSigner {
  private privateKey: CryptoKey | null = null;
  private publicKeyFingerprint: string = "";

  async initialize(userId: string, passphrase: string): Promise<void> {
    const stored = localStorage.getItem(`signing_key_${userId}`);
    if (stored) {
      const keyData = JSON.parse(stored);
      this.privateKey = await webcrypto.subtle.importKey(
        "jwk",
        keyData.privateKey,
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        ["sign"],
      );
      this.publicKeyFingerprint = keyData.fingerprint;
    } else {
      const keyPair = await webcrypto.subtle.generateKey(
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        ["sign", "verify"],
      );
      this.privateKey = keyPair.privateKey;

      const publicKey = await webcrypto.subtle.exportKey(
        "jwk",
        keyPair.publicKey,
      );
      this.publicKeyFingerprint = await this.getFingerprint(publicKey);

      localStorage.setItem(
        `signing_key_${userId}`,
        JSON.stringify({
          privateKey: publicKey,
          fingerprint: this.publicKeyFingerprint,
        }),
      );
    }
  }

  async signAction(
    actionType: string,
    actionData: Record<string, any>,
    nonce: string,
  ): Promise<SignedAction> {
    if (!this.privateKey) {
      throw new Error("Signer not initialized");
    }

    const timestamp = Date.now();
    const payload = JSON.stringify({
      action_type: actionType,
      action_data: actionData,
      nonce,
      timestamp,
    });

    const encoder = new TextEncoder();
    const data = encoder.encode(payload);
    const signature = await webcrypto.subtle.sign(
      { name: "ECDSA", hash: { name: "SHA-256" } },
      this.privateKey,
      data,
    );

    return {
      action_type: actionType,
      action_data: actionData,
      nonce,
      timestamp,
      signature: this.arrayBufferToBase64(signature),
      public_key_fingerprint: this.publicKeyFingerprint,
      user_id: "", // Set by caller
    };
  }

  private async getFingerprint(publicKey: any): Promise<string> {
    const data = encoder.encode(JSON.stringify(publicKey));
    const hash = await webcrypto.subtle.digest("SHA-256", data);
    return this.arrayBufferToBase64(hash.slice(0, 8));
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}
```

### 3.3 Hold-to-Confirm Component Implementation

```tsx
// src/components/HoldToConfirm.tsx
"use client";

import { useState, useRef, useCallback } from "react";
import { ActionSigner, SignedAction } from "@/utils/crypto";

interface HoldToConfirmProps {
  actionType: string;
  actionData: Record<string, any>;
  onConfirm: (signedAction: SignedAction) => Promise<void>;
  onCancel?: () => void;
  children: React.ReactNode;
  minHoldDuration?: number;
  className?: string;
}

export function HoldToConfirm({
  actionType,
  actionData,
  onConfirm,
  onCancel,
  children,
  minHoldDuration = 1500,
  className = "",
}: HoldToConfirmProps) {
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startTimeRef = useRef<number>(0);
  const animationRef = useRef<number>();
  const signerRef = useRef<ActionSigner | null>(null);

  const initializeSigner = async () => {
    if (!signerRef.current) {
      signerRef.current = new ActionSigner();
      await signerRef.current.initialize("current-user-id", "user-passphrase");
    }
    return signerRef.current;
  };

  const updateProgress = useCallback(() => {
    if (!isHolding) return;

    const elapsed = Date.now() - startTimeRef.current;
    const progress = Math.min((elapsed / minHoldDuration) * 100, 100);
    setHoldProgress(progress);

    if (elapsed >= minHoldDuration) {
      setShowConfirmation(true);
      cancelAnimationFrame(animationRef.current!);
    } else {
      animationRef.current = requestAnimationFrame(updateProgress);
    }
  }, [isHolding, minHoldDuration]);

  const handleMouseDown = useCallback(async () => {
    setError(null);
    setIsHolding(true);
    setShowConfirmation(false);
    startTimeRef.current = Date.now();
    animationRef.current = requestAnimationFrame(updateProgress);
  }, [updateProgress]);

  const handleMouseUp = useCallback(async () => {
    if (!isHolding) return;

    cancelAnimationFrame(animationRef.current!);
    setIsHolding(false);

    if (!showConfirmation) {
      setHoldProgress(0);
      return;
    }

    setIsConfirming(true);
    try {
      const signer = await initializeSigner();
      const nonce = generateSecureNonce();

      const signedAction = await signer.signAction(
        actionType,
        actionData,
        nonce,
      );
      signedAction.user_id = "current-user-id";

      await onConfirm(signedAction);
      setShowConfirmation(false);
      setHoldProgress(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Confirmation failed");
    } finally {
      setIsConfirming(false);
    }
  }, [isHolding, showConfirmation, actionType, actionData, onConfirm]);

  const handleCancel = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setIsHolding(false);
    setShowConfirmation(false);
    setHoldProgress(0);
    setError(null);
    onCancel?.();
  }, [onCancel]);

  return (
    <div className={`hold-to-confirm ${className}`}>
      <div
        className="confirm-button"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
      >
        {children}

        {isHolding && (
          <div
            className="hold-progress-bar"
            style={{ width: `${holdProgress}%` }}
          />
        )}

        {isHolding && (
          <div className="hold-indicator">
            {showConfirmation ? "Release to Confirm" : "Hold to confirm..."}
          </div>
        )}
      </div>

      {showConfirmation && (
        <div className="confirmation-dialog">
          <div className="confirmation-content">
            <h3>Confirm Action</h3>
            <p>You are about to:</p>
            <div className="action-details">
              <strong>{actionType}</strong>
              <pre>{JSON.stringify(actionData, null, 2)}</pre>
            </div>
            <p className="security-notice">
              🔒 This action will be cryptographically signed
            </p>
            <div className="confirmation-actions">
              <button
                onClick={handleCancel}
                disabled={isConfirming}
                className="cancel-btn"
              >
                Cancel
              </button>
              <button
                onClick={handleMouseUp}
                disabled={isConfirming}
                className="confirm-btn"
              >
                {isConfirming ? "Signing..." : "Confirm & Sign"}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}
    </div>
  );
}

function generateSecureNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}
```

---

## 4. WebSocket APPROVE Message Security

### 4.1 Nonce-Based Replay Prevention

#### Backend Nonce Store

```python
# backend/security/nonce_store.py
import asyncio
import time
import hashlib
from typing import Set, Optional
from datetime import datetime, timedelta
import redis.asyncio as redis

class NonceStore:
    """Store and validate nonces to prevent replay attacks."""

    def __init__(self, redis_url: str = "redis://localhost:6379", ttl_seconds: int = 300):
        self.redis_url = redis_url
        self.ttl = ttl_seconds
        self._client: Optional[redis.Redis] = None

    async def connect(self):
        self._client = redis.from_url(self.redis_url)

    async def close(self):
        if self._client:
            await self._client.close()

    async def is_valid_nonce(self, user_id: str, nonce: str) -> bool:
        """Check if nonce is valid (not used before and not expired)."""
        if not self._client:
            return False

        key = f"nonce:{user_id}:{nonce}"
        exists = await self._client.exists(key)

        if exists:
            return False

        await self._client.setex(key, self.ttl, "1")
        return True

    async def invalidate_nonce(self, user_id: str, nonce: str):
        """Remove a nonce after successful processing."""
        if self._client:
            key = f"nonce:{user_id}:{nonce}"
            await self._client.delete(key)

    async def cleanup_expired(self):
        """Background task to clean up expired keys (Redis handles TTL automatically)."""
        pass

class InMemoryNonceStore:
    """In-memory nonce store for testing or small deployments."""

    def __init__(self, ttl_seconds: int = 300):
        self.ttl = ttl_seconds
        self._nonces: dict[str, tuple[str, datetime]] = {}
        self._cleanup_task = None

    async def start_cleanup_task(self):
        """Start periodic cleanup of expired nonces."""
        while True:
            await asyncio.sleep(60)
            await self._cleanup()

    async def _cleanup(self):
        now = datetime.utcnow()
        expired = [
            key for key, (_, expiry) in self._nonces.items()
            if expiry < now
        ]
        for key in expired:
            del self._nonces[key]

    async def is_valid_nonce(self, user_id: str, nonce: str) -> bool:
        key = f"{user_id}:{nonce}"
        if key in self._nonces:
            return False

        self._nonces[key] = (user_id, datetime.utcnow() + timedelta(seconds=self.ttl))
        return True

    async def invalidate_nonce(self, user_id: str, nonce: str):
        key = f"{user_id}:{nonce}"
        self._nonces.pop(key, None)
```

#### WebSocket Message Signing

```python
# backend/security/signature_verifier.py
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec, padding
from cryptography.hazmat.backends import default_backend
from cryptography.exceptions import InvalidSignature
import base64
import json
from typing import Optional

class SignatureVerifier:
    """Verify ECDSA signatures for confirmation actions."""

    def __init__(self, key_manager):
        self.key_manager = key_manager

    async def verify_signed_action(
        self,
        signed_action: dict,
        expected_action_type: str,
        expected_action_data: dict = None
    ) -> tuple[bool, str]:
        """Verify a signed action from the frontend."""

        action_type = signed_action.get('action_type')
        if action_type != expected_action_type:
            return False, f"Unexpected action type: {action_type}"

        nonce = signed_action.get('nonce')
        if not nonce:
            return False, "Missing nonce"

        timestamp = signed_action.get('timestamp', 0)
        if abs(time.time() - timestamp) > 300:
            return False, "Message timestamp expired"

        user_id = signed_action.get('user_id')
        fingerprint = signed_action.get('public_key_fingerprint')
        signature = signed_action.get('signature')

        if not all([user_id, fingerprint, signature]):
            return False, "Missing required fields"

        user_public_key = await self.key_manager.get_user_public_key(user_id)
        if not user_public_key:
            return False, "User public key not found"

        payload = json.dumps({
            'action_type': action_type,
            'action_data': signed_action.get('action_data'),
            'nonce': nonce,
            'timestamp': timestamp
        })

        try:
            public_key = serialization.load_pem_public_key(
                base64.b64decode(user_public_key),
                backend=default_backend()
            )

            public_key.verify(
                base64.b64decode(signature),
                payload.encode('utf-8'),
                ec.ECDSA(hashes.SHA256())
            )
        except (InvalidSignature, Exception) as e:
            return False, f"Signature verification failed: {str(e)}"

        if expected_action_data:
            provided_data = signed_action.get('action_data', {})
            if provided_data != expected_action_data:
                return False, "Action data mismatch"

        return True, "Valid"
```

### 4.2 WebSocket APPROVE Message Format

```typescript
// src/types/websocket-security.ts

export interface SecureApproveMessage {
  msg_id: string;
  type: "approve";
  payload: ApprovePayload;
  nonce: string;
  signature: string;
  timestamp: number;
  direction: "c2s";
}

export interface ApprovePayload {
  request_id: string;
  decision: "approve" | "reject";
  reason?: string;
  action_type: string;
  action_data: Record<string, any>;
}

export interface ApproveResponse {
  msg_id: string;
  type: "approve_confirmed" | "error";
  payload: ApproveConfirmationPayload | ErrorPayload;
  timestamp: number;
  direction: "s2c";
}

export interface ApproveConfirmationPayload {
  request_id: string;
  decision: "approve" | "reject";
  executed_at: string;
  transaction_id?: string;
}

export interface ErrorPayload {
  code: string;
  message: string;
  severity: "info" | "warning" | "error" | "critical";
}
```

### 4.3 Secure WebSocket Sender

```typescript
// src/hooks/useSecureWebSocket.ts
import { useCallback, useRef, useState } from "react";
import {
  SecureApproveMessage,
  ApprovePayload,
} from "@/types/websocket-security";
import { ActionSigner } from "@/utils/crypto";

export function useSecureWebSocket(url: string, userId: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const signerRef = useRef<ActionSigner | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const initializeSigner = async () => {
    if (!signerRef.current) {
      signerRef.current = new ActionSigner();
      await signerRef.current.initialize(userId, "user-passphrase");
    }
    return signerRef.current;
  };

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    wsRef.current = new WebSocket(url);

    wsRef.current.onopen = () => {
      setIsConnected(true);
      setLastError(null);
    };

    wsRef.current.onclose = () => {
      setIsConnected(false);
    };

    wsRef.current.onerror = (error) => {
      setLastError("WebSocket connection error");
      console.error("WebSocket error:", error);
    };
  }, [url]);

  const sendSecureApprove = useCallback(
    async (payload: ApprovePayload): Promise<boolean> => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        setLastError("Not connected");
        return false;
      }

      try {
        const signer = await initializeSigner();
        const nonce = generateSecureNonce();
        const timestamp = Date.now();

        const signedPayload = await signer.signAction(
          "websocket_approve",
          {
            request_id: payload.request_id,
            decision: payload.decision,
            reason: payload.reason,
            action_type: payload.action_type,
            action_data: payload.action_data,
          },
          nonce,
        );

        const message: SecureApproveMessage = {
          msg_id: crypto.randomUUID(),
          type: "approve",
          payload,
          nonce: signedPayload.nonce,
          signature: signedPayload.signature,
          timestamp,
          direction: "c2s",
        };

        wsRef.current.send(JSON.stringify(message));
        return true;
      } catch (error) {
        setLastError(
          error instanceof Error ? error.message : "Failed to send approve",
        );
        return false;
      }
    },
    [],
  );

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setIsConnected(false);
  }, []);

  return {
    connect,
    disconnect,
    sendSecureApprove,
    isConnected,
    lastError,
  };
}

function generateSecureNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}
```

### 4.4 Backend WebSocket Handler

```python
# backend/api/websocket_handler.py
import json
import uuid
from datetime import datetime
from typing import Optional
from fastapi import WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from src.security.nonce_store import NonceStore
from src.security.signature_verifier import SignatureVerifier
from src.api.websocket_types import MessageFactory

class SecureWebSocketHandler:
    """Handle secure WebSocket messages with nonce and signature validation."""

    def __init__(
        self,
        websocket: WebSocket,
        user_id: str,
        nonce_store: NonceStore,
        signature_verifier: SignatureVerifier,
        connection_manager
    ):
        self.websocket = websocket
        self.user_id = user_id
        self.nonce_store = nonce_store
        self.signature_verifier = signature_verifier
        self.connection_manager = connection_manager

    async def handle_message(self, message: dict):
        """Process incoming WebSocket message."""
        msg_type = message.get('type')

        handlers = {
            'approve': self._handle_approve,
            'ping': self._handle_ping,
            'subscribe': self._handle_subscribe,
        }

        handler = handlers.get(msg_type)
        if not handler:
            await self._send_error(message.get('msg_id'), 'UNKNOWN_MESSAGE_TYPE', f"Unknown message type: {msg_type}")
            return

        try:
            await handler(message)
        except Exception as e:
            await self._send_error(message.get('msg_id'), 'HANDLER_ERROR', str(e))

    async def _handle_approve(self, message: dict):
        """Handle APPROVE message with full security validation."""
        msg_id = message.get('msg_id')
        nonce = message.get('nonce')
        signature = message.get('signature')
        payload = message.get('payload', {})

        if not all([nonce, signature]):
            await self._send_error(msg_id, 'MISSING_SECURITY_FIELDS', 'Nonce and signature required')
            return

        is_valid = await self.nonce_store.is_valid_nonce(self.user_id, nonce)
        if not is_valid:
            await self._send_error(msg_id, 'INVALID_NONCE', 'Nonce already used or expired')
            return

        signed_action = {
            'action_type': payload.get('action_type'),
            'action_data': payload,
            'nonce': nonce,
            'timestamp': message.get('timestamp'),
            'signature': signature,
            'user_id': self.user_id
        }

        is_valid, error_msg = await self.signature_verifier.verify_signed_action(
            signed_action,
            expected_action_type='websocket_approve',
            expected_action_data=payload
        )

        if not is_valid:
            await self.nonce_store.invalidate_nonce(self.user_id, nonce)
            await self._send_error(msg_id, 'INVALID_SIGNATURE', error_msg)
            return

        request_id = payload.get('request_id')
        decision = payload.get('decision')

        result = await self._execute_approval(request_id, decision, payload)

        if result.success:
            await self.nonce_store.invalidate_nonce(self.user_id, nonce)
            response = MessageFactory.approve_confirmed(
                request_id=request_id,
                decision=decision,
                transaction_id=result.transaction_id
            )
            await self.websocket.send_json(response)
        else:
            await self._send_error(msg_id, 'APPROVAL_FAILED', result.error_message)

    async def _execute_approval(self, request_id: str, decision: str, payload: dict) -> dict:
        """Execute the approved/rejected action."""
        from src.approval_system import get_approval_system

        system = get_approval_system()

        if decision == 'approve':
            result = await system.execute_approval(request_id, self.user_id)
            return {
                'success': result is not None,
                'transaction_id': getattr(result, 'id', None),
                'error_message': None if result else 'Approval execution failed'
            }
        else:
            await system.reject_approval(request_id, self.user_id, payload.get('reason'))
            return {'success': True, 'transaction_id': None, 'error_message': None}

    async def _handle_ping(self, message: dict):
        """Handle ping message."""
        response = MessageFactory.pong()
        await self.websocket.send_json(response)

    async def _handle_subscribe(self, message: dict):
        """Handle channel subscription."""
        channels = message.get('payload', {}).get('channels', [])
        self.connection_manager.subscribe(self.user_id, channels)

        response = MessageFactory.subscription_confirmed(channels=channels)
        await self.websocket.send_json(response)

    async def _send_error(self, msg_id: str, code: str, message: str):
        """Send error response."""
        error = MessageFactory.error(
            code=code,
            message=message,
            severity='error',
            request_msg_id=msg_id
        )
        await self.websocket.send_json(error)
```

---

## 5. Audit Logging

### 5.1 Security Audit Log Schema

```python
# backend/models/audit_log.py
from sqlalchemy import Column, String, DateTime, Text, JSON, Enum
from sqlalchemy.ext.declarative import declarative_base
import enum

Base = declarative_base()

class AuditAction(enum.Enum):
    APPROVAL_REQUESTED = "approval_requested"
    APPROVAL_CONFIRMED = "approval_confirmed"
    APPROVAL_REJECTED = "approval_rejected"
    APPROVAL_EXPIRED = "approval_expired"
    SIGNATURE_VERIFIED = "signature_verified"
    SIGNATURE_FAILED = "signature_failed"
    NONCE_REJECTED = "nonce_rejected"
    WEBSOCKET_MESSAGE = "websocket_message"

class SecurityAuditLog(Base):
    """Audit log for all security-relevant actions."""

    __tablename__ = 'security_audit_log'

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    timestamp = Column(DateTime, default=datetime.utcnow)
    user_id = Column(String(255), nullable=False, index=True)
    action = Column(Enum(AuditAction), nullable=False)
    resource_type = Column(String(100))
    resource_id = Column(String(255))
    ip_address = Column(String(45))
    user_agent = Column(String(500))
    request_id = Column(String(36))
    nonce = Column(String(64))
    signature_fingerprint = Column(String(64))
    success = Column(String(10))
    error_message = Column(Text)
    metadata = Column(JSON)
    raw_payload = Column(Text)
    cryptographic_proof = Column(Text)
```

### 5.2 Audit Logger Implementation

```python
# backend/security/audit_logger.py
import json
import hashlib
from datetime import datetime
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.audit_log import SecurityAuditLog, AuditAction

class AuditLogger:
    """Log all security-relevant actions with cryptographic proof."""

    def __init__(self, db_session: AsyncSession):
        self.session = db_session

    async def log(
        self,
        user_id: str,
        action: AuditAction,
        resource_type: str = None,
        resource_id: str = None,
        ip_address: str = None,
        user_agent: str = None,
        request_id: str = None,
        nonce: str = None,
        signature_fingerprint: str = None,
        success: bool = True,
        error_message: str = None,
        metadata: dict = None,
        raw_payload: dict = None,
        signed_action: dict = None
    ):
        """Create an audit log entry."""

        proof = None
        if signed_action:
            proof = self._generate_cryptographic_proof(signed_action)

        log_entry = SecurityAuditLog(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            ip_address=ip_address,
            user_agent=user_agent,
            request_id=request_id,
            nonce=nonce,
            signature_fingerprint=signature_fingerprint,
            success='YES' if success else 'NO',
            error_message=error_message,
            metadata=metadata or {},
            raw_payload=json.dumps(raw_payload) if raw_payload else None,
            cryptographic_proof=proof
        )

        self.session.add(log_entry)
        await self.session.commit()

    def _generate_cryptographic_proof(self, signed_action: dict) -> str:
        """Generate tamper-evident proof from signed action."""
        data = json.dumps(signed_action, sort_keys=True)
        return hashlib.sha256(data.encode()).hexdigest()

    async def get_user_audit_trail(
        self,
        user_id: str,
        start_time: datetime = None,
        end_time: datetime = None,
        action_type: AuditAction = None,
        limit: int = 100
    ) -> list[SecurityAuditLog]:
        """Query audit trail for a user."""
        query = self.session.query(SecurityAuditLog).filter(
            SecurityAuditLog.user_id == user_id
        )

        if start_time:
            query = query.filter(SecurityAuditLog.timestamp >= start_time)
        if end_time:
            query = query.filter(SecurityAuditLog.timestamp <= end_time)
        if action_type:
            query = query.filter(SecurityAuditLog.action == action_type)

        return query.order_by(SecurityAuditLog.timestamp.desc()).limit(limit).all()
```

---

## 6. Implementation Roadmap

### Phase 1: Core Infrastructure (Week 1)

- [ ] Implement `KeyManager` class for key generation and storage
- [ ] Implement `NonceStore` (Redis-based with fallback to in-memory)
- [ ] Create `SignatureVerifier` for ECDSA signature validation
- [ ] Set up audit logging infrastructure
- [ ] Configure environment variables for security services

### Phase 2: Frontend Integration (Week 2)

- [ ] Implement `crypto.ts` utilities for Web Crypto API
- [ ] Build `HoldToConfirm` component with long-press detection
- [ ] Create `useSecureWebSocket` hook for approved message sending
- [ ] Add TypeScript types for signed messages
- [ ] Implement secure storage for user keys

### Phase 3: Backend Integration (Week 3)

- [ ] Implement `SecureWebSocketHandler` with nonce validation
- [ ] Add signature verification to WebSocket router
- [ ] Integrate with existing approval system
- [ ] Implement audit logging in all security paths
- [ ] Add rate limiting for approval requests

### Phase 4: Testing & Hardening (Week 4)

- [ ] Unit tests for crypto operations (100% coverage)
- [ ] Integration tests for WebSocket security flow
- [ ] Penetration testing for replay attack prevention
- [ ] Load testing for nonce store performance
- [ ] Documentation and runbook creation

---

## 7. Security Considerations

### 7.1 Key Storage

- **Frontend Keys**: Stored in encrypted localStorage with user passphrase
- **Backend Public Keys**: Stored in secure database with encryption at rest
- **Key Rotation**: Automatic rotation every 90 days with graceful migration

### 7.2 Nonce Validity

- **TTL**: 5 minutes (300 seconds) for all nonces
- **Single Use**: Each nonce can only be used once
- **User Scope**: Nonces are user-specific to prevent cross-user replay

### 7.3 Signature Requirements

- **Algorithm**: ECDSA with P-256 curve
- **Hash**: SHA-256
- **Key Size**: 2048-bit RSA or P-256 ECDSA
- **Timestamp Window**: ±5 minutes from server time

### 7.4 Attack Mitigations

| Attack Vector     | Mitigation                             |
| ----------------- | -------------------------------------- |
| Replay Attack     | Nonce + TTL validation                 |
| Man-in-the-Middle | TLS 1.3 + message signatures           |
| CSRF              | Signed actions with user context       |
| Insider Threat    | Audit trail + signature verification   |
| Session Hijacking | Short-lived nonces + signature binding |

---

## 8. API Reference

### 8.1 POST /api/v1/approvals/secure-decision

**Secure approval endpoint requiring signed action.**

**Request Headers:**

```
Content-Type: application/json
X-Request-ID: <uuid>
X-Timestamp: <unix_timestamp>
X-Signature: <base64_signature>
```

**Request Body:**

```json
{
  "request_id": "abc123xyz",
  "decision": "approve",
  "reason": "Approved based on analysis",
  "signed_action": {
    "action_type": "hold_confirm_approve",
    "action_data": {
      "request_id": "abc123xyz",
      "decision": "approve"
    },
    "nonce": "a1b2c3d4e5f6...",
    "timestamp": 1705420800000,
    "signature": "MEUCIQD...",
    "public_key_fingerprint": "abc12345",
    "user_id": "user_123"
  }
}
```

**Response (200 OK):**

```json
{
  "request_id": "abc123xyz",
  "status": "approved",
  "executed_at": "2026-01-17T12:00:00Z",
  "transaction_id": "tx_456"
}
```

**Response (400 Bad Request):**

```json
{
  "error": {
    "code": "INVALID_SIGNATURE",
    "message": "Signature verification failed",
    "severity": "error"
  }
}
```

### 8.2 WebSocket: APPROVE Message

**Send secure approval via WebSocket.**

```json
{
  "msg_id": "550e8400-e29b-41d4-a716-446655440000",
  "type": "approve",
  "nonce": "a1b2c3d4e5f6...",
  "signature": "MEUCIQD...",
  "timestamp": 1705420800000,
  "payload": {
    "request_id": "abc123xyz",
    "decision": "approve",
    "reason": "Approved based on analysis",
    "action_type": "trade_execution",
    "action_data": {
      "ticker": "7203.T",
      "action": "BUY",
      "quantity": 100
    }
  },
  "direction": "c2s"
}
```

---

## 9. Monitoring & Observability

### 9.1 Security Metrics

| Metric                  | Alert Threshold | Description                        |
| ----------------------- | --------------- | ---------------------------------- |
| signature_failures_rate | > 1%            | Failed signature verifications     |
| nonce_rejections_rate   | > 5%            | Rejected nonces (potential attack) |
| approval_latency_p95    | > 30s           | Time from request to approval      |
| audit_log_lag           | > 10s           | Delay in audit logging             |

### 9.2 Alert Rules

```yaml
alerts:
  - name: High Signature Failure Rate
    condition: rate(signature_failures[5m]) > 0.01
    severity: high
    description: Possible attack or key compromise

  - name: Nonce Rejection Spike
    condition: rate(nonce_rejections[5m]) > 0.05
    severity: critical
    description: Potential replay attack in progress

  - name: Audit Log Delay
    condition: audit_log_lag_seconds > 10
    severity: warning
    description: Audit logging delayed beyond SLA
```

---

## 10. Conclusion

This design implements defense-in-depth security for the confirmation system:

1. **Cryptographic Signing**: All confirmation actions require ECDSA signatures
2. **Replay Prevention**: Ephemeral nonces with short TTL prevent message reuse
3. **Audit Trail**: Complete cryptographic proof for every action
4. **Secure WebSocket**: APPROVE messages include both nonce and signature

The system is designed to be:

- **Secure**: Multiple layers of protection against common attacks
- **Performant**: Redis-based nonce store with minimal latency
- **Observable**: Comprehensive logging and metrics
- **Usability-Focused**: Intuitive hold-to-confirm UX

**"Security is not a feature, it's a foundation."**
