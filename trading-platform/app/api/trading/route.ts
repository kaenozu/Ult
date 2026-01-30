import { NextRequest, NextResponse } from 'next/server';
import { getGlobalTradingPlatform } from '@/app/lib/tradingCore/UnifiedTradingPlatform';

// GET - Platform status
export async function GET(req: NextRequest) {
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
        await platform.placeOrder(
          body.symbol,
          body.side,
          body.quantity,
          body.options
        );
        return NextResponse.json({ success: true });
      
      case 'close_position':
        await platform.closePosition(body.symbol);
        return NextResponse.json({ success: true });
      
      case 'create_alert':
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
