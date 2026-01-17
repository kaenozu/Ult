"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSynapse } from "@/hooks/useSynapse";
import { ApprovalType } from "@/types/websocket";
import { MessageFactory } from "@/types/websocket";

export function ApprovalCardsDemo() {
  const [isSending, setIsSending] = useState(false);
  const { send, isConnected } = useSynapse({
    url: "ws://localhost:8000/ws/synapse",
  });

  const sendTestApproval = async (type: ApprovalType, priority: string) => {
    if (!isConnected) {
      alert("WebSocket not connected. Please ensure the backend is running.");
      return;
    }

    setIsSending(true);

    try {
      const testRequest = {
        msg_id: crypto.randomUUID(),
        type: "approval_request",
        payload: {
          request_id: `demo_${Date.now()}`,
          type: type,
          title: `Demo ${type.replace("_", " ").toUpperCase()}`,
          description: `This is a demo ${type.replace("_", " ")} approval request for testing purposes.`,
          context: {
            ticker: type === ApprovalType.TRADE_EXECUTION ? "AAPL" : undefined,
            action: type === ApprovalType.TRADE_EXECUTION ? "BUY" : undefined,
            quantity: type === ApprovalType.TRADE_EXECUTION ? 100 : undefined,
            price: type === ApprovalType.TRADE_EXECUTION ? 178.45 : undefined,
            reason: "Demo approval request for testing instant UI cards",
          },
          requester: "Demo System",
          priority: priority,
          expires_at: new Date(Date.now() + 2 * 60 * 1000).toISOString(), // 2 minutes
          created_at: new Date().toISOString(),
        },
        direction: "s2c",
        timestamp: new Date().toISOString(),
      };

      // Simulate receiving an approval request via WebSocket
      // In production, this would come from the backend
      send(testRequest as any);
    } catch (error) {
      console.error("Failed to send test approval:", error);
      alert("Failed to send test approval request");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>🎯 Approval Cards Demo</CardTitle>
        <p className="text-sm text-muted-foreground">
          Test instant approval cards with WebSocket push notifications
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            onClick={() =>
              sendTestApproval(ApprovalType.TRADE_EXECUTION, "medium")
            }
            disabled={isSending || !isConnected}
            className="h-16 flex flex-col items-center"
          >
            <span className="text-lg">💰</span>
            <span>Trade Execution</span>
          </Button>

          <Button
            onClick={() =>
              sendTestApproval(ApprovalType.STRATEGY_CHANGE, "high")
            }
            disabled={isSending || !isConnected}
            className="h-16 flex flex-col items-center"
            variant="secondary"
          >
            <span className="text-lg">📊</span>
            <span>Strategy Change</span>
          </Button>

          <Button
            onClick={() =>
              sendTestApproval(ApprovalType.RISK_LIMIT_CHANGE, "high")
            }
            disabled={isSending || !isConnected}
            className="h-16 flex flex-col items-center"
            variant="outline"
          >
            <span className="text-lg">⚠️</span>
            <span>Risk Limit Change</span>
          </Button>

          <Button
            onClick={() =>
              sendTestApproval(ApprovalType.EMERGENCY_ACTION, "critical")
            }
            disabled={isSending || !isConnected}
            className="h-16 flex flex-col items-center"
            variant="destructive"
          >
            <span className="text-lg">🚨</span>
            <span>Emergency Action</span>
          </Button>
        </div>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2">📋 Instructions:</h3>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>• Click any button above to trigger a demo approval card</li>
            <li>
              • Approval cards will appear instantly in the top-right corner
            </li>
            <li>• Cards have different priorities and expiration times</li>
            <li>• You can approve, reject, or dismiss cards</li>
            <li>• Cards disappear automatically when expired</li>
            <li>• This is an ephemeral UI - if you miss it, it's gone!</li>
          </ul>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          WebSocket Status: {isConnected ? "🟢 Connected" : "🔴 Disconnected"}
        </div>
      </CardContent>
    </Card>
  );
}
