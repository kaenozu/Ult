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
    if (monitorState.isDangerous) {
      const interval = setInterval(() => {
        setWarningPulse(prev => !prev);
      }, 500);
      return () => clearInterval(interval);
    }
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

      <div
        style={{
          marginTop: '20px',
          height: '8px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '4px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${monitorState.circuitBreaker.healthScore}%`,
            height: '100%',
            background: `linear-gradient(90deg, #22c55e, #16a34a)`,
            borderRadius: '4px',
            transition: 'width 0.5s ease',
          }}
        />
      </div>
    </div>
  );

  const renderMetricsGrid = () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
      }}
    >
      {[
        {
          label: 'Response Time',
          value: `${monitorState.metrics.responseTime}ms`,
          unit: 'ms',
          color: '#3b82f6',
        },
        {
          label: 'Error Rate',
          value: `${monitorState.metrics.errorRate}%`,
          unit: '%',
          color: '#8b5cf6',
        },
        {
          label: 'Throughput',
          value: `${monitorState.metrics.throughput}`,
          unit: 'req/s',
          color: '#06b6d4',
        },
        {
          label: 'CPU Usage',
          value: `${monitorState.metrics.cpuUsage}%`,
          unit: '%',
          color: '#f59e0b',
        },
        {
          label: 'Memory Usage',
          value: `${monitorState.metrics.memoryUsage}%`,
          unit: '%',
          color: '#10b981',
        },
      ].map(metric => (
        <div
          key={metric.label}
          style={{
            background: 'rgba(255,255,255,0.03)',
            padding: '20px',
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
            {metric.label}
          </div>
          <div
            style={{
              fontSize: '28px',
              fontWeight: 700,
              color: metric.color,
            }}
          >
            {metric.value}
          </div>
          <div
            style={{
              fontSize: '12px',
              color: '#666',
              marginTop: '4px',
            }}
          >
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
