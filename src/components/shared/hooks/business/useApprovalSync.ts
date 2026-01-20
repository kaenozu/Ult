"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "@/components/shared/utils/api";

export interface ApprovalContext {
  ticker?: string;
  action?: string;
  quantity?: number;
  price?: number;
  strategy?: string;
  confidence?: number;
  risk_level?: string;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface ApprovalRequest {
  request_id: string;
  type: string;
  title: string;
  description: string;
  context: ApprovalContext;
  status: "pending" | "approved" | "rejected" | "expired" | "cancelled";
  created_at: string;
  expires_at: string;
  approved_by?: string;
  rejected_by?: string;
  approved_at?: string;
  rejected_at?: string;
  rejection_reason?: string;
  platform?: string;
  message_id?: string;
  stored_at?: string;
  ttl?: number;
  updated_by?: string;
  updated_at?: string;
}

export interface ApprovalSyncResponse {
  success: boolean;
  approvals: ApprovalRequest[];
  redis_available: boolean;
}

const STORAGE_KEY = "approval_state";
const SYNC_INTERVAL = 5000; // 5 seconds
const TTL_CHECK_INTERVAL = 10000; // Check TTL every 10 seconds

export function useApprovalSync() {
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redisAvailable, setRedisAvailable] = useState(false);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const ttlCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadFromStorage = useCallback((): ApprovalRequest[] => {
    if (typeof window === "undefined") return [];

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const now = Date.now();

        // Filter out expired approvals
        const valid = parsed.filter((a: ApprovalRequest) => {
          const expiresAt = new Date(a.expires_at).getTime();
          return expiresAt > now;
        });

        if (valid.length !== parsed.length) {
          // Update storage with only valid approvals
          localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
        }

        return valid;
      }
    } catch (err) {
      
    }

    return [];
  }, []);

  const saveToStorage = useCallback((approvalsToSave: ApprovalRequest[]) => {
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(approvalsToSave));
    } catch (err) {
      
    }
  }, []);

  const syncFromRedis =
    useCallback(async (): Promise<ApprovalSyncResponse | null> => {
      try {
        const response = await api.get<ApprovalSyncResponse>(
          "/api/v1/approvals/sync",
        );
        return response.data;
      } catch (err) {
        
        return null;
      }
    }, []);

  const sync = useCallback(
    async (force: boolean = false) => {
      if (isLoading) return;

      setIsLoading(true);
      setError(null);

      try {
        // First, try to sync from Redis
        const redisResponse = await syncFromRedis();

        if (
          redisResponse &&
          redisResponse.success &&
          redisResponse.redis_available
        ) {
          setRedisAvailable(true);
          setApprovals(redisResponse.approvals);
          saveToStorage(redisResponse.approvals);
        } else {
          setRedisAvailable(false);
          // Fallback to storage if Redis not available
          const storedApprovals = loadFromStorage();
          setApprovals(storedApprovals);
        }
      } catch (err: any) {
        setError(err?.message || "Failed to sync approvals");
        // Fallback to storage on error
        const storedApprovals = loadFromStorage();
        setApprovals(storedApprovals);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, syncFromRedis, saveToStorage, loadFromStorage],
  );

  const checkTTL = useCallback(() => {
    const now = Date.now();
    setApprovals((prev) => {
      const valid = prev.filter((a) => {
        const expiresAt = new Date(a.expires_at).getTime();
        return expiresAt > now;
      });

      if (valid.length !== prev.length) {
        saveToStorage(valid);
      }

      return valid;
    });
  }, [saveToStorage]);

  const getApprovalById = useCallback(
    (requestId: string): ApprovalRequest | undefined => {
      return approvals.find((a) => a.request_id === requestId);
    },
    [approvals],
  );

  const getPendingApprovals = useCallback((): ApprovalRequest[] => {
    return approvals.filter((a) => a.status === "pending");
  }, [approvals]);

  const refresh = useCallback(() => {
    sync(true);
  }, [sync]);

  useEffect(() => {
    // Initial load from storage for instant display
    const storedApprovals = loadFromStorage();
    setApprovals(storedApprovals);

    // Sync from Redis
    sync();

    // Set up periodic sync
    syncIntervalRef.current = setInterval(() => {
      sync();
    }, SYNC_INTERVAL);

    // Set up TTL check
    ttlCheckIntervalRef.current = setInterval(() => {
      checkTTL();
    }, TTL_CHECK_INTERVAL);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      if (ttlCheckIntervalRef.current) {
        clearInterval(ttlCheckIntervalRef.current);
      }
    };
  }, [loadFromStorage, sync, checkTTL]);

  return {
    approvals,
    isLoading,
    error,
    redisAvailable,
    sync: refresh,
    getApprovalById,
    getPendingApprovals,
  };
}
