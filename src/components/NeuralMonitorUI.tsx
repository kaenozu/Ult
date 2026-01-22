'use client';

import React, { useState, useEffect } from 'react';
import { TrafficLight } from './TrafficLight';
import { CircuitBreakerStatus } from './CircuitBreakerStatus';
import { MetricsGrid } from './MetricsGrid';
import { DangerWarning } from './DangerWarning';

type SafetyLevel = 'safe' | 'caution' | 'danger';
type CircuitBreakerState = 'closed' | 'open' | 'half_open';

interface NeuralMonitorState {
  circuitBreaker: {
    status: CircuitBreakerState;
    lastTripped: string | null;
    tripCount: number;
    healthScore: number;
  };
  safetyLevel: SafetyLevel;
  isDangerous: boolean;
  metrics: {
    responseTime: number;
    errorRate: number;
    throughput: number;
    cpuUsage: number;
    memoryUsage: number;
  };
}

const NeuralMonitorUI: React.FC = () => {
  const [monitorState, setMonitorState] = useState<NeuralMonitorState>({
    circuitBreaker: {
      status: 'closed',
      lastTripped: null,
      tripCount: 0,
      healthScore: 98,
    },
    safetyLevel: 'safe',
    isDangerous: false,
    metrics: {
      responseTime: 45,
      errorRate: 0.2,
      throughput: 1250,
      cpuUsage: 34,
      memoryUsage: 62,
    },
  });

  const [warningPulse, setWarningPulse] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (monitorState.isDangerous) {
      interval = setInterval(() => {
        setWarningPulse(prev => !prev);
      }, 500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [monitorState.isDangerous]);

  const getTrafficLightColor = (level: SafetyLevel): string => {
    switch (level) {
      case 'safe':
        return '#22c55e';
      case 'caution':
        return '#eab308';
      case 'danger':
        return '#ef4444';
      default:
        return '#22c55e';
    }
  };

  const renderCircuitBreakerStatus = () => (
    <div
      style={{
        background: 'linear-gradient(135deg, #1e1e3f 0%, #0d0d1a 100%)',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background:
              monitorState.circuitBreaker.status === 'closed'
                ? '#22c55e'
                : monitorState.circuitBreaker.status === 'open'
                  ? '#ef4444'
                  : '#eab308',
            boxShadow:
              monitorState.circuitBreaker.status === 'closed'
                ? '0 0 10px #22c55e'
                : '0 0 10px #ef4444',
          }}
        />
        <h2
          style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: 700,
            color: '#ffffff',
          }}
        >
          CIRCUIT BREAKER STATUS
        </h2>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '16px',
        }}
      >
        <div
          style={{
            background: 'rgba(255,255,255,0.03)',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              color: '#888',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '8px',
            }}
          >
            State
          </div>
          <div
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color:
                monitorState.circuitBreaker.status === 'closed'
                  ? '#22c55e'
                  : monitorState.circuitBreaker.status === 'open'
                    ? '#ef4444'
                    : '#eab308',
              textTransform: 'uppercase',
            }}
          >
            {monitorState.circuitBreaker.status.replace('_', ' ')}
          </div>
        </div>

        <div
          style={{
            background: 'rgba(255,255,255,0.03)',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              color: '#888',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '8px',
            }}
          >
            Health Score
          </div>
          <div
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#ffffff',
            }}
          >
            {monitorState.circuitBreaker.healthScore}%
          </div>
        </div>

        <div
          style={{
            background: 'rgba(255,255,255,0.03)',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              color: '#888',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '8px',
            }}
          >
            Trip Count
          </div>
          <div
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#ffffff',
            }}
          >
            {monitorState.circuitBreaker.tripCount}
          </div>
        </div>

        <div
          style={{
            background: 'rgba(255,255,255,0.03)',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              color: '#888',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '8px',
            }}
          >
            Last Tripped
          </div>
          <div
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: '#ffffff',
            }}
          >
            {monitorState.circuitBreaker.lastTripped || 'Never'}
          </div>
        </div>
      </div>

      <div className="mt-5 h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-green-500 to-green-600 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${monitorState.circuitBreaker.healthScore}%` }}
        />
      </div>
    </div>
  );

  const renderMetricsGrid = () => (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
      {[
        {
          label: 'Response Time',
          value: `${monitorState.metrics.responseTime}ms`,
          unit: 'ms',
          colorClass: 'text-blue-500',
        },
        {
          label: 'Error Rate',
          value: `${monitorState.metrics.errorRate}%`,
          unit: '%',
          colorClass: 'text-purple-500',
        },
        {
          label: 'Throughput',
          value: `${monitorState.metrics.throughput}`,
          unit: 'req/s',
          colorClass: 'text-cyan-500',
        },
        {
          label: 'CPU Usage',
          value: `${monitorState.metrics.cpuUsage}%`,
          unit: '%',
          colorClass: 'text-amber-500',
        },
        {
          label: 'Memory Usage',
          value: `${monitorState.metrics.memoryUsage}%`,
          unit: '%',
          colorClass: 'text-emerald-500',
        },
      ].map(metric => (
        <div
          key={metric.label}
          className="bg-white/5 p-5 rounded-xl border border-white/5"
        >
          <div className="text-xs text-gray-400 uppercase tracking-widest mb-2">
            {metric.label}
          </div>
          <div
            className={`text-2xl font-bold ${metric.colorClass}`}
          >
            {metric.value}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {metric.unit}
          </div>
        </div>
      ))}
    </div>
  );

  const renderDangerWarning = () => {
    if (!monitorState.isDangerous) return null;

    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(239, 68, 68, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 1000,
        }}
      >
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.9)',
            padding: '24px 48px',
            borderRadius: '16px',
            animation: warningPulse
              ? 'pulse 0.5s ease-in-out infinite'
              : 'none',
            boxShadow: '0 0 60px rgba(239, 68, 68, 0.5)',
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: '48px',
              fontWeight: 900,
              color: '#ffffff',
              textTransform: 'uppercase',
              letterSpacing: '4px',
              textShadow: '0 4px 8px rgba(0,0,0,0.3)',
            }}
          >
            ⚠️ WARNING ⚠️
          </h1>
          <p
            style={{
              margin: '16px 0 0 0',
              fontSize: '24px',
              fontWeight: 600,
              color: '#ffffff',
              textAlign: 'center',
            }}
          >
            DANGEROUS BOT DETECTED
          </p>
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0f0f1a 100%)',
        padding: '24px',
        position: 'relative',
      }}
    >
      <DangerWarning
        isDangerous={monitorState.isDangerous}
        warningPulse={warningPulse}
      />

      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '32px',
            paddingBottom: '24px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: '32px',
                fontWeight: 800,
                color: '#ffffff',
                letterSpacing: '-1px',
              }}
            >
              NeuralMonitor
            </h1>
            <p
              style={{
                margin: '8px 0 0 0',
                fontSize: '14px',
                color: '#888',
              }}
            >
              AI Safety Circuit Breaker System
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <TrafficLight safetyLevel={monitorState.safetyLevel} />
            <div
              style={{
                background: 'rgba(255,255,255,0.05)',
                padding: '12px 20px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  color: '#888',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}
              >
                System Status
              </div>
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: '#22c55e',
                }}
              >
                ● OPERATIONAL
              </div>
            </div>
          </div>
        </header>

        <main style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <section>
            <h2
              style={{
                margin: '0 0 16px 0',
                fontSize: '18px',
                fontWeight: 600,
                color: '#ffffff',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              Circuit Breaker Control
            </h2>
            <CircuitBreakerStatus
              circuitBreaker={monitorState.circuitBreaker}
            />
          </section>

          <section>
            <h2
              style={{
                margin: '0 0 16px 0',
                fontSize: '18px',
                fontWeight: 600,
                color: '#ffffff',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              System Metrics
            </h2>
            <MetricsGrid metrics={monitorState.metrics} />
          </section>

          <section
            style={{
              background: 'rgba(255,255,255,0.02)',
              borderRadius: '16px',
              padding: '24px',
              border: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <h2
              style={{
                margin: '0 0 16px 0',
                fontSize: '18px',
                fontWeight: 600,
                color: '#ffffff',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              Safety Protocols
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '16px',
              }}
            >
              {[
                {
                  title: 'Maximum Response Threshold',
                  status: 'active',
                  value: '500ms',
                  description: 'Auto-trigger circuit breaker if exceeded',
                },
                {
                  title: 'Error Rate Limit',
                  status: 'active',
                  value: '5%',
                  description: 'Shutdown on sustained error rate',
                },
                {
                  title: 'Safety Override',
                  status: 'ready',
                  value: 'MANUAL',
                  description: 'Emergency kill switch available',
                },
                {
                  title: 'Model Isolation',
                  status: 'active',
                  value: 'ENABLED',
                  description: 'Sandboxed model execution',
                },
              ].map(protocol => (
                <div
                  key={protocol.title}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '8px',
                    }}
                  >
                    <h3
                      style={{
                        margin: 0,
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#ffffff',
                      }}
                    >
                      {protocol.title}
                    </h3>
                    <span
                      style={{
                        fontSize: '12px',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        background:
                          protocol.status === 'active'
                            ? 'rgba(34, 197, 94, 0.2)'
                            : 'rgba(234, 179, 8, 0.2)',
                        color:
                          protocol.status === 'active' ? '#22c55e' : '#eab308',
                        fontWeight: 600,
                      }}
                    >
                      {protocol.status.toUpperCase()}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: '24px',
                      fontWeight: 700,
                      color: '#3b82f6',
                      marginBottom: '4px',
                    }}
                  >
                    {protocol.value}
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '12px',
                      color: '#888',
                    }}
                  >
                    {protocol.description}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>

      <style jsx global>{`
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.02);
          }
        }

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          font-family:
            -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
            'Helvetica Neue', Arial, sans-serif;
        }
      `}</style>
    </div>
  );
};

export default NeuralMonitorUI;
