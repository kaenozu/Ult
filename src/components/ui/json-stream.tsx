"use client";

import React, { useState, useEffect, useRef } from "react";
import { GlitchText } from "./glitch-text";

interface JSONStreamProps {
  data: any;
  speed?: number;
  maxLines?: number;
  className?: string;
}

export const JSONStream: React.FC<JSONStreamProps> = ({
  data,
  speed = 100,
  maxLines = 20,
  className = "",
}) => {
  const [streamLines, setStreamLines] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const generateStreamData = () => {
    const timestamp = new Date().toISOString();
    const neuralActivity = {
      timestamp,
      signal: Math.random().toFixed(4),
      prediction: (Math.random() * 100).toFixed(2),
      confidence: Math.random().toFixed(3),
      neurons: Math.floor(Math.random() * 1000) + 100,
      synapses: Math.floor(Math.random() * 10000) + 1000,
      processing_time: `${Math.random() * 50}ms`,
      anomaly: Math.random() > 0.9,
      status: ["ACTIVE", "PROCESSING", "ANALYZING", "OPTIMIZING"][
        Math.floor(Math.random() * 4)
      ],
    };

    return JSON.stringify(neuralActivity, null, 2);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const newData = generateStreamData();
      const lines = newData.split("\n");

      setStreamLines((prevLines) => {
        const updatedLines = [...prevLines, ...lines];
        return updatedLines.slice(-maxLines);
      });

      setCurrentIndex((prev) => prev + 1);
    }, speed);

    return () => clearInterval(interval);
  }, [speed, maxLines]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [streamLines]);

  return (
    <div
      className={`relative bg-black border border-cyan-500/30 rounded-lg overflow-hidden ${className}`}
    >
      <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-cyan-500/20 to-transparent h-1 z-10" />

      <div className="p-2 font-mono text-xs">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <GlitchText text="NEURAL_MONITOR" className="text-cyan-400 text-xs" />
        </div>

        <div
          ref={containerRef}
          className="h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-500/20 scrollbar-track-transparent"
        >
          <pre className="text-green-400 leading-relaxed">
            {streamLines.map((line, index) => (
              <div
                key={`${currentIndex}-${index}`}
                className="animate-fade-in opacity-80 hover:opacity-100 transition-opacity"
                style={{
                  textShadow:
                    index === streamLines.length - 1
                      ? "0 0 5px rgba(0, 255, 0, 0.8)"
                      : "none",
                  color: line.includes("true")
                    ? "#ff00ff"
                    : line.includes("false")
                      ? "#00ffff"
                      : line.includes('"status"')
                        ? "#ffff00"
                        : "#00ff00",
                }}
              >
                {line || " "}
              </div>
            ))}
          </pre>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <GlitchText
            text={`STREAM_ACTIVE: ${currentIndex}`}
            className="text-cyan-400"
          />
          <div className="text-green-400 animate-pulse">▶ LIVE</div>
        </div>
      </div>

      <div className="absolute inset-0 pointer-events-none">
        <div className="scanlines" />
      </div>
    </div>
  );
};

export default JSONStream;
