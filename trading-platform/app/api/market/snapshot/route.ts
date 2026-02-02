import { NextResponse } from 'next/server';

export async function GET() {
    // Temporary implementation to fix 404 error
    // Returns empty snapshot data
    return NextResponse.json({
        timestamp: Date.now(),
        marketStatus: 'OPEN',
        indices: [],
        topGainers: [],
        topLosers: [],
        mostActive: []
    });
}
