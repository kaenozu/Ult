<<<<<<< HEAD
import { useEffect, useState, useCallback } from "react";
import { useSynapse } from "../connection";
=======
import { useEffect, useState, useCallback } from 'react';
import { useSynapse } from '../connection';
>>>>>>> main
import {
  ApprovalRequestMessage,
  ApprovalRequestPayload,
  ApprovalResponseMessage,
} from '@/components/shared/websocket';

export function useApprovalRequests() {
  const [activeRequests, setActiveRequests] = useState<
    ApprovalRequestPayload[]
  >([]);
  const { onMessage } = useSynapse({ url: 'ws://localhost:8000/ws/synapse' });

  // Handle incoming approval requests
  useEffect(() => {
    const handleApprovalRequest = (message: ApprovalRequestMessage) => {
      const request = message.payload;

      // Check if this request already exists (prevent duplicates)
      setActiveRequests(prev => {
        const exists = prev.some(r => r.request_id === request.request_id);
        if (exists) return prev;

        // Add new request to the front (most recent first)
        return [request, ...prev];
      });
    };

    onMessage<ApprovalRequestMessage>(
      'approval_request',
      handleApprovalRequest
    );
  }, [onMessage]);

  // Handle approval responses (to remove cards when approved/rejected by others)
  useEffect(() => {
    const handleApprovalResponse = (message: ApprovalResponseMessage) => {
      const { request_id } = message.payload;

      // Remove the request from active requests
      setActiveRequests(prev => prev.filter(r => r.request_id !== request_id));
    };

    onMessage<ApprovalResponseMessage>(
      'approval_response',
      handleApprovalResponse
    );
  }, [onMessage]);

  // Remove a request (when user dismisses or it expires)
  const removeRequest = useCallback((requestId: string) => {
    setActiveRequests(prev => prev.filter(r => r.request_id !== requestId));
  }, []);

  // Clean up expired requests periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setActiveRequests(prev =>
        prev.filter(request => {
          const expiresAt = new Date(request.expires_at).getTime();
          return expiresAt > now;
        })
      );
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return {
    activeRequests,
    removeRequest,
  };
}
