"use client";

import { useEffect, useRef, useState } from "react";

interface MatrixColumn {
  x: number;
  y: number;
  speed: number;
  chars: string[];
  opacity: number;
  color: "green" | "cyan" | "magenta" | "red";
}

interface GlitchBurst {
  x: number;
  y: number;
  width: number;
  height: number;
  intensity: number;
  startTime: number;
}

export default function MatrixRain({
  children,
  intensity = 0.5,
}: {
  children: React.ReactNode;
  intensity?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const columnsRef = useRef<MatrixColumn[]>([]);
  const glitchBurstsRef = useRef<GlitchBurst[]>([]);

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    const matrixChars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%^&*()_+-=[]{}|;:,.<>?ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ";

    const fontSize = 14;
    const columns = Math.floor(dimensions.width / fontSize);

    if (columnsRef.current.length === 0) {
      columnsRef.current = Array.from({ length: columns }, (_, i) => ({
        x: i * fontSize,
        y: Math.random() * dimensions.height,
        speed: 0.3 + Math.random() * 1.5,
        chars: Array.from(
          { length: Math.floor(10 + Math.random() * 10) },
          () => matrixChars[Math.floor(Math.random() * matrixChars.length)],
        ),
        opacity: 0.03 + Math.random() * 0.05,
        color: ["green", "cyan", "magenta", "red"][
          Math.floor(Math.random() * 4)
        ] as MatrixColumn["color"],
      }));
    }

    let animationId: number;
    let lastGlitchTime = 0;
    let frameCount = 0;

    const getColorForType = (type: MatrixColumn["color"], alpha: number) => {
      switch (type) {
        case "green":
          return `rgba(0, 255, 0, ${alpha})`;
        case "cyan":
          return `rgba(0, 255, 255, ${alpha})`;
        case "magenta":
          return `rgba(255, 0, 255, ${alpha})`;
        case "red":
          return `rgba(255, 0, 0, ${alpha})`;
      }
    };

    const createGlitchBurst = () => {
      const burst: GlitchBurst = {
        x: Math.random() * dimensions.width,
        y: Math.random() * dimensions.height,
        width: 100 + Math.random() * 300,
        height: 50 + Math.random() * 150,
        intensity: 0.3 + Math.random() * 0.5,
        startTime: Date.now(),
      };
      glitchBurstsRef.current.push(burst);
    };

    const animate = (timestamp: number) => {
      frameCount++;

      ctx.fillStyle = "rgba(0, 0, 0, 0.03)";
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);

      ctx.font = `${fontSize}px monospace`;

      columnsRef.current.forEach((column) => {
        column.chars.forEach((char, index) => {
          const charY = column.y - index * fontSize;

          if (charY > 0 && charY < dimensions.height) {
            const fadeOpacity =
              (1 - index / column.chars.length) * column.opacity * intensity;

            let finalColor = getColorForType(column.color, fadeOpacity);

            ctx.fillStyle = finalColor;
            ctx.fillText(char, column.x, charY);

            if (index === 0) {
              ctx.fillStyle = `rgba(255, 255, 255, ${fadeOpacity * 2})`;
              ctx.fillText(char, column.x, charY);
            }
          }
        });

        column.y += column.speed * fontSize * 0.08;

        if (column.y - column.chars.length * fontSize > dimensions.height) {
          column.y = -column.chars.length * fontSize;
          column.speed = 0.3 + Math.random() * 1.5;
          column.opacity = 0.03 + Math.random() * 0.05;
          column.chars = Array.from(
            { length: Math.floor(10 + Math.random() * 10) },
            () => matrixChars[Math.floor(Math.random() * matrixChars.length)],
          );
        }

        if (Math.random() < 0.005) {
          const randomIndex = Math.floor(Math.random() * column.chars.length);
          column.chars[randomIndex] =
            matrixChars[Math.floor(Math.random() * matrixChars.length)];
        }
      });

      if (timestamp - lastGlitchTime > 2000 + Math.random() * 3000) {
        createGlitchBurst();
        lastGlitchTime = timestamp;
      }

      glitchBurstsRef.current = glitchBurstsRef.current.filter((burst) => {
        const age = Date.now() - burst.startTime;
        if (age > 150) return false;

        const progress = age / 150;
        const currentIntensity = burst.intensity * (1 - progress);

        ctx.save();

        const offsetX = (Math.random() - 0.5) * 10 * currentIntensity;
        const offsetY = (Math.random() - 0.5) * 5 * currentIntensity;

        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = `rgba(0, 255, 255, ${currentIntensity * 0.5})`;
        ctx.fillRect(burst.x + offsetX, burst.y, burst.width, burst.height);

        ctx.fillStyle = `rgba(255, 0, 255, ${currentIntensity * 0.5})`;
        ctx.fillRect(
          burst.x - offsetX,
          burst.y + offsetY,
          burst.width,
          burst.height,
        );

        ctx.restore();

        return true;
      });

      if (frameCount % 60 === 0 && Math.random() < 0.1) {
        const randomColumn = Math.floor(
          Math.random() * columnsRef.current.length,
        );
        columnsRef.current[randomColumn].chars = Array.from(
          { length: 30 + Math.floor(Math.random() * 20) },
          () => matrixChars[Math.floor(Math.random() * matrixChars.length)],
        );
        columnsRef.current[randomColumn].opacity = 0.1 + Math.random() * 0.15;
        columnsRef.current[randomColumn].speed = 2 + Math.random() * 2;
      }

      animationId = requestAnimationFrame((t) => animate(t));
    };

    animate(0);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [dimensions, intensity]);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ opacity: 0.6 }}
      />
      <div className="relative z-10 min-h-screen">{children}</div>
    </div>
  );
}
