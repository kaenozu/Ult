'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card } from '@/components/ui/card'
import { Eye, Calendar, TrendingUp, TrendingDown } from 'lucide-react'
import { motion } from 'framer-motion'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"

interface ScreenshotRecord {
    id: string
    filepath: string
    timestamp: string
    analysis_result: {
        verdict: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
        patterns: string[]
        visual_rationale: string
    }
}

interface DiaryGalleryProps {
    ticker: string
}

export default function DiaryGallery({ ticker }: DiaryGalleryProps) {
    const { data, isLoading } = useQuery<{ screenshots: ScreenshotRecord[] }>({
        queryKey: ['gallery', ticker],
        queryFn: async () => {
            const res = await fetch(`/api/v1/vision/gallery/${ticker}`)
            if (!res.ok) throw new Error('Failed to load gallery')
            return res.json()
        }
    })

    if (isLoading) return <div className="h-32 bg-white/5 animate-pulse rounded-lg" />
    if (!data || data.screenshots.length === 0) return null

    return (
        <Card className="p-4 bg-black/20 border-white/5">
            <h3 className="text-sm font-bold text-muted-foreground uppercase mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Screenshot Diary
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {data.screenshots.map((item) => (
                    <Dialog key={item.id}>
                        <DialogTrigger asChild>
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className="group cursor-pointer relative aspect-video bg-gray-900 rounded-lg overflow-hidden border border-white/10"
                            >
                                <img
                                    src={`/api/v1/vision/image/${item.filepath}`}
                                    alt="Analysis"
                                    className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity"
                                />
                                <div className="absolute top-2 right-2">
                                    {item.analysis_result.verdict === 'BULLISH' && <TrendingUp className="w-4 h-4 text-emerald-400 drop-shadow-md" />}
                                    {item.analysis_result.verdict === 'BEARISH' && <TrendingDown className="w-4 h-4 text-red-400 drop-shadow-md" />}
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90 to-transparent">
                                    <span className="text-[10px] text-gray-400 font-mono">
                                        {new Date(item.timestamp).toLocaleDateString()}
                                    </span>
                                </div>
                            </motion.div>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl bg-gray-900/95 border-white/10 backdrop-blur-xl">
                            <DialogHeader>
                                <DialogTitle className="font-mono flex items-center gap-2">
                                    {item.analysis_result.verdict}
                                    <span className="text-muted-foreground text-sm font-normal">
                                        ({new Date(item.timestamp).toLocaleString()})
                                    </span>
                                </DialogTitle>
                            </DialogHeader>
                            <div className="grid md:grid-cols-2 gap-6 mt-4">
                                <div className="relative aspect-video bg-black rounded border border-white/10 overflow-hidden">
                                    <img
                                        src={`/api/v1/vision/image/${item.filepath}`}
                                        alt="Full Analysis"
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                                <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                                    <div>
                                        <h4 className="text-xs uppercase text-muted-foreground mb-1">Rationale</h4>
                                        <p className="text-sm text-gray-300 leading-relaxed">
                                            {item.analysis_result.visual_rationale}
                                        </p>
                                    </div>
                                    <div>
                                        <h4 className="text-xs uppercase text-muted-foreground mb-1">Patterns</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {item.analysis_result.patterns.map((p, i) => (
                                                <span key={i} className="px-2 py-1 text-xs bg-white/5 border border-white/10 rounded">
                                                    {p}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                ))}
            </div>
        </Card>
    )
}
