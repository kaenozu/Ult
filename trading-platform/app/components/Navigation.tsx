'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Grid3X3, FileText, Filter, Moon, Sun, Brain, Database } from 'lucide-react';
import { useThemeStore } from '@/app/store/themeStore';
import { cn } from '@/app/lib/utils';

export function Navigation() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useThemeStore();

  const navItems = [
    { path: '/', label: 'ワークステーション', icon: BarChart3 },
    { path: '/heatmap', label: 'ヒートマップ', icon: Grid3X3 },
    { path: '/journal', label: 'ジャーナル', icon: FileText },
    { path: '/screener', label: 'スクリーナー', icon: Filter },
    { path: '/ai-advisor', label: 'AIアドバイザー', icon: Brain },
    { path: '/universe', label: 'ユニバース', icon: Database },
  ];

  return (
    <div className="flex justify-center bg-[#101922] py-2 border-t border-[#233648] shrink-0">
      <nav className="bg-[#192633] border border-[#233648] rounded-full shadow-lg px-2 py-1 flex items-center gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-white'
                  : 'text-[#92adc9] hover:text-white hover:bg-[#233648]'
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <div className="w-px h-6 bg-[#233648] mx-1" />
        <button
          onClick={toggleTheme}
          className="p-2 text-[#92adc9] hover:text-white rounded-full hover:bg-[#233648] transition-colors"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </nav>
    </div>
  );
}
