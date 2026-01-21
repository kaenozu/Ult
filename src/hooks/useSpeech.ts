'use client'

import { useState, useEffect, useCallback } from 'react'

interface UseSpeechOptions {
    lang?: string
    rate?: number
    pitch?: number
    volume?: number
}

interface UseSpeechReturn {
    speak: (text: string) => void
    stop: () => void
    isSpeaking: boolean
    isSupported: boolean
    voices: SpeechSynthesisVoice[]
}

const defaultOptions: UseSpeechOptions = {
    lang: 'ja-JP',
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0,
}

/**
 * Custom hook for Web Speech API (Text-to-Speech)
 * @param options - Configuration options for speech synthesis
 * @returns Speech control functions and state
 */
export function useSpeech(options: UseSpeechOptions = {}): UseSpeechReturn {
    const [isSpeaking, setIsSpeaking] = useState(false)
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
    const [isSupported, setIsSupported] = useState(false)

    const config = { ...defaultOptions, ...options }

    // Initialize voices
    useEffect(() => {
        if (typeof window === 'undefined' || !window.speechSynthesis) {
            setIsSupported(false)
            return
        }

        setIsSupported(true)

        const loadVoices = () => {
            const availableVoices = speechSynthesis.getVoices()
            setVoices(availableVoices)
        }

        // Voices may not be available immediately
        loadVoices()
        speechSynthesis.onvoiceschanged = loadVoices

        return () => {
            speechSynthesis.onvoiceschanged = null
        }
    }, [])

    const speak = useCallback((text: string) => {
        if (!isSupported || !text) return

        // Cancel any ongoing speech
        speechSynthesis.cancel()

        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = config.lang!
        utterance.rate = config.rate!
        utterance.pitch = config.pitch!
        utterance.volume = config.volume!

        // Try to find a matching voice
        const langBase = config.lang!.split('-')[0] || 'ja'
        const preferredVoice = voices.find(v => v.lang.includes(langBase))
        if (preferredVoice) {
            utterance.voice = preferredVoice
        }

        utterance.onstart = () => setIsSpeaking(true)
        utterance.onend = () => setIsSpeaking(false)
        utterance.onerror = () => setIsSpeaking(false)

        speechSynthesis.speak(utterance)
    }, [isSupported, voices, config])

    const stop = useCallback(() => {
        if (!isSupported) return
        speechSynthesis.cancel()
        setIsSpeaking(false)
    }, [isSupported])

    return {
        speak,
        stop,
        isSpeaking,
        isSupported,
        voices,
    }
}
