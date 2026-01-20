'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { Cpu, Zap, Brain, AlertCircle, RefreshCw } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { motion, AnimatePresence } from 'framer-motion'

interface NewsItem {
    headline: string
    source: string
    datetime: number
}

interface AnalyzedNews extends NewsItem {
    sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'
    score: number
}

interface WorkerProgress {
    status: string
    file?: string
    progress?: number
}

export default function EdgeNewsRefinery() {
    const [news, setNews] = useState<NewsItem[]>([])
    const [analyzed, setAnalyzed] = useState<AnalyzedNews[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [workerProgress, setWorkerProgress] = useState<WorkerProgress | null>(null)
    const [error, setError] = useState<string | null>(null)
    const workerRef = useRef<Worker | null>(null)

    // Fetch News (from backend or mock)
    const fetchNews = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            // Mock news for demo (in production, fetch from Finnhub/AlphaVantage)
            const mockNews: NewsItem[] = [
                { headline: "NVIDIA reports record earnings, beats expectations", source: "Reuters", datetime: Date.now() },
                { headline: "Fed signals potential rate hike concerns", source: "CNBC", datetime: Date.now() - 3600000 },
                { headline: "Apple announces new product line", source: "Bloomberg", datetime: Date.now() - 7200000 },
                { headline: "Global chip shortage continues to impact manufacturers", source: "WSJ", datetime: Date.now() - 10800000 },
                { headline: "Tesla faces production delays in key markets", source: "FT", datetime: Date.now() - 14400000 },
            ]
            setNews(mockNews)
            setAnalyzed([]) // Clear previous analysis
        } catch (e: any) {
            setError(e.message)
        } finally {
            setIsLoading(false)
        }
    }, [])

    // Initialize Worker
    useEffect(() => {
        fetchNews()

        // Create worker
        workerRef.current = new Worker(
            new URL('@/components/features/edge/sentiment.worker.ts', import.meta.url),
            { type: 'module' }
        )

        // Listen for messages
        workerRef.current.onmessage = (event) => {
            const { status, result, data, error: workerError } = event.data

            if (status === 'progress') {
                setWorkerProgress(data)
            } else if (status === 'complete') {
                // Process result
                const label = result[0]?.label || 'NEUTRAL'
                const score = result[0]?.score || 0.5

                setAnalyzed(prev => {
                    const newItem: AnalyzedNews = {
                        headline: prev.length < news.length ? news[prev.length].headline : '',
                        source: prev.length < news.length ? news[prev.length].source : '',
                        datetime: prev.length < news.length ? news[prev.length].datetime : Date.now(),
                        sentiment: label.toUpperCase() === 'POSITIVE' ? 'POSITIVE' : 'NEGATIVE',
                        score: score
                    }
                    return [...prev, newItem]
                })
            } else if (status === 'error') {
                setError(workerError)
                setIsAnalyzing(false)
            }
        }

        return () => {
            workerRef.current?.terminate()
        }
    }, [fetchNews])

    // Analyze all news sequentially
    const analyzeNews = useCallback(async () => {
        if (!workerRef.current || news.length === 0) return

        setIsAnalyzing(true)
        setAnalyzed([])
        setWorkerProgress(null)

        for (const item of news) {
            workerRef.current.postMessage({ text: item.headline })
            // Wait a bit for sequential processing to finish before sending next
            // This is a simple approach; a queue would be better for production
            await new Promise(resolve => setTimeout(resolve, 500))
        }

        // Wait for all to complete
        await new Promise(resolve => setTimeout(resolve, 2000))
        setIsAnalyzing(false)
        setWorkerProgress(null)
    }, [news])

    const getSentimentColor = (sentiment: string) => {
        switch (sentiment) {
            case 'POSITIVE': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
            case 'NEGATIVE': return 'text-red-400 bg-red-500/10 border-red-500/30'
            default: return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
        }
    }

    return (
        <Card className="p-6 bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/20">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="bg-purple-500/10 p-2 rounded-lg border border-purple-500/20">
                        <Brain className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold uppercase tracking-widest text-purple-400">
                            Edge News Refinery
                        </h3>
                        <span className="text-xs text-purple-400/60 font-mono">
                            CLIENT-SIDE AI • ZERO LATENCY
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchNews}
                        disabled={isLoading}
                        className="gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button
                        size="sm"
                        onClick={analyzeNews}
                        disabled={isAnalyzing || news.length === 0}
                        className="gap-2 bg-purple-500 hover:bg-purple-600"
                    >
                        <Zap className="w-4 h-4" />
                        {isAnalyzing ? 'Analyzing...' : 'Analyze (Edge)'}
                    </Button>
                </div>
            </div>

            {/* Worker Progress */}
            <AnimatePresence>
                {workerProgress && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-4 p-3 bg-black/40 rounded-lg border border-purple-500/20"
                    >
                        <div className="flex items-center gap-2 text-xs text-purple-300 mb-2">
                            <Cpu className="w-4 h-4 animate-pulse" />
                            <span className="font-mono">{workerProgress.status}</span>
                            {workerProgress.file && (
                                <span className="text-purple-400/60">({workerProgress.file})</span>
                            )}
                        </div>
                        {workerProgress.progress !== undefined && (
                            <Progress value={workerProgress.progress * 100} className="h-1" />
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Error Display */}
            {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}

            {/* News List */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {news.map((item, i) => {
                    const result = analyzed[i]
                    return (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/5 hover:border-purple-500/30 transition-colors"
                        >
                            <div className="flex-1 min-w-0 mr-4">
                                <p className="text-sm text-white truncate">{item.headline}</p>
                                <span className="text-[10px] text-muted-foreground font-mono">{item.source}</span>
                            </div>

                            {result ? (
                                <div className={`px-3 py-1 rounded border text-xs font-bold ${getSentimentColor(result.sentiment)}`}>
                                    {result.sentiment} ({(result.score * 100).toFixed(0)}%)
                                </div>
                            ) : isAnalyzing ? (
                                <div className="w-20 h-6 bg-white/5 rounded animate-pulse" />
                            ) : (
                                <div className="text-xs text-muted-foreground font-mono">PENDING</div>
                            )}
                        </motion.div>
                    )
                })}
            </div>

            {/* Stats Footer */}
            {analyzed.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-3 gap-4 text-center">
                    <div>
                        <div className="text-2xl font-bold text-emerald-400">
                            {analyzed.filter(a => a.sentiment === 'POSITIVE').length}
                        </div>
                        <div className="text-[10px] text-muted-foreground uppercase">Bullish</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-red-400">
                            {analyzed.filter(a => a.sentiment === 'NEGATIVE').length}
                        </div>
                        <div className="text-[10px] text-muted-foreground uppercase">Bearish</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-purple-400">
                            {((analyzed.filter(a => a.sentiment === 'POSITIVE').length / analyzed.length) * 100).toFixed(0)}%
                        </div>
                        <div className="text-[10px] text-muted-foreground uppercase">Sentiment</div>
                    </div>
                </div>
            )}
        </Card>
    )
}
