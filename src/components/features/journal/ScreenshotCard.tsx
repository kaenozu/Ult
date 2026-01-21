"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize2, X, TrendingUp, TrendingDown, Clock, Activity } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger, DialogClose } from '@/components/ui/dialog';

interface ScreenshotRecord {
    id: string;
    ticker: string;
    filepath: string;
    timestamp: string;
    analysis_result: {
        sentiment_score?: number;
        sentiment_label?: string;
        summary?: string;
        technical_signals?: string[];
    };
    created_at: string;
}

interface ScreenshotCardProps {
    record: ScreenshotRecord;
}

export const ScreenshotCard = ({ record }: ScreenshotCardProps) => {
    const isWin = (record.analysis_result.sentiment_score || 0) > 0.6; // Mock win/loss logic based on sentiment for now
    const isLoss = (record.analysis_result.sentiment_score || 0) < 0.4;

    // Construct valid image URL
    // Assuming backend serves static files or we have an endpoint. 
    // Backend path is 'backend/data/screenshots/...', we need a way to serve this.
    // For now, let's assume we'll create an API route to serve image by ID or use a static folder if configured.
    // Actually, Next.js doesn't serve from backend/data by default.
    // We'll likely need an API route: /api/v1/journal/image/{id}
    const imageUrl = `/api/v1/journal/image/${record.id}`;

    const borderColor = isWin ? 'border-emerald-500/50' : isLoss ? 'border-rose-500/50' : 'border-white/10';
    const glowColor = isWin ? 'shadow-[0_0_15px_rgba(16,185,129,0.2)]' : isLoss ? 'shadow-[0_0_15px_rgba(244,63,94,0.2)]' : '';

    return (
        <Dialog>
            <DialogTrigger asChild>
                <motion.div
                    layoutId={`card-${record.id}`}
                    whileHover={{ scale: 1.02, y: -2 }}
                    className={`relative aspect-video rounded-xl border ${borderColor} bg-black/40 overflow-hidden cursor-pointer group ${glowColor} transition-all duration-300`}
                >
                    {/* Image Thumbnail */}
                    <img
                        src={imageUrl}
                        alt={`Trade on ${record.ticker}`}
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                        loading="lazy"
                    />

                    {/* Overlay Info */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent p-4 flex flex-col justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="flex justify-between items-end">
                            <div>
                                <h4 className="font-bold text-white font-mono">{record.ticker}</h4>
                                <div className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {new Date(record.timestamp).toLocaleDateString()}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {isWin && <TrendingUp className="w-5 h-5 text-emerald-400" />}
                                {isLoss && <TrendingDown className="w-5 h-5 text-rose-400" />}
                            </div>
                        </div>
                    </div>

                    {/* Quick Status Badge */}
                    <div className="absolute top-2 right-2">
                        {isWin && <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />}
                        {isLoss && <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e]" />}
                    </div>
                </motion.div>
            </DialogTrigger>

            <DialogContent className="max-w-5xl bg-black/95 border-white/10 p-0 overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-3 h-[80vh]">
                    {/* Main Image */}
                    <div className="md:col-span-2 bg-black flex items-center justify-center p-4 relative">
                        <img
                            src={imageUrl}
                            alt={`Trade Detail ${record.ticker}`}
                            className="max-w-full max-h-full object-contain"
                        />
                        <div className="absolute bottom-4 left-4 text-xs font-mono text-white/50 bg-black/50 px-2 py-1 rounded">
                            ID: {record.id.slice(0, 8)}...
                        </div>
                    </div>

                    {/* Details Sidebar */}
                    <div className="border-l border-white/10 p-6 flex flex-col gap-6 overflow-y-auto">
                        <div>
                            <h2 className="text-2xl font-bold text-white font-mono tracking-wider mb-1">{record.ticker}</h2>
                            <p className="text-sm text-gray-400 border-b border-white/10 pb-4">
                                {new Date(record.timestamp).toLocaleString()}
                            </p>
                        </div>

                        {/* Analysis Section */}
                        {record.analysis_result && (
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                                    <Activity className="w-4 h-4" /> Neural Analysis
                                </h3>

                                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                                    <div className="bg-white/5 p-2 rounded">
                                        <span className="text-gray-500 block">Sentiment</span>
                                        <span className={isWin ? 'text-emerald-400' : 'text-rose-400'}>
                                            {(record.analysis_result.sentiment_score || 0.5).toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="bg-white/5 p-2 rounded">
                                        <span className="text-gray-500 block">Label</span>
                                        <span className="text-white">
                                            {record.analysis_result.sentiment_label || 'NEUTRAL'}
                                        </span>
                                    </div>
                                </div>

                                {record.analysis_result.summary && (
                                    <div className="bg-white/5 p-3 rounded text-sm text-gray-300 leading-relaxed italic border-l-2 border-cyan-500/50">
                                        "{record.analysis_result.summary}"
                                    </div>
                                )}

                                {record.analysis_result.technical_signals && (
                                    <div className="flex flex-wrap gap-2">
                                        {record.analysis_result.technical_signals.map((signal: string, i: number) => (
                                            <span key={i} className="text-[10px] border border-white/20 px-2 py-1 rounded-full text-gray-400">
                                                {signal}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="mt-auto pt-8">
                            <button className="w-full py-3 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg transition-colors font-mono uppercase text-xs tracking-widest">
                                Replay Context
                            </button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
