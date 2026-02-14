import { NextResponse } from 'next/server';
import { fetchOHLCV } from '@/app/data/stocks';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const start = performance.now();
        console.log('[DebugFetch] Requesting fetchOHLCV for 7203.T');
        const data = await fetchOHLCV('7203.T', 'japan');
        const duration = performance.now() - start;
        console.log(`[DebugFetch] Returned ${data.length} items`);
        return NextResponse.json({ success: true, length: data.length, duration, first: data[0] });
    } catch (error) {
        console.error('[DebugFetch] Error:', error);
        return NextResponse.json({ success: false, error: String(error) });
    }
}
