/**
 * Data Source Health Check API
 * 
 * @swagger
 * /api/market/health:
 *   get:
 *     summary: Check health and status of data sources
 *     description: Returns status of all configured data sources with capabilities and recommendations
 *     tags:
 *       - Market Data
 *     responses:
 *       200:
 *         description: Data source health information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sources:
 *                   type: array
 *                   items:
 *                     type: object
 *                 recommendations:
 *                   type: array
 *                   items:
 *                     type: string
 */

import { NextResponse } from 'next/server';
import { dataSourceConfigService } from '@/app/domains/market-data/services';
import { DataSourceProvider } from '@/app/domains/market-data/types/data-source';

export async function GET() {
  const allConfigs = dataSourceConfigService.getAllConfigs();
  const enabledConfigs = dataSourceConfigService.getEnabledConfigs();
  
  const sources = allConfigs.map(config => {
    const caps = config.capabilities;
    
    return {
      provider: config.provider,
      enabled: config.enabled,
      priority: config.priority,
      hasApiKey: !!config.apiKey,
      capabilities: {
        realtime: caps.realtime,
        intraday: caps.intraday,
        delayMinutes: caps.delayMinutes,
        japaneseStocks: caps.japaneseStocks,
        usStocks: caps.usStocks,
        tickData: caps.tickData,
        bidAsk: caps.bidAsk,
        historicalData: caps.historicalData,
        rateLimit: caps.rateLimit,
      },
      status: config.enabled ? 'available' : 'not_configured',
    };
  });
  
  // Get recommendations for both markets
  const japanRecommendations = dataSourceConfigService.getRecommendations('japan');
  const usRecommendations = dataSourceConfigService.getRecommendations('usa');
  
  const summary = {
    totalSources: allConfigs.length,
    enabledSources: enabledConfigs.length,
    primarySource: enabledConfigs.length > 0 ? enabledConfigs[0].provider : DataSourceProvider.YAHOO_FINANCE,
    hasAlternatives: dataSourceConfigService.hasAlternativeSources(),
  };
  
  return NextResponse.json({
    summary,
    sources,
    recommendations: {
      japan: japanRecommendations,
      usa: usRecommendations,
    },
    timestamp: Date.now(),
  });
}
