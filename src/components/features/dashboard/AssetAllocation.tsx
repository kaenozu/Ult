"use client";

import React, { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface Position {
  ticker: string;
  quantity: number;
  avg_price: number;
  current_price?: number;
}

// Sci-Fi Color Palette
const COLORS = ["#00F0FF", "#7000FF", "#FF003C", "#F0F0F0", "#00FF9D"];

export default function AssetAllocation() {
  const [data, setData] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/v1/positions");
        if (res.ok) {
          const positions: Position[] = await res.json();
          // Calculate market value per ticker (approx if not returned directly, but backend returns it now)
          // Wait, /api/v1/positions returns list without market_value explicit in my last edit?
          // Let's check api_server.py... ah, I didn't include market_value in the LIST response.
          // Correct, I only returned quantity, avg_price, current_price.
          // So I calculate it here.

          const chartData = positions
            .map((p) => ({
              name: p.ticker,
              value: p.quantity * (p.current_price || p.avg_price),
            }))
            .filter((d) => d.value > 0);

          setData(chartData);
        }
      } catch (e) {
        console.error(e);
      }
    };

    fetchData();
  }, []);

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground/50 text-xs font-mono">
        NO ASSETS DEPLOYED (資産なし)
      </div>
    );
  }

  return (
    <div className="h-64 w-full relative">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-32 h-32 rounded-full border border-primary/20 animate-spin-slow" />
        <div className="w-24 h-24 rounded-full border border-dashed border-white/10 animate-reverse-spin" />
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: "#000000cc",
              borderColor: "#333",
              borderRadius: "8px",
            }}
            itemStyle={{ color: "#fff", fontFamily: "monospace" }}
            formatter={(value: number) => `¥${value.toLocaleString()}`}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-[10px] text-primary/50 tracking-[0.2em] font-mono whitespace-nowrap">
        ORBITAL_ALLOCATION
      </div>
    </div>
  );
}
