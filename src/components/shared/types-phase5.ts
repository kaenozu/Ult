export type PlatformLayer = "cloud" | "edge" | "hybrid";

export type InferenceType =
  | "regime"
  | "sentiment"
  | "ui_reactivity"
  | "market_data";

export type InteractionMode = "flat" | "parallax_2d" | "webxr_vr" | "webxr_ar";

export type IntelligenceFlow =
  | "ai_only"
  | "human_initiated"
  | "human_overridden"
  | "bidirectional";

export type DataPriority = "critical" | "high" | "normal" | "low";

export interface InferenceConfig {
  type: InferenceType;
  layer: PlatformLayer;
  latencyTargetMs: number;
  batchSize: number;
  retryPolicy: {
    maxRetries: number;
    backoffMs: number;
  };
  cachePolicy: {
    enabled: boolean;
    ttlSeconds: number;
  };
}

export interface EdgeInferenceMetrics {
  model: string;
  modelSizeMb: number;
  memoryUsageMb: number;
  inferenceTimeMs: number;
  throughputPerSecond: number;
  accuracy: number;
}

export interface CloudInferenceMetrics {
  endpoint: string;
  requestTimeMs: number;
  responseTimeMs: number;
  totalLatencyMs: number;
  apiCallsPerMinute: number;
}

export interface InferenceResult {
  inferenceId: string;
  type: InferenceType;
  layer: PlatformLayer;
  timestamp: string;
  processingTimeMs: number;
  success: boolean;
  data: any;
  metrics: EdgeInferenceMetrics | CloudInferenceMetrics;
}

export interface ImmersionConfig {
  mode: InteractionMode;
  enabled: boolean;
  hardwareCapabilities: {
    webxrSupported: boolean;
    vrSupported: boolean;
    arSupported: boolean;
    hasGyroscope: boolean;
    hasAccelerometer: boolean;
  };
  performanceSettings: {
    targetFps: number;
    minFps: number;
    dynamicQuality: boolean;
  };
}

export interface ParallaxConfig {
  enabled: boolean;
  sensitivity: number;
  smoothing: number;
  maxOffset: number;
  layers: Array<{
    depth: number;
    speed: number;
  }>;
}

export interface ImmersionMetrics {
  currentMode: InteractionMode;
  fps: number;
  renderTimeMs: number;
  memoryUsageMb: number;
  frameDropCount: number;
  userEngagementScore: number;
}

export interface VoiceCommand {
  commandId: string;
  timestamp: string;
  commandText: string;
  intent: string;
  confidence: number;
  executed: boolean;
  result?: any;
}

export interface AIConversation {
  conversationId: string;
  startTime: string;
  endTime?: string;
  messages: Array<{
    role: "user" | "ai" | "system";
    content: string;
    timestamp: string;
  }>;
  context: {
    regime?: string;
    positions?: number;
    alerts?: number;
  };
}

export interface DivineVoiceConfig {
  enabled: boolean;
  speechRecognition: {
    language: string;
    continuous: boolean;
    interimResults: boolean;
  };
  speechSynthesis: {
    voice: string;
    rate: number;
    pitch: number;
    volume: number;
  };
  wakeWord?: string;
  autoReadPriority: DataPriority[];
}

export interface StrategyComparison {
  immersion: {
    config: ImmersionConfig;
    metrics: ImmersionMetrics;
    resourceCost: {
      cpuPercent: number;
      gpuPercent: number;
      memoryMb: number;
      batteryDrainPercent: number;
    };
  };
  efficiency: {
    inferenceConfigs: InferenceConfig[];
    recentResults: InferenceResult[];
    resourceSavings: {
      latencySavedMs: number;
      bandwidthSavedKb: number;
      serverLoadReducedPercent: number;
    };
  };
  intelligence: {
    voice: DivineVoiceConfig;
    conversations: AIConversation[];
    commands: VoiceCommand[];
  };
}

export interface Phase5State {
  active: boolean;
  timestamp: string;
  comparison: StrategyComparison;
  recommendations: Array<{
    type: "immersion" | "efficiency" | "intelligence";
    priority: "high" | "medium" | "low";
    action: string;
    reason: string;
    estimatedImpact: string;
  }>;
}

export type Phase5UpdateType =
  | "inference_complete"
  | "immersion_mode_change"
  | "voice_command"
  | "metrics_update"
  | "recommendation_update";

