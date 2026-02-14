'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  BarChart3, Grid3X3, Filter, Moon, Sun, Brain, Database, TrendingUp,
  BookOpen, Activity
} from 'lucide-react';
import { useThemeStore } from '@/app/store/themeStore';
import { cn } from '@/app/lib/utils';

export function Navigation() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useThemeStore();

  const navItems = [
    { 
      path: '/', 
      label: 'ワークステーション', 
      icon: BarChart3,
      description: '取引ダッシュボード'
    },
    { 
      path: '/heatmap', 
      label: 'ヒートマップ', 
      icon: Grid3X3,
      description: '市場の熱みを可視化'
    },
    { 
      path: '/journal', 
      label: 'ジャーナル', 
      icon: BookOpen,
      description: '取引記録と分析'
    },
    { 
      path: '/screener', 
      label: 'スクリーナー', 
      icon: Filter,
      description: '銘柄選別'
    },
    { 
      path: '/performance', 
      label: 'パフォーマンス', 
      icon: TrendingUp,
      description: '実績分析'
    },
    { 
      path: '/portfolio-analysis', 
      label: 'ポートフォリオ分析', 
      icon: Activity,
      description: 'リスク・リターン分析'
    },
    { 
      path: '/ai-advisor', 
      label: 'AIアドバイザー', 
      icon: Brain,
      description: 'AIによるアドバイス'
    },
    { 
      path: '/universe', 
      label: 'ユニバース', 
      icon: Database,
      description: '投資対象一覧'
    },
  ];

  return (
    <nav className="bg-[#101922] py-2 border-t border-[#233648] shrink-0 animate-fade-in">
      <div className="max-w-7xl mx-auto px-2 sm:px-4">
        <div className="flex items-center justify-center">
          <div className="bg-[#192633] border border-[#233648] rounded-full shadow-lg px-1 py-1 flex items-center gap-1 overflow-x-auto no-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={cn(
                    'group relative flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium transition-all duration-200 whitespace-nowrap',
                    'focus:outline-none focus:ring-2 focus:ring-primary/50',
                    isActive
                      ? 'bg-primary text-white shadow-md scale-105' 
                      : 'text-[#92adc9] hover:text-white hover:bg-[#233648]'
                  )}
                  title={item.description}
                >
                  <Icon className={cn(
                    "w-4 h-4",
                    isActive ? "text-white" : "group-hover:text-white transition-colors"
                  )} />
                  <span className="hidden sm:inline">{item.label}</span>
                  
                  {/* Active indicator dot */}
                  {isActive && (
                    <span className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full" />
                  )}
                </Link>
              );
            })}
            
            {/* Divider */}
            <div className="w-px h-6 bg-[#233648] mx-1" />
            
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={cn(
                "p-2 rounded-full transition-all duration-200",
                "focus:outline-none focus:ring-2 focus:ring-primary/50",
                theme === 'dark' 
                  ? 'text-[#92adc9] hover:text-white hover:bg-[#233648]' 
                  : 'text-[#6b7280] hover:text-gray-900 hover:bg-gray-200'
              )}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              title={`${theme === 'dark' ? 'ライト' : 'ダーク'}モードに切り替え`}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
