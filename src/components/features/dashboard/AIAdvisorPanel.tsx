'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { BrainCircuit, AlertTriangle, CheckCircle, Scale, Volume2, VolumeX } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useSpeech } from '@/hooks/useSpeech'

interface Advice {
    title: string
    message: string
    action: string
    confidence: number
    rebalance_suggested: boolean
}

export default function AIAdvisorPanel() {
    const { speak, stop, isSpeaking, isSupported } = useSpeech({ lang: 'ja-JP' })

    const { data: advice, isLoading, refetch } = useQuery<Advice>({
        queryKey: ['advice'],
        queryFn: async () => {
            const res = await fetch('/api/v1/advice')
            if (!res.ok) throw new Error('Failed to fetch advice')
            return res.json()
        },
        refetchInterval: 30000 // Refresh advice every 30s
    })

    const handleSpeak = () => {
        if (!advice) return
        if (isSpeaking) {
            stop()
        } else {
            const text = `${advice.title}。${advice.message}。推奨アクションは${advice.action}です。`
            speak(text)
        }
    }

    const handleRebalance = async () => {
        if (!confirm('自動リバランスを実行しますか？ \n\n推奨ウェイト（均等配分）に基づき、即座に売買注文を生成・実行します。')) return

        try {
            const res = await fetch('/api/v1/rebalance', { method: 'POST' })
            if (res.ok) {
                const result = await res.json()
                alert(result.message)
                refetch() // Refresh advice
            } else {
                alert('リバランスに失敗しました。')
            }
        } catch (e) {
            console.error(e)
            alert('リバランス実行エラーが発生しました。')
        }
    }

    if (isLoading || !advice) {
        return <div className="animate-pulse h-32 bg-white/5 rounded-xl" />
    }

    const isRisk = advice.action === 'DEFENSE' || advice.action === 'SELL'
    const colorClass = isRisk ? 'text-red-400 border-red-500/50' : 'text-emerald-400 border-emerald-500/50'
    const bgClass = isRisk ? 'bg-red-500/10' : 'bg-emerald-500/10'

    return (
        <Card className={`p-4 border ${colorClass} ${bgClass} relative overflow-hidden backdrop-blur-md`}>
            <div className="absolute top-0 right-0 p-4 opacity-20">
                <BrainCircuit className={`w-12 h-12 ${isRisk ? 'text-red-500' : 'text-emerald-500'}`} />
            </div>

            <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center gap-2 mb-2">
                    {isRisk ? (
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                    ) : (
                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                    )}
                    <h3 className="font-mono text-sm font-bold tracking-widest uppercase">
                        {advice.title}
                    </h3>
                    <span className="text-[10px] bg-black/40 px-2 py-0.5 rounded text-white/70">
                        信頼度: {(advice.confidence * 100).toFixed(0)}%
                    </span>

                    {/* Divine Voice Button */}
                    {isSupported && (
                        <button
                            onClick={handleSpeak}
                            className={`ml-auto p-1.5 rounded-lg transition-all ${isSpeaking
                                    ? 'bg-cyan-500/20 text-cyan-400 animate-pulse'
                                    : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                                }`}
                            title={isSpeaking ? '停止' : '読み上げ'}
                        >
                            {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                        </button>
                    )}
                </div>

                {/* Message */}
                <p className="text-sm font-medium mb-4 pr-12 min-h-[3em]">
                    &quot;{advice.message}&quot;
                </p>

                {/* Action Bar */}
                <div className="flex items-center justify-between mt-2 border-t border-white/5 pt-2">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground uppercase">推奨アクション (Action)</span>
                        <span className={`text-xl font-black tracking-tighter ${isRisk ? 'text-red-400' : 'text-emerald-400'}`}>
                            {advice.action}
                        </span>
                    </div>

                    {advice.rebalance_suggested && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRebalance}
                            className="border-white/20 hover:bg-white/10 hover:text-white gap-2 transition-all"
                        >
                            <Scale className="w-4 h-4" />
                            自動リバランス
                        </Button>
                    )}
                </div>
            </div>
        </Card>
    )
}
