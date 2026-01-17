"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Clock, AlertCircle } from "lucide-react";

interface NeuralMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  status: "nominal" | "warning" | "critical";
  threshold: number;
}

interface SystemLog {
  id: number;
  timestamp: string;
  level: "info" | "warning" | "error";
  message: string;
  source: string;
}

const NEURAL_METRICS: NeuralMetric[] = [
  {
    id: "cpu",
    name: "CPU Load",
    value: 42,
    unit: "%",
    status: "nominal",
    threshold: 80,
  },
  {
    id: "memory",
    name: "Memory",
    value: 65,
    unit: "%",
    status: "nominal",
    threshold: 90,
  },
  {
    id: "latency",
    name: "Latency",
    value: 23,
    unit: "ms",
    status: "nominal",
    threshold: 100,
  },
  {
    id: "throughput",
    name: "Throughput",
    value: 1520,
    unit: "req/s",
    status: "nominal",
    threshold: 2000,
  },
  {
    id: "error_rate",
    name: "Error Rate",
    value: 0.02,
    unit: "%",
    status: "nominal",
    threshold: 1.0,
  },
  {
    id: "gpu",
    name: "GPU Utilization",
    value: 78,
    unit: "%",
    status: "nominal",
    threshold: 95,
  },
];

const INITIAL_LOGS: Omit<SystemLog, "timestamp">[] = [
  {
    id: 1,
    level: "info",
    message: "Neural network initialized",
    source: "CORE",
  },
  {
    id: 2,
    level: "info",
    message: "WebSocket connection established",
    source: "NETWORK",
  },
  {
    id: 3,
    level: "info",
    message: "Market data stream active",
    source: "DATA",
  },
  {
    id: 4,
    level: "warning",
    message: "High volatility detected in Sector 7",
    source: "ANALYSIS",
  },
  {
    id: 5,
    level: "info",
    message: "Model inference completed in 12ms",
    source: "INFERENCE",
  },
];

export default function NeuralMonitor() {
  const [mounted, setMounted] = useState(false);
  const [metrics, setMetrics] = useState<NeuralMetric[]>(NEURAL_METRICS);
  const [logs, setLogs] = useState<SystemLog[]>([]);

  useEffect(() => {
    setMounted(true);

    const now = new Date();
    const timestampedLogs = INITIAL_LOGS.map((log) => ({
      ...log,
      timestamp: new Date(now.getTime() - Math.random() * 60000).toISOString(),
    }));
    setLogs(timestampedLogs.sort((a, b) => b.id - a.id));

    const interval = setInterval(() => {
      setMetrics((prev) =>
        prev.map((metric) => {
          const change = (Math.random() - 0.5) * 10;
          const newValue = Math.max(0, Math.min(100, metric.value + change));
          let status: "nominal" | "warning" | "critical" = "nominal";
          if (newValue >= metric.threshold * 0.9) status = "warning";
          if (newValue >= metric.threshold) status = "critical";
          return { ...metric, value: newValue, status };
        }),
      );
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  if (!mounted) return null;

  const formatTimestamp = (isoString: string) => {
    const date = new Date(isoString);
    const ms = date.getMilliseconds().toString().padStart(3, "0");
    const base = date.toLocaleString("ja-JP", {
      year: "2-digit",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    return `${base}.${ms}`;
  };

  const getStatusColor = (status: NeuralMetric["status"]) => {
    switch (status) {
      case "nominal":
        return "bg-green-500";
      case "warning":
        return "bg-yellow-500";
      case "critical":
        return "bg-red-500";
    }
  };

  const getLevelBadgeVariant = (level: SystemLog["level"]) => {
    switch (level) {
      case "info":
        return "secondary";
      case "warning":
        return "outline";
      case "error":
        return "destructive";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          <h2 className="text-xl font-semibold">NeuralMonitor</h2>
        </div>
        <Badge variant="outline" className="text-xs">
          <Clock className="h-3 w-3 mr-1" />
          {new Date().toLocaleTimeString("ja-JP", { hour12: false })}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">System Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                    Metric
                  </th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                    Value
                  </th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                    Threshold
                  </th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {metrics.map((metric) => (
                  <tr
                    key={metric.id}
                    className="border-b border-muted/30 hover:bg-muted/20"
                  >
                    <td className="py-2 px-3">{metric.name}</td>
                    <td className="py-2 px-3">
                      {metric.value.toFixed(2)} {metric.unit}
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-2 w-2 rounded-full ${getStatusColor(metric.status)}`}
                        />
                        <span className="capitalize text-xs">
                          {metric.status}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-muted-foreground">
                      {metric.threshold} {metric.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Event Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                    Timestamp
                  </th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                    Level
                  </th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                    Source
                  </th>
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                    Message
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-muted/30 hover:bg-muted/20"
                  >
                    <td className="py-2 px-3 font-mono text-xs">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="py-2 px-3">
                      <Badge
                        variant={getLevelBadgeVariant(log.level)}
                        className="text-xs"
                      >
                        {log.level.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="py-2 px-3 font-mono text-xs">
                      {log.source}
                    </td>
                    <td className="py-2 px-3">{log.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-muted/30 border-dashed">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Design Principle: Why Effects Ruin Data Visibility
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-3">
          <p>
            <strong>Glow effects, shadows, and animations</strong> create visual
            noise that competes with data for attention.
          </p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>
              <strong>Reduced contrast:</strong> Glow effects bleed into
              background colors, making text harder to read.
            </li>
            <li>
              <strong>Cognitive load:</strong> Unnecessary motion forces brain
              to process extra visual information unrelated to data.
            </li>
            <li>
              <strong>Value ambiguity:</strong> Shadows and gradients make it
              difficult to discern exact values and boundaries.
            </li>
            <li>
              <strong>Scanning speed:</strong> Clean, flat data tables can be
              scanned 2-3x faster than stylized interfaces.
            </li>
          </ul>
          <p className="text-xs text-muted-foreground">
            This dashboard demonstrates minimal, functional design where data is
            the hero and UI elements serve only to organize and present
            information clearly.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