export interface Phase5Update {
  type: Phase5UpdateType;
  state: Phase5State;
  delta: Partial<Phase5State>;
}

export interface PlatformStrategyDecision {
  inferenceType: InferenceType;
  selectedLayer: PlatformLayer;
  reasoning: string;
  confidence: number;
  fallbackLayer?: PlatformLayer;
}

export class Phase5StrategyEngine {
  private state: Phase5State;

  constructor(initialState?: Partial<Phase5State>) {
    this.state = {
      active: true,
      timestamp: new Date().toISOString(),
      comparison: initialState?.comparison || this.getDefaultComparison(),
      recommendations: [],
    };
  }

  getState(): Phase5State {
    return { ...this.state };
  }

  decidePlatform(inferenceType: InferenceType): PlatformStrategyDecision {
    const config = this.state.comparison.efficiency.inferenceConfigs.find(
      (c) => c.type === inferenceType,
    );

    if (!config) {
      return this.getDefaultDecision(inferenceType);
    }

    const metrics = this.state.comparison.efficiency.recentResults.filter(
      (r) => r.type === inferenceType,
    );

    const edgeMetrics = metrics.filter((m) => m.layer === "edge");
    const cloudMetrics = metrics.filter((m) => m.layer === "cloud");

    const edgeAvgLatency =
      edgeMetrics.length > 0
        ? edgeMetrics.reduce((sum, m) => sum + m.processingTimeMs, 0) /
          edgeMetrics.length
        : Infinity;

    const cloudAvgLatency =
      cloudMetrics.length > 0
        ? cloudMetrics.reduce((sum, m) => sum + m.processingTimeMs, 0) /
          cloudMetrics.length
        : Infinity;

    const immersion = this.state.comparison.immersion;
    const isHighPerformance =
      immersion.metrics.fps >= immersion.config.performanceSettings.minFps;

    if (edgeAvgLatency < config.latencyTargetMs && isHighPerformance) {
      return {
        inferenceType,
        selectedLayer: "edge",
        reasoning: "Edge meets latency target and performance is sufficient",
        confidence: 0.9,
        fallbackLayer: "cloud",
      };
    }

    if (cloudAvgLatency < config.latencyTargetMs) {
      return {
        inferenceType,
        selectedLayer: "cloud",
        reasoning: "Cloud meets latency target, edge performance insufficient",
        confidence: 0.85,
        fallbackLayer: "edge",
      };
    }

    return {
      inferenceType,
      selectedLayer: config.layer,
      reasoning: "Using default configuration",
      confidence: 0.7,
      fallbackLayer: config.layer === "cloud" ? "edge" : "cloud",
    };
  }

  recordInferenceResult(result: InferenceResult): void {
    this.state.comparison.efficiency.recentResults.push(result);
    this.state.comparison.efficiency.recentResults =
      this.state.comparison.efficiency.recentResults.slice(-100);
    this.updateRecommendations();
    this.state.timestamp = new Date().toISOString();
  }

  updateImmersionMetrics(metrics: Partial<ImmersionMetrics>): void {
    this.state.comparison.immersion.metrics = {
      ...this.state.comparison.immersion.metrics,
      ...metrics,
    };
    this.updateRecommendations();
    this.state.timestamp = new Date().toISOString();
  }

  recordVoiceCommand(command: VoiceCommand): void {
    this.state.comparison.intelligence.commands.push(command);
    this.state.comparison.intelligence.commands =
      this.state.comparison.intelligence.commands.slice(-50);
    this.state.timestamp = new Date().toISOString();
  }

  getRecommendations(): Phase5State["recommendations"] {
    return [...this.state.recommendations];
  }

