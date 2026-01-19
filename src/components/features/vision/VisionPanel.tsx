'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Eye, CheckCircle, AlertTriangle, Activity, ScanLine, Save, Volume2, VolumeX } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useSpeech } from '@/hooks/useSpeech'

interface VisionPanelProps {
    isOpen: boolean
    onClose: () => void
    ticker: string
    image: string | null
}

interface VisionResult {
    patterns: string[]
    support: number
    resistance: number
    verdict: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
    visual_rationale: string
}

export default function VisionPanel({ isOpen, onClose, ticker, image }: VisionPanelProps) {
    const [data, setData] = useState<VisionResult | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    const { speak, stop, isSpeaking, isSupported } = useSpeech({ lang: 'ja-JP' })

    const handleSpeak = () => {
        if (!data) return
        if (isSpeaking) {
            stop()
        } else {
            const text = `分析結果は${data.verdict}です。${data.visual_rationale}`
            speak(text)
        }
    }

    useEffect(() => {
        if (isOpen && image) {
            analyzeImage()
            setSaved(false)
        }
    }, [isOpen, image]) // Re-run if image changes

    const analyzeImage = async () => {
        if (!image) return
        setLoading(true)
        setError(null)
        setData(null)

        try {
            const res = await fetch('/api/v1/vision/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ticker, image })
            })

            if (!res.ok) {
                throw new Error('Vision Analysis Failed')
            }

            const result = await res.json()
            setData(result)
        } catch (e: any) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        if (!data || !image) return
        setSaving(true)
        try {
            const res = await fetch('/api/v1/vision/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ticker,
                    image,
                    analysis: data
                })
            })
            if (!res.ok) throw new Error('Failed to save')
            setSaved(true)
        } catch (e) {
            console.error(e)
            alert('Failed to save to diary')
        } finally {
            setSaving(false)
        }
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop (invisible but blocks clicks? Or maybe just overlay on chart) */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md p-4 bg-background/90 border-l border-white/10 backdrop-blur-xl shadow-2xl overflow-y-auto"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <Eye className="w-5 h-5 text-purple-400" />
                                <h2 className="text-lg font-bold font-mono tracking-wider">VISION ANALYST</h2>
                            </div>
                            <Button variant="ghost" size="icon" onClick={onClose}>
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* Content Content */}
                        <div className="space-y-6">
                            {/* Thumbnail */}
                            {image && (
                                <div className="relative w-full aspect-[16/9] rounded-lg overflow-hidden border border-white/10 bg-black">
                                    <img src={image} alt="Chart Capture" className="object-contain w-full h-full opacity-50" />

                                    {/* Scanning Animation */}
                                    {loading && (
                                        <div className="absolute inset-0 z-10">
                                            <div className="absolute top-0 left-0 w-full h-[2px] bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.8)] animate-scan-y" />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <span className="px-3 py-1 bg-black/80 text-purple-400 text-xs font-mono animate-pulse">
                                                    SCANNING GEOMETRY...
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {loading && (
                                <div className="text-center py-8 space-y-4">
                                    <p className="text-sm text-muted-foreground animate-pulse">
                                        Interpreting visual patterns via Gemini 1.5 Flash...
                                    </p>
                                </div>
                            )}

                            {error && (
                                <Card className="p-4 border-red-500/50 bg-red-500/10 text-red-400">
                                    <div className="flex items-center gap-2 mb-2">
                                        <AlertTriangle className="w-4 h-4" />
                                        <span className="font-bold">Analysis Failed</span>
                                    </div>
                                    <p className="text-sm">{error}</p>
                                    <Button variant="outline" size="sm" className="mt-4" onClick={analyzeImage}>Retry</Button>
                                </Card>
                            )}

                            {/* Results */}
                            {data && !loading && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-4"
                                >
                                    {/* Verdict Card */}
                                    <Card className={`p-4 border ${data.verdict === 'BULLISH' ? 'border-emerald-500/50 bg-emerald-500/10' :
                                        data.verdict === 'BEARISH' ? 'border-red-500/50 bg-red-500/10' :
                                            'border-yellow-500/50 bg-yellow-500/10'
                                        }`}>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs uppercase opacity-70">Visual Verdict</span>
                                            {data.verdict === 'BULLISH' && <Activity className="w-5 h-5 text-emerald-400" />}
                                        </div>
                                        <div className={`text-3xl font-black tracking-tighter ${data.verdict === 'BULLISH' ? 'text-emerald-400' :
                                            data.verdict === 'BEARISH' ? 'text-red-400' :
                                                'text-yellow-400'
                                            }`}>
                                            {data.verdict}
                                        </div>
                                    </Card>

                                    {/* Levels */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                                            <span className="text-xs text-muted-foreground block mb-1">Support</span>
                                            <span className="text-lg font-mono font-bold text-white tabular-nums">
                                                ¥{data.support?.toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                                            <span className="text-xs text-muted-foreground block mb-1">Resistance</span>
                                            <span className="text-lg font-mono font-bold text-white tabular-nums">
                                                ¥{data.resistance?.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Patterns */}
                                    <div>
                                        <h3 className="text-xs font-bold uppercase text-muted-foreground mb-2 flex items-center gap-2">
                                            <ScanLine className="w-3 h-3" /> Detected Patterns
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {data.patterns?.map((p, i) => (
                                                <span key={i} className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded border border-purple-500/30">
                                                    {p}
                                                </span>
                                            ))}
                                            {(!data.patterns || data.patterns.length === 0) && (
                                                <span className="text-xs text-muted-foreground">No clear patterns detected</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Rationale */}
                                    <div className="bg-black/40 p-4 rounded-lg text-sm text-gray-300 leading-relaxed border border-white/5 text-pretty">
                                        {data.visual_rationale}
                                    </div>

                                    {/* Save Button */}
                                    <div className="flex gap-2">
                                        {isSupported && (
                                            <Button
                                                variant="outline"
                                                type="button"
                                                className={`gap-2 ${isSpeaking ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' : ''}`}
                                                onClick={handleSpeak}
                                                aria-label={isSpeaking ? '読み上げ停止' : '読み上げ開始'}
                                            >
                                                {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                                                {isSpeaking ? '停止' : '読み上げ'}
                                            </Button>
                                        )}
                                        <Button
                                            className={`flex-1 gap-2 ${saved ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : ''}`}
                                            variant={saved ? 'outline' : 'default'}
                                            onClick={handleSave}
                                            disabled={saving || saved}
                                        >
                                            {saved ? (
                                                <>
                                                    <CheckCircle className="w-4 h-4" />
                                                    Saved to Diary
                                                </>
                                            ) : (
                                                <>
                                                    <Save className="w-4 h-4" />
                                                    {saving ? 'Saving...' : 'Save to Diary'}
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
