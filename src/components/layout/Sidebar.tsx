"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  LineChart,
  BrainCircuit,
  Settings,
  Wallet,
  Menu,
  Activity,
  Monitor,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { name: "Dashboard", icon: LayoutDashboard, href: "/" },
  { name: "Market", icon: LineChart, href: "/market" },
  { name: "AI Lab", icon: BrainCircuit, href: "/ai-lab" },
  { name: "Portfolio", icon: Wallet, href: "/portfolio" },
  { name: "WebXR", icon: Monitor, href: "/xr" },
  { name: "Settings", icon: Settings, href: "/settings" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "h-screen sticky top-0 flex flex-col border-r border-sidebar-border bg-sidebar/50 backdrop-blur-xl transition-all duration-300 z-50",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border/50">
        {!collapsed && (
          <h1 className="text-xl font-bold tracking-tight font-sans">
            AGStock <span className="text-primary neon-text">Ult</span>
          </h1>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="text-sidebar-foreground/70 hover:text-primary hover:bg-primary/10"
        >
          <Menu className="w-5 h-5" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-2 space-y-2 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group cursor-pointer",
                  isActive
                    ? "bg-primary/10 text-primary neon-border"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5",
                    isActive ? "text-primary" : "group-hover:text-foreground",
                  )}
                />
                {!collapsed && (
                  <span className="font-medium text-sm">{item.name}</span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer / Status */}
      <div className="p-4 border-t border-sidebar-border/50">
        <div
          className={cn(
            "flex items-center gap-3 p-2 rounded-lg bg-black/20 border border-white/5",
            collapsed ? "justify-center" : "",
          )}
        >
          <div className="relative">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <div className="absolute inset-0 w-3 h-3 rounded-full bg-emerald-500 animate-ping opacity-75" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-foreground/80">
                System Online
              </span>
              <span className="text-[10px] text-muted-foreground">
                v2.4.0 (Stable)
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
