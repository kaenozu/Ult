"use client";

import React, { useEffect, useState } from "react";

interface GlitchTextProps {
  text: string;
  className?: string;
  intensity?: "low" | "medium" | "high" | "extreme";
  color?: "cyan" | "magenta" | "green" | "red" | "white";
}

export const GlitchText: React.FC<GlitchTextProps> = ({
  text,
  className = "",
  intensity = "medium",
  color = "cyan",
}) => {
  const [isGlitching, setIsGlitching] = useState(false);
  const [displayedText, setDisplayedText] = useState(text);
  const [layers, setLayers] = useState<
    { offset: number; color: string; opacity: number }[]
  >([]);

  const glitchDuration =
    intensity === "low"
      ? 80
      : intensity === "medium"
        ? 150
        : intensity === "high"
          ? 250
          : 400;
  const glitchFrequency =
    intensity === "low"
      ? 4000
      : intensity === "medium"
        ? 2500
        : intensity === "high"
          ? 1500
          : 800;

  const getGlitchColor = (baseColor: string) => {
    switch (baseColor) {
      case "cyan":
        return { primary: "#00ffff", secondary: "#ff00ff" };
      case "magenta":
        return { primary: "#ff00ff", secondary: "#00ffff" };
      case "green":
        return { primary: "#00ff00", secondary: "#ff0000" };
      case "red":
        return { primary: "#ff0000", secondary: "#00ffff" };
      case "white":
        return { primary: "#ffffff", secondary: "#00ffff" };
      default:
        return { primary: "#00ffff", secondary: "#ff00ff" };
    }
  };

  const colors = getGlitchColor(color);

  useEffect(() => {
    const interval = setInterval(
      () => {
        setIsGlitching(true);

        setTimeout(() => {
          const glitchChars = "!@#$%^&*()_+-=[]{}|;:,.<>?~`ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿ";
          let glitchedText = "";

          for (let i = 0; i < text.length; i++) {
            const shouldGlitch =
              intensity === "extreme"
                ? Math.random() > 0.4
                : intensity === "high"
                  ? Math.random() > 0.6
                  : Math.random() > 0.75;
            if (shouldGlitch) {
              glitchedText +=
                glitchChars[Math.floor(Math.random() * glitchChars.length)];
            } else {
              glitchedText += text[i];
            }
          }

          setDisplayedText(glitchedText);

          const newLayers = Array.from(
            { length: intensity === "extreme" ? 5 : 3 },
            () => ({
              offset: (Math.random() - 0.5) * 10,
              color: Math.random() > 0.5 ? colors.primary : colors.secondary,
              opacity: 0.3 + Math.random() * 0.5,
            }),
          );
          setLayers(newLayers);

          setTimeout(
            () => {
              setDisplayedText(text);
              setLayers([]);
              setIsGlitching(false);
            },
            50 + Math.random() * 100,
          );
        }, Math.random() * 80);
      },
      glitchFrequency + Math.random() * 1000,
    );

    return () => clearInterval(interval);
  }, [
    text,
    glitchFrequency,
    glitchDuration,
    colors.primary,
    colors.secondary,
    intensity,
  ]);

  return (
    <span
      className={`
        relative inline-block font-mono
        ${isGlitching ? "animate-pulse" : ""}
        ${className}
      `}
      style={{
        textShadow: isGlitching
          ? `
            2px 0 ${colors.primary}, -2px 0 ${colors.secondary},
            0 2px ${colors.primary}, 0 -2px ${colors.secondary},
            2px 2px ${colors.primary}, -2px -2px ${colors.secondary}
          `
          : `0 0 10px ${colors.primary}`,
        animation: isGlitching ? `glitch ${glitchDuration}ms infinite` : "none",
      }}
    >
      {displayedText}
      {isGlitching &&
        layers.map((layer, index) => (
          <span
            key={index}
            className="absolute top-0 left-0 pointer-events-none"
            style={{
              color: layer.color,
              opacity: layer.opacity,
              transform: `translate(${layer.offset}px, ${Math.random() > 0.5 ? 0 : 2}px)`,
              clipPath: `polygon(${Math.random() * 20}% 0%, 100% ${Math.random() * 30}%, ${80 + Math.random() * 20}% 100%, 0% ${70 + Math.random() * 30}%)`,
            }}
          >
            {displayedText}
          </span>
        ))}
    </span>
  );
};

export default GlitchText;
