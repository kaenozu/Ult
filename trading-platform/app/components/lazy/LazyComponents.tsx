'use client';

import { lazy } from 'react';
import { StockChart } from '@/app/components/StockChart';
import { AdvancedIndicatorsChart } from '@/app/components/AdvancedIndicatorsChart';

export const LazyStockChart = lazy(() => import('@/app/components/StockChart').then(m => ({ default: m.StockChart })));
export const LazyAdvancedIndicatorsChart = lazy(() => import('@/app/components/AdvancedIndicatorsChart').then(m => ({ default: m.AdvancedIndicatorsChart })));

import { lazy } from 'react';
import { StockChart } from '@/app/components/StockChart';
import { AdvancedIndicatorsChart } from '@/app/components/AdvancedIndicatorsChart';

export const LazyStockChart = lazy(() => import('@/app/components/StockChart').then(m => ({ default: m.StockChart })));
export const LazyAdvancedIndicatorsChart = lazy(() => import('@/app/components/AdvancedIndicatorsChart').then(m => ({ default: m.AdvancedIndicatorsChart })));