  private getDefaultComparison(): StrategyComparison {
    return {
      immersion: {
        config: {
          mode: "parallax_2d",
          enabled: true,
          hardwareCapabilities: {
            webxrSupported: false,
            vrSupported: false,
            arSupported: false,
            hasGyroscope: false,
            hasAccelerometer: false,
          },
          performanceSettings: {
            targetFps: 60,
            minFps: 30,
            dynamicQuality: true,
          },
        },
        metrics: {
          currentMode: "parallax_2d",
          fps: 60,
          renderTimeMs: 16.67,
          memoryUsageMb: 100,
          frameDropCount: 0,
          userEngagementScore: 0.5,
        },
        resourceCost: {
          cpuPercent: 10,
          gpuPercent: 15,
          memoryMb: 100,
          batteryDrainPercent: 2,
        },
      },
      efficiency: {
        inferenceConfigs: [
          {
            type: "regime",
            layer: "cloud",
            latencyTargetMs: 1000,
            batchSize: 1,
            retryPolicy: { maxRetries: 3, backoffMs: 1000 },
            cachePolicy: { enabled: true, ttlSeconds: 300 },
          },
          {
            type: "sentiment",
            layer: "edge",
            latencyTargetMs: 100,
            batchSize: 5,
            retryPolicy: { maxRetries: 2, backoffMs: 500 },
            cachePolicy: { enabled: true, ttlSeconds: 60 },
          },
          {
            type: "ui_reactivity",
            layer: "edge",
            latencyTargetMs: 50,
            batchSize: 10,
            retryPolicy: { maxRetries: 1, backoffMs: 100 },
            cachePolicy: { enabled: false, ttlSeconds: 0 },
          },
          {
            type: "market_data",
            layer: "edge",
            latencyTargetMs: 10,
            batchSize: 50,
            retryPolicy: { maxRetries: 1, backoffMs: 50 },
            cachePolicy: { enabled: true, ttlSeconds: 1 },
          },
        ],
        recentResults: [],
        resourceSavings: {
          latencySavedMs: 0,
          bandwidthSavedKb: 0,
          serverLoadReducedPercent: 0,
        },
      },
      intelligence: {
        voice: {
          enabled: false,
          speechRecognition: {
            language: "en-US",
            continuous: false,
            interimResults: true,
          },
          speechSynthesis: {
            voice: "default",
            rate: 1,
            pitch: 1,
            volume: 1,
          },
          autoReadPriority: ["critical"],
        },
        conversations: [],
        commands: [],
      },
    };
  }

  private getDefaultDecision(
    inferenceType: InferenceType,
  ): PlatformStrategyDecision {
    const defaultLayer: PlatformLayer = ["regime"].includes(inferenceType)
      ? "cloud"
      : "edge";
    return {
      inferenceType,
      selectedLayer: defaultLayer,
      reasoning: "No configuration found, using default",
      confidence: 0.5,
      fallbackLayer: defaultLayer === "cloud" ? "edge" : "cloud",
    };
  }

  private updateRecommendations(): void {
    const recommendations: Phase5State["recommendations"] = [];
    const { immersion, efficiency } = this.state.comparison;

    if (immersion.metrics.fps < immersion.config.performanceSettings.minFps) {
      recommendations.push({
        type: "immersion",
        priority: "high",
        action: "Reduce immersion complexity or switch to flat mode",
        reason: `FPS ${immersion.metrics.fps} below minimum ${immersion.config.performanceSettings.minFps}`,
        estimatedImpact: "+20 FPS, -30% CPU usage",
      });
    }

    const edgeRegimeLatency = this.getAverageLatency("regime", "edge");
    if (edgeRegimeLatency && edgeRegimeLatency > 500) {
      recommendations.push({
        type: "efficiency",
        priority: "high",
        action: "Move regime inference to cloud",
        reason: `Edge regime latency ${edgeRegimeLatency}ms exceeds acceptable threshold`,
        estimatedImpact: "-400ms latency, +5% server load",
      });
    }

    if (
      immersion.config.enabled &&
      !immersion.config.hardwareCapabilities.hasGyroscope
    ) {
      recommendations.push({
        type: "immersion",
        priority: "medium",
        action: "Disable gyroscope-based parallax",
        reason: "Hardware does not support gyroscope",
        estimatedImpact: "Better UX, reduced confusion",
      });
    }

    if (!efficiency.inferenceConfigs.some((c) => c.layer === "hybrid")) {
      recommendations.push({
        type: "efficiency",
        priority: "low",
        action: "Consider hybrid layer for mixed workloads",
        reason: "No hybrid configuration present",
        estimatedImpact: "More flexible resource allocation",
      });
    }

    this.state.recommendations = recommendations;
  }

  private getAverageLatency(
    type: InferenceType,
    layer: PlatformLayer,
  ): number | null {
    const results = this.state.comparison.efficiency.recentResults.filter(
      (r) => r.type === type && r.layer === layer,
    );
    if (results.length === 0) return null;
    return (
      results.reduce((sum, r) => sum + r.processingTimeMs, 0) / results.length
    );
  }
}
