import { NextRequest, NextResponse } from 'next/server';
import { getGlobalTradingPlatform } from '@/app/lib/tradingCore/UnifiedTradingPlatform';
import { ipRateLimiter, getClientIp } from '@/app/lib/ip-rate-limit';
import { rateLimitError } from '@/app/lib/error-handler';
import { requireAuth } from '@/app/lib/auth';

// GET - Platform status
export async function GET(req: NextRequest) {
  // Require authentication
  const authError = requireAuth(req);
  if (authError) {
    return authError;
  }

  try {
    const platform = getGlobalTradingPlatform();
    const status = platform.getStatus();
    const portfolio = platform.getPortfolio();
    const signals = platform.getSignals();
    const riskMetrics = platform.getRiskMetrics();
    const alerts = platform.getAlertHistory(10);

    return NextResponse.json({
      status,
      portfolio,
      signals,
      riskMetrics,
      alerts,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// POST - Control actions
export async function POST(req: NextRequest) {
  // Require authentication
  const authError = requireAuth(req);
  if (authError) {
    return authError;
  }

  // Rate limiting for trading actions
  const clientIp = getClientIp(req);
  if (!ipRateLimiter.check(clientIp)) {
    return rateLimitError();
  }
  
  try {
    const body = await req.json();
    const platform = getGlobalTradingPlatform();

    switch (body.action) {
      case 'start':
        await platform.start();
        return NextResponse.json({ success: true });
      
      case 'stop':
        await platform.stop();
        return NextResponse.json({ success: true });
      
      case 'reset':
        platform.reset();
        return NextResponse.json({ success: true });
      
      case 'place_order':
        // Input validation
        if (!body.symbol || typeof body.symbol !== 'string' || body.symbol.trim().length === 0) {
          return NextResponse.json(
            { error: 'Invalid symbol: must be a non-empty string' },
            { status: 400 }
          );
        }
        if (!body.side || !['BUY', 'SELL'].includes(body.side)) {
          return NextResponse.json(
            { error: 'Invalid side: must be BUY or SELL' },
            { status: 400 }
          );
        }
        if (!body.quantity || typeof body.quantity !== 'number' || body.quantity <= 0 || !Number.isFinite(body.quantity)) {
          return NextResponse.json(
            { error: 'Invalid quantity: must be a positive finite number' },
            { status: 400 }
          );
        }
        
        await platform.placeOrder(
          body.symbol,
          body.side,
          body.quantity,
          body.options
        );
        return NextResponse.json({ success: true });
      
      case 'close_position':
        if (!body.symbol || typeof body.symbol !== 'string' || body.symbol.trim().length === 0) {
          return NextResponse.json(
            { error: 'Invalid symbol: must be a non-empty string' },
            { status: 400 }
          );
        }
        await platform.closePosition(body.symbol);
        return NextResponse.json({ success: true });
      
      case 'create_alert':
        if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
          return NextResponse.json(
            { error: 'Invalid name: must be a non-empty string' },
            { status: 400 }
          );
        }
        if (!body.symbol || typeof body.symbol !== 'string' || body.symbol.trim().length === 0) {
          return NextResponse.json(
            { error: 'Invalid symbol: must be a non-empty string' },
            { status: 400 }
          );
        }
        if (!body.type || typeof body.type !== 'string') {
          return NextResponse.json(
            { error: 'Invalid type: must be a string' },
            { status: 400 }
          );
        }
        if (!body.operator || typeof body.operator !== 'string') {
          return NextResponse.json(
            { error: 'Invalid operator: must be a string' },
            { status: 400 }
          );
        }
        if (body.value === undefined || body.value === null || typeof body.value !== 'number' || !Number.isFinite(body.value)) {
          return NextResponse.json(
            { error: 'Invalid value: must be a finite number' },
            { status: 400 }
          );
        }
        
        platform.createAlert(
          body.name,
          body.symbol,
          body.type,
          body.operator,
          body.value
        );
        return NextResponse.json({ success: true });
      
      case 'update_config':
        platform.updateConfig(body.config);
        return NextResponse.json({ success: true });
      
      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    );
  }
}
