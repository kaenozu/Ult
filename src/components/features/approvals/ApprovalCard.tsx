"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ApprovalRequestPayload,
  ApprovalType,
  ApprovalStatus,
  ApprovalResponsePayload,
} from "@/components/shared/websocket";
import { useSynapse } from "@/components/shared/hooks/useSynapse";

interface ApprovalCardProps {
  request: ApprovalRequestPayload;
  onClose: () => void;
}

const priorityColors = {
  low: "bg-blue-100 text-blue-800 border-blue-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  critical: "bg-red-100 text-red-800 border-red-200 animate-pulse",
};

const typeIcons = {
  [ApprovalType.TRADE_EXECUTION]: "💰",
  [ApprovalType.STRATEGY_CHANGE]: "📊",
  [ApprovalType.RISK_LIMIT_CHANGE]: "⚠️",
  [ApprovalType.EMERGENCY_ACTION]: "🚨",
};

export function ApprovalCard({ request, onClose }: ApprovalCardProps) {
  const [isResponding, setIsResponding] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const { send } = useSynapse({ url: "ws://localhost:8000/ws/synapse" });

  // Calculate time remaining until expiration
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = Date.now();
      const expiresAt = new Date(request.expires_at).getTime();
      const remaining = Math.max(0, expiresAt - now);
      setTimeLeft(remaining);
      return remaining;
    };

    const timer = setInterval(calculateTimeLeft, 1000);
    calculateTimeLeft(); // Initial calculation

    // Auto-close when expired
    if (timeLeft === 0 && calculateTimeLeft() === 0) {
      onClose();
    }

    return () => clearInterval(timer);
  }, [request.expires_at, onClose, timeLeft]);

  const formatTimeLeft = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  const handleResponse = async (status: ApprovalStatus) => {
    if (isResponding) return;

    setIsResponding(true);

    try {
      const response: ApprovalResponsePayload = {
        request_id: request.request_id,
        status,
        responder: "current_user", // TODO: Get from auth context
        responded_at: new Date().toISOString(),
      };

      // Send approval response via WebSocket
      send({
        msg_id: crypto.randomUUID(),
        type: "approval_response",
        payload: response,
        direction: "c2s",
        timestamp: new Date().toISOString(),
      } as any);

      // Immediately close the card (ephemeral UI)
      onClose();
    } catch (error) {
      console.error("Failed to send approval response:", error);
      setIsResponding(false);
    }
  };

  const isExpired = timeLeft <= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 50, scale: 0.95 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
        duration: 0.3,
      }}
      className="fixed top-4 right-4 z-50 max-w-md w-full"
    >
      <Card
        className={`shadow-lg border-l-4 ${
          request.priority === "critical"
            ? "border-l-red-500"
            : request.priority === "high"
              ? "border-l-orange-500"
              : request.priority === "medium"
                ? "border-l-yellow-500"
                : "border-l-blue-500"
        }`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-2xl">{typeIcons[request.type]}</span>
              <CardTitle className="text-lg font-semibold">
                {request.title}
              </CardTitle>
            </div>
            <div className="flex items-center space-x-2">
              <Badge
                className={`text-xs ${priorityColors[request.priority]}`}
                variant="outline"
              >
                {request.priority.toUpperCase()}
              </Badge>
              {!isExpired && (
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    timeLeft < 30000
                      ? "bg-red-100 text-red-800 border-red-200 animate-pulse"
                      : timeLeft < 60000
                        ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                        : "bg-green-100 text-green-800 border-green-200"
                  }`}
                >
                  {formatTimeLeft(timeLeft)}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground mb-4">
            {request.description}
          </p>

          <div className="text-xs text-muted-foreground mb-4">
            <p>
              Requested by:{" "}
              <span className="font-medium">{request.requester}</span>
            </p>
            <p>Created: {new Date(request.created_at).toLocaleTimeString()}</p>
          </div>

          {/* Context preview */}
          {request.context && Object.keys(request.context).length > 0 && (
            <div className="bg-muted/50 rounded p-2 mb-4">
              <p className="text-xs font-medium mb-1">Context:</p>
              <div className="text-xs text-muted-foreground space-y-1">
                {Object.entries(request.context)
                  .slice(0, 3)
                  .map(([key, value]) => (
                    <p key={key}>
                      <span className="font-medium">{key}:</span>{" "}
                      {JSON.stringify(value)}
                    </p>
                  ))}
                {Object.keys(request.context).length > 3 && (
                  <p className="italic">
                    ...and {Object.keys(request.context).length - 3} more
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex space-x-2">
            <Button
              onClick={() => handleResponse(ApprovalStatus.APPROVED)}
              disabled={isResponding || isExpired}
              className="flex-1"
              variant="default"
            >
              {isResponding ? "Sending..." : "Approve"}
            </Button>
            <Button
              onClick={() => handleResponse(ApprovalStatus.REJECTED)}
              disabled={isResponding || isExpired}
              className="flex-1"
              variant="outline"
            >
              {isResponding ? "Sending..." : "Reject"}
            </Button>
            <Button
              onClick={onClose}
              disabled={isResponding}
              variant="ghost"
              size="sm"
            >
              Dismiss
            </Button>
          </div>

          {isExpired && (
            <p className="text-center text-sm text-red-600 mt-2 font-medium">
              ⏰ This approval request has expired
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Container component to manage multiple approval cards
interface ApprovalCardContainerProps {
  requests: ApprovalRequestPayload[];
  onRemoveRequest: (requestId: string) => void;
}

export function ApprovalCardContainer({
  requests,
  onRemoveRequest,
}: ApprovalCardContainerProps) {
  return (
    <AnimatePresence>
      {requests.map((request) => (
        <ApprovalCard
          key={request.request_id}
          request={request}
          onClose={() => onRemoveRequest(request.request_id)}
        />
      ))}
    </AnimatePresence>
  );
}
