'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  BrainCircuit,
  Zap,
  ShieldCheck,
  ShieldAlert,
  TriangleAlert,
  Terminal,
} from 'lucide-react';
import {
  AgentActivityMessage,
  CircuitBreakerStatusMessage,
  CircuitBreakerTrippedMessage,
  ApprovalRequestMessage,
  ApprovalResponseMessage,
  MessageFactory,
  ApprovalStatus,
  ApprovalRequestPayload,
} from '@/components/shared/websocket';
import { useSynapse } from '@/components/shared/hooks/connection';
import { ApprovalToast } from './ApprovalToast';

// ============================================================================
// TYPES
// ============================================================================

interface LogEntry {
  id: string;
  timestamp: string;
  type: 'THOUGHT' | 'ACTION';
  content: any;
}

// ============================================================================
// COMPONENTS
// ============================================================================

const SafetyHeader = ({
  status,
}: {
  status: 'SAFE' | 'TRIPPED' | 'UNKNOWN';
}) => {
  return (
    <div
      className={`flex items-center justify-between px-4 py-2 border-b-2 font-mono text-sm uppercase tracking-widest ${
        status === 'SAFE'
          ? 'border-emerald-500/50 bg-emerald-950/20 text-emerald-400'
          : status === 'TRIPPED'
            ? 'border-red-500/50 bg-red-950/20 text-red-400 animate-pulse'
            : 'border-gray-500/50 bg-gray-900 text-gray-400'
      }`}
    >
      <div className='flex items-center gap-2'>
        {status === 'SAFE' && <ShieldCheck className='w-4 h-4' />}
        {status === 'TRIPPED' && <ShieldAlert className='w-4 h-4' />}
        {status === 'UNKNOWN' && <Activity className='w-4 h-4' />}
        <span>SYSTEM STATUS: {status}</span>
      </div>
      <div className='flex items-center gap-4'>
        <span>NEURAL_ENGINE: ONLINE</span>
        <span>LATENCY: 12ms</span>
      </div>
    </div>
  );
};

