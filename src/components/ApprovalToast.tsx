import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, CheckCircle, XCircle, Clock } from "lucide-react";
import { ApprovalRequestPayload, ApprovalType } from "@/components/shared/websocket";

interface ApprovalToastProps {
    request: ApprovalRequestPayload;
    onApprove: (requestId: string) => void;
    onReject: (requestId: string) => void;
}

const HOLD_DURATION = 1500; // 1.5s hold to confirm

export const ApprovalToast: React.FC<ApprovalToastProps> = ({
    request,
    onApprove,
    onReject,
}) => {
    const [progress, setProgress] = useState(0);
    const [isHolding, setIsHolding] = useState(false);
    const [timeLeft, setTimeLeft] = useState<number>(60);
    const holdIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number | null>(null);

    // Countdown Timer
    useEffect(() => {
        const expiresAt = new Date(request.expires_at).getTime();

        const interval = setInterval(() => {
            const now = Date.now();
            const left = Math.max(0, Math.ceil((expiresAt - now) / 1000));
            setTimeLeft(left);

            if (left <= 0) {
                onReject(request.request_id); // Auto reject
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [request.expires_at, request.request_id, onReject]);

    // Hold Logic
    useEffect(() => {
        if (isHolding) {
            const start = Date.now();
            startTimeRef.current = start;

            // Use RequestAnimation frame for smooth progress
            let rafId: number;
            const animate = () => {
                const elapsed = Date.now() - start;
                const p = Math.min(100, (elapsed / HOLD_DURATION) * 100);
                setProgress(p);

                if (p >= 100) {
                    setIsHolding(false);
                    onApprove(request.request_id);
                } else {
                    rafId = requestAnimationFrame(animate);
                }
            };
            rafId = requestAnimationFrame(animate);

            return () => cancelAnimationFrame(rafId);
        } else {
            setProgress(0);
        }
    }, [isHolding, onApprove, request.request_id]);

    const handleStartHold = () => setIsHolding(true);
    const handleEndHold = () => setIsHolding(false);

    return (
        <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="fixed bottom-8 right-8 z-50 w-96 bg-zinc-900/90 border-l-4 border-yellow-500 rounded-lg shadow-2xl backdrop-blur-md overflow-hidden"
        >
            {/* Progress Bar Background */}
            <div
                className="absolute top-0 left-0 h-full bg-yellow-500/10 pointer-events-none transition-all duration-75 ease-linear"
                style={{ width: `${progress}%` }}
            />

            <div className="p-4 relative">
                <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 text-yellow-500 font-bold font-mono">
                        <AlertTriangle size={18} />
                        {request.type.replace("_", " ").toUpperCase()}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-zinc-400 font-mono">
                        <Clock size={12} />
                        {timeLeft}s
                    </div>
                </div>

                <h3 className="text-white font-bold mb-1 text-lg leading-tight">
                    {request.title}
                </h3>
                <p className="text-zinc-400 text-sm mb-4 line-clamp-2">
                    {request.description}
                </p>

                {/* Context Data */}
                <div className="bg-black/40 p-2 rounded mb-4 text-xs font-mono text-zinc-300">
                    {Object.entries(request.context).map(([k, v]) => (
                        <div key={k} className="flex justify-between">
                            <span className="opacity-50">{k}:</span>
                            <span className="text-cyan-400">{String(v)}</span>
                        </div>
                    ))}
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => onReject(request.request_id)}
                        className="flex-1 py-3 px-4 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-sm transition-colors border border-zinc-700"
                    >
                        REJECT (ESC)
                    </button>

                    <button
                        onMouseDown={handleStartHold}
                        onMouseUp={handleEndHold}
                        onMouseLeave={handleEndHold}
                        onTouchStart={handleStartHold}
                        onTouchEnd={handleEndHold}
                        className="flex-[2] py-3 px-4 rounded bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-500 border border-yellow-600/50 font-bold text-sm transition-all relative overflow-hidden group select-none"
                    >
                        <span className="relative z-10 flex items-center justify-center gap-2">
                            {progress >= 100 ? <CheckCircle size={16} /> : "HOLD TO APPROVE"}
                        </span>
                        {/* Inner Progress Fill */}
                        <div
                            className="absolute left-0 top-0 h-full bg-yellow-500 transition-all duration-75 ease-linear opacity-20 group-hover:opacity-30"
                            style={{ width: `${progress}%` }}
                        />
                    </button>
                </div>
            </div>

            {/* Countdown Line */}
            <motion.div
                className="h-1 bg-yellow-500"
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 60, ease: "linear" }}
            />
        </motion.div>
    );
};
