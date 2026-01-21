'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  getMarketData,
  getChartData,
  getSignal,
} from '@/components/shared/utils/api';
import PriceChart from '@/components/features/dashboard/PriceChart';
import TradingModal from '@/components/features/dashboard/TradingModal';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Eye,
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';
import VisionPanel from '@/components/features/vision/VisionPanel';
import { useChartCapture } from '@/hooks/useChartCapture';
import DiaryGallery from '@/components/features/vision/DiaryGallery';

function decodeTicker(ticker: string): string {
  // URLデコードと大文字変換
  return decodeURIComponent(ticker).toUpperCase();
}

export default function StockDetailPage() {
  const params = useParams();
  const ticker = decodeTicker(params.ticker as string);

  // Vision State
  const [visionOpen, setVisionOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const { capture, isCapturing } = useChartCapture();

  const handleVisionAnalyze = async () => {
    // Capture the chart container
    const img = await capture('price-chart-container');
    if (img) {
      setCapturedImage(img);
      setVisionOpen(true);
    }
  };

  const { data: marketData, isLoading: isMarketLoading } = useQuery({
    queryKey: ['market', ticker],
    queryFn: () => getMarketData(ticker),
    refetchInterval: 5000,
  });

  // ... (existing queries)
  const { data: chartData, isLoading: isChartLoading } = useQuery({
    queryKey: ['chart', ticker],
    queryFn: () => getChartData(ticker, '1y'),
  });

  const { data: signalData, isLoading: isSignalLoading } = useQuery({
    queryKey: ['signal', ticker, 'RSI'],
    queryFn: () => getSignal(ticker, 'RSI'), // Use RSI for non-zero confidence
  });

  // ... (loading state check)
  const isLoading = isMarketLoading || isChartLoading || isSignalLoading;

  if (isLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-background text-foreground'>
        <div className='animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full' />
      </div>
    );
  }

  if (!marketData) {
    return <div className='p-8 text-center'>Stock not found</div>;
  }

  // Determine signal color/text (existing logic)
  const signal = signalData?.signal || 0;
  let signalText = '様子見 (Wait)';
  let signalColor = 'text-yellow-500';
  let signalBg = 'bg-yellow-500/10';

  if (signal === 1) {
    signalText = '買い時 (BUY)';
    signalColor = 'text-green-500';
    signalBg = 'bg-green-500/10';
  } else if (signal === -1) {
    signalText = '売り時 (SELL)';
    signalColor = 'text-red-500';
    signalBg = 'bg-red-500/10';
  }

  const isBuySignal = signal === 1;

  return (
    <main className='min-h-screen bg-background pb-20'>
      {/* Header */}
      <header className='sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b px-4 py-3 flex items-center gap-4'>
        <Link href='/'>
          <Button variant='ghost' size='icon'>
            <ArrowLeft className='h-5 w-5' />
          </Button>
        </Link>
        <div>
          <h1 className='text-lg font-bold leading-none'>{ticker}</h1>
          <p className='text-xs text-muted-foreground'>Detailed Analysis</p>
        </div>
      </header>

      <div className='p-4 space-y-6 max-w-4xl mx-auto'>
        {/* Price & Signal Overview */}
        {isMarketLoading ? (
          <div className='flex justify-center items-center h-32'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500'></div>
          </div>
        ) : (
          <>
            <div className='flex flex-col md:flex-row justify-between items-start md:items-center gap-4'>
              <div>
                <div className='text-3xl font-bold font-mono'>
                  ¥{marketData?.price?.toLocaleString() || 'N/A'}
                </div>
                {marketData && (
                  <div
                    className={`flex items-center gap-2 text-sm ${marketData.change >= 0 ? 'text-green-500' : 'text-red-500'}`}
                  >
                    {marketData.change >= 0 ? (
                      <TrendingUp className='h-4 w-4' />
                    ) : (
                      <TrendingDown className='h-4 w-4' />
                    )}
                    <span>
                      {marketData.change > 0 ? '+' : ''}
                      {marketData.change.toLocaleString()} (
                      {marketData.change_percent.toFixed(2)}%)
                    </span>
                  </div>
                )}
              </div>

              <div
                className={`px-4 py-2 rounded-full font-bold border ${signalColor} ${signalBg} flex items-center gap-2`}
              >
                <AlertCircle className='h-5 w-5' />
                {signalText}
              </div>
            </div>

            {/* Action Button (One-Tap Trade) */}
            {marketData && (
              <TradingModal
                ticker={ticker}
                name={ticker}
                price={marketData.price}
                trigger={
                  <Button
                    className={`w-full md:w-auto h-12 text-lg font-bold shadow-lg ${isBuySignal ? 'animate-pulse hover:animate-none' : ''}`}
                    variant={isBuySignal ? 'default' : 'secondary'}
                  >
                    {isBuySignal ? '今すぐ買う (Buy Now)' : '注文する (Trade)'}
                  </Button>
                }
              />
            )}

            {/* Chart */}
            <Card>
              <CardHeader className='flex flex-row items-center justify-between pb-2'>
                <CardTitle className='text-sm text-muted-foreground'>
                  Price History (1 Year)
                </CardTitle>
                <Button
                  size='sm'
                  variant='outline'
                  className='gap-2 border-purple-500/30 hover:bg-purple-500/10 hover:text-purple-400'
                  onClick={handleVisionAnalyze}
                  disabled={isCapturing}
                >
                  <Eye className='w-4 h-4' />
                  {isCapturing ? 'Scanning...' : 'Analyze Vision'}
                </Button>
              </CardHeader>
              <CardContent className='p-0 pb-4' id='price-chart-container'>
                {chartData && (
                  <PriceChart
                    data={chartData}
                    signal={signalData?.signal}
                    targetPrice={signalData?.target_price}
                  />
                )}
              </CardContent>
            </Card>

            {/* AI Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <span className='bg-primary/10 text-primary p-1 rounded'>AI</span>
                  Market Analyst
                </CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <p className='text-lg font-medium leading-relaxed'>
                  {signalData?.explanation || '分析データ収集中...'}
                </p>

                <div className='bg-muted/50 p-4 rounded-lg text-sm space-y-2'>
                  <div className='flex justify-between'>
                    <span className='text-muted-foreground'>Confidence Score</span>
                    <span className='font-bold'>
                      {(signalData?.confidence || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className='w-full bg-secondary h-2 rounded-full overflow-hidden'>
                    <div
                      className='bg-primary h-full transition-all'
                      style={{ width: `${(signalData?.confidence || 0) * 100}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
        ) : !marketData ? (
          <div className='text-center py-8'>
            <p className='text-muted-foreground'>Market data not available</p>
          </div>
        <div className='flex flex-col md:flex-row justify-between items-start md:items-center gap-4'>
          <div>
            <div className='text-3xl font-bold font-mono'>
              ¥{marketData?.price?.toLocaleString() || 'N/A'}
            </div>
            {marketData && (
              <div
                className={`flex items-center gap-2 text-sm ${marketData.change >= 0 ? 'text-green-500' : 'text-red-500'}`}
              >
                {marketData.change >= 0 ? (
                  <TrendingUp className='h-4 w-4' />
                ) : (
                  <TrendingDown className='h-4 w-4' />
                )}
                <span>
                  {marketData.change > 0 ? '+' : ''}
                  {marketData.change.toLocaleString()} (
                  {marketData.change_percent.toFixed(2)}%)
                </span>
              </div>
            )}
          </div>

          <div
            className={`px-4 py-2 rounded-full font-bold border ${signalColor} ${signalBg} flex items-center gap-2`}
          >
            <AlertCircle className='h-5 w-5' />
            {signalText}
          </div>
        </div>

        {/* Action Button (One-Tap Trade) */}
        {marketData && (
          <TradingModal
            ticker={ticker}
            name={ticker} // Ideally passed or fetched
            price={marketData.price}
            trigger={
              <Button
                className={`w-full md:w-auto h-12 text-lg font-bold shadow-lg ${isBuySignal ? 'animate-pulse hover:animate-none' : ''}`}
                variant={isBuySignal ? 'default' : 'secondary'}
              >
                {isBuySignal ? '今すぐ買う (Buy Now)' : '注文する (Trade)'}
              </Button>
            }
          />
        )}
                <span>
                  {marketData.change > 0 ? '+' : ''}
                  {marketData.change.toLocaleString()} (
                  {marketData.change_percent.toFixed(2)}%)
                </span>
              </div>
            </div>

            <div
              className={`px-4 py-2 rounded-full font-bold border ${signalColor} ${signalBg} flex items-center gap-2`}
            >
              <AlertCircle className='h-5 w-5' />
              {signalText}
            </div>
          </div>

          {/* Action Button (One-Tap Trade) */}
          {marketData && (
            <TradingModal
              ticker={ticker}
              name={ticker}
              price={marketData.price}
              trigger={
                <Button
                  className={`w-full md:w-auto h-12 text-lg font-bold shadow-lg ${isBuySignal ? 'animate-pulse hover:animate-none' : ''}`}
                  variant={isBuySignal ? 'default' : 'secondary'}
                >
                  {isBuySignal ? '今すぐ買う (Buy Now)' : '注文する (Trade)'}
                </Button>
              }
            />
          )}

          {/* Chart */}
          <Card>
            <CardHeader className='flex flex-row items-center justify-between pb-2'>
              <CardTitle className='text-sm text-muted-foreground'>
                Price History (1 Year)
              </CardTitle>
              <Button
                size='sm'
                variant='outline'
                className='gap-2 border-purple-500/30 hover:bg-purple-500/10 hover:text-purple-400'
                onClick={handleVisionAnalyze}
                disabled={isCapturing}
              >
                <Eye className='w-4 h-4' />
                {isCapturing ? 'Scanning...' : 'Analyze Vision'}
              </Button>
            </CardHeader>
            <CardContent className='p-0 pb-4' id='price-chart-container'>
              {chartData && (
                <PriceChart
                  data={chartData}
                  signal={signalData?.signal}
                  targetPrice={signalData?.target_price}
                />
              )}
            </CardContent>
          </Card>
      </div>

      {/* Vision Panel */}
      <VisionPanel
        isOpen={visionOpen}
        onClose={() => setVisionOpen(false)}
        ticker={ticker}
        image={capturedImage}
      />

      {/* Screenshot Diary Gallery */}
      <div className='max-w-4xl mx-auto px-4 mt-8 mb-20'>
        <DiaryGallery ticker={ticker} />
      </div>
    </main>
  );
}