const ThoughtLogItem = ({ entry }: { entry: LogEntry }) => {
  const isAction = entry.type === 'ACTION';
  return (
    <div className='py-1 px-2 font-mono text-xs border-l-2 border-slate-700/50 hover:bg-slate-800/30 transition-colors'>
      <span className='text-slate-500 mr-2'>
        [
        {new Date(entry.timestamp).toLocaleTimeString([], {
          hour12: false,
          fractionalSecondDigits: 3,
        })}
        ]
      </span>
      <span className={isAction ? 'text-pink-400 font-bold' : 'text-cyan-400'}>
        {entry.type}
      </span>
      <span className='text-slate-400 mx-2'>::</span>
      <span className='text-slate-300'>
        {isAction
          ? `${entry.content.type} ${entry.content.ticker} (Conf: ${entry.content.confidence})`
          : entry.content.content}
      </span>
      {entry.content.risk_score !== undefined && (
        <span className='ml-2 text-yellow-500/80 text-[10px]'>
          [RISK: {entry.content.risk_score}]
        </span>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function NeuralMonitor() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [actions, setActions] = useState<LogEntry[]>([]);
  const [safetyStatus, setSafetyStatus] = useState<
    'SAFE' | 'TRIPPED' | 'UNKNOWN'
  >('UNKNOWN');
  const [approvalRequest, setApprovalRequest] =
    useState<ApprovalRequestPayload | null>(null);
  const virtuosoRef = useRef<VirtuosoHandle>(null);

  // Single WebSocket Connection
  const { onMessage, send } = useSynapse({
    url: 'ws://localhost:8000/ws/synapse',
    userId: 'dashboard-user',
  });

  // Subscriptions
  useEffect(() => {
    // Agent Activity
    onMessage<AgentActivityMessage>('agent_activity', msg => {
      const entry: LogEntry = {
        id: msg.msg_id,
        timestamp: msg.payload.timestamp,
        type: msg.payload.activity_type,
        content: msg.payload.content,
      };

      setLogs(prev => [...prev, entry]);

      // Auto-scroll
      if (virtuosoRef.current) {
        virtuosoRef.current.scrollToIndex({
          index: logs.length,
          align: 'end',
          behavior: 'auto',
        });
      }

      if (entry.type === 'ACTION') {
        setActions(prev => [entry, ...prev].slice(0, 10));
      }
    });

    // Circuit Breaker
    onMessage<CircuitBreakerStatusMessage>('circuit_breaker_status', msg => {
      setSafetyStatus(msg.payload.state === 'open' ? 'TRIPPED' : 'SAFE');
    });
    onMessage<CircuitBreakerTrippedMessage>('circuit_breaker_tripped', msg => {
      setSafetyStatus('TRIPPED');
    });

    // Approvals
    onMessage<ApprovalRequestMessage>('approval_request', msg => {
      console.log('Approval Request Received:', msg.payload);
      setApprovalRequest(msg.payload);
    });

    onMessage<ApprovalResponseMessage>('approval_response', msg => {
      // If another client responded, clear our prompt
      if (
        approvalRequest &&
        msg.payload.request_id === approvalRequest.request_id
      ) {
        setApprovalRequest(null);
      }
    });
  }, [onMessage, logs.length, approvalRequest]); // Check deps

  const handleApprove = (requestId: string) => {
    if (!approvalRequest) return;
    const msg = MessageFactory.approvalResponse(
      requestId,
      ApprovalStatus.APPROVED,
      'User-Dashboard'
    );
    send(msg);
    setApprovalRequest(null);
  };

  const handleReject = (requestId: string) => {
    if (!approvalRequest) return;
    const msg = MessageFactory.approvalResponse(
      requestId,
      ApprovalStatus.REJECTED,
      'User-Dashboard'
    );
    send(msg);
    setApprovalRequest(null);
  };

  return (
    <div className='w-full h-[600px] bg-slate-950 border border-slate-800 rounded-lg overflow-hidden flex flex-col shadow-2xl shadow-cyan-900/10'>
      {/* HEADER */}
      <SafetyHeader status={safetyStatus} />

      {/* BODY */}
      <div className='flex-1 grid grid-cols-12 overflow-hidden'>
        {/* LEFT: THOUGHT STREAM (Console) */}
        <div className='col-span-8 border-r border-slate-800 flex flex-col bg-black/40'>
          <div className='px-3 py-1 bg-slate-900 text-slate-500 text-xs font-mono flex items-center gap-2 border-b border-slate-800'>
            <Terminal className='w-3 h-3' />
            <span>NEURAL_LOG_STREAM</span>
            <div className='ml-auto w-2 h-2 rounded-full bg-cyan-500 animate-pulse' />
          </div>
          <div className='flex-1 p-2'>
            <Virtuoso
              ref={virtuosoRef}
              data={logs}
              followOutput='auto'
              itemContent={(index, entry) => <ThoughtLogItem entry={entry} />}
              className='h-full scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent'
            />
          </div>
        </div>

        {/* RIGHT: ACTION FEED & STATUS */}
        <div className='col-span-4 flex flex-col bg-slate-900/30'>
          {/* ACTION FEED */}
          <div className='flex-1 flex flex-col border-b border-slate-800'>
            <div className='px-3 py-1 bg-slate-900 text-slate-500 text-xs font-mono flex items-center gap-2 border-b border-slate-800'>
              <Zap className='w-3 h-3 text-pink-500' />
              <span>ACTION_QUEUE</span>
            </div>
            <div className='flex-1 p-2 overflow-y-auto space-y-2'>
              <AnimatePresence>
                {actions.map(action => (
                  <motion.div
                    key={action.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className='p-2 rounded bg-slate-800/50 border border-pink-500/20'
                  >
                    <div className='flex justify-between items-center mb-1'>
                      <span
                        className={`text-xs font-bold px-1 rounded ${
                          action.content.type === 'BUY'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : action.content.type === 'SELL'
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {action.content.type}
                      </span>
                      <span className='text-xs font-mono text-slate-400'>
                        {action.content.ticker}
                      </span>
                    </div>
                    <div className='text-[10px] text-slate-500 truncate'>
                      {action.content.reason}
                    </div>
                  </motion.div>
                ))}
                {actions.length === 0 && (
                  <div className='text-center text-slate-600 text-xs py-10 italic'>
                    Waiting for agent actions...
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* MOCK BRAIN VISUAL (Placeholder for WebGL) */}
          <div className='h-1/3 flex items-center justify-center bg-slate-950 relative overflow-hidden'>
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
            <div className='animate-pulse relative'>
              <BrainCircuit className='w-16 h-16 text-cyan-600/50' />
              <div className='absolute inset-0 blur-xl bg-cyan-500/20' />
            </div>
            <div className='absolute bottom-2 right-2 text-[10px] text-slate-600 font-mono'>
              CORTEX_LOAD: 34%
            </div>
          </div>
        </div>
      </div>

      {/* OVERLAY: APPROVAL TOAST */}
      <AnimatePresence>
        {approvalRequest && (
          <ApprovalToast
            request={approvalRequest}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
