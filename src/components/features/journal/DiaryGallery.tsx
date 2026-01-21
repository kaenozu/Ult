"use client";

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { VirtuosoGrid } from 'react-virtuoso';
import { ScreenshotCard } from './ScreenshotCard';
import { Search, Filter, Loader2, Image as ImageIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function DiaryGallery({ ticker }: { ticker?: string }) {
    const [search, setSearch] = useState("");

    // Fetch screenshots
    const { data: records = [], isLoading } = useQuery({
        queryKey: ['journal', ticker],
        queryFn: async () => {
            const url = ticker
                ? `/api/v1/journal/list?ticker=${ticker}`
                : `/api/v1/journal/list`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch journal');
            return res.json();
        }
    });

    // Filter locally for now (search by analysis summary or ticker if global)
    const filteredRecords = records.filter((r: any) => {
        if (ticker) return true;
        if (!search) return true;
        return r.ticker.toLowerCase().includes(search.toLowerCase()) ||
            r.analysis_result?.summary?.toLowerCase().includes(search.toLowerCase());
    });

    if (isLoading) {
        return (
            <div className="h-64 flex items-center justify-center text-cyan-500 animate-pulse">
                <Loader2 className="w-8 h-8 animate-spin mr-2" />
                LOADING MEMORIES...
            </div>
        );
    }

    if (records.length === 0) {
        return (
            <div className="h-64 flex flex-col items-center justify-center text-gray-500 border border-dashed border-gray-800 rounded-xl">
                <ImageIcon className="w-12 h-12 mb-4 opacity-20" />
                <p className="font-mono text-sm">NO SNAPSHOTS RELIC RECORDED</p>
                <p className="text-xs opacity-50 mt-2">Capture chart moments to build your journal.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 h-full flex flex-col">
            {/* Controls */}
            {!ticker && (
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search journal..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50"
                        />
                    </div>
                </div>
            )}

            {/* Virtual Grid */}
            <div className="flex-1 min-h-[400px]">
                <VirtuosoGrid
                    style={{ height: 600 }}
                    totalCount={filteredRecords.length}
                    overscan={200}
                    components={{
                        List: React.forwardRef((props, ref) => (
                            <div
                                {...props}
                                ref={ref}
                                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pr-2"
                            />
                        )),
                        Item: ({ children, ...props }) => (
                            <div {...props} className="min-h-[200px]">
                                {children}
                            </div>
                        )
                    }}
                    itemContent={(index) => (
                        <ScreenshotCard record={filteredRecords[index]} />
                    )}
                />
            </div>
        </div>
    );
}
