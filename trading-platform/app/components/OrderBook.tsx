'use client';

import { Stock } from '@/app/types';
import { formatCurrency, cn } from '@/app/lib/utils';

interface OrderBookProps {
  stock: Stock | null;
}

export function OrderBook({ stock }: OrderBookProps) {
  const basePrice = stock?.price || 100;

  // Mock data generation
  const bids = [
    { price: basePrice - 0.01, size: 920 },
    { price: basePrice - 0.02, size: 410 },
    { price: basePrice - 0.03, size: 250 },
    { price: basePrice - 0.04, size: 180 },
    { price: basePrice - 0.05, size: 120 },
  ];
  const asks = [
    { price: basePrice + 0.01, size: 450 },
    { price: basePrice + 0.02, size: 230 },
    { price: basePrice + 0.03, size: 150 },
    { price: basePrice + 0.04, size: 100 },
    { price: basePrice + 0.05, size: 80 },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden border-t border-[#233648]">
        <div className="px-4 py-3 border-b border-[#233648] bg-[#192633]/50 flex justify-between items-center">
            <span className="text-xs font-bold text-[#92adc9] uppercase tracking-wider">板情報</span>
            <span className="text-[10px] bg-blue-500/20 px-2 py-0.5 rounded text-blue-400 font-bold border border-blue-500/30">
            {stock?.market === 'japan' ? '東証' : 'NYSE'}
            </span>
        </div>
        <div className="flex-1 overflow-y-auto bg-[#101922]">
            <table className="w-full text-xs tabular-nums border-collapse">
            <thead className="sticky top-0 bg-[#141e27] text-[10px] text-[#92adc9] z-10">
                <tr>
                <th className="py-2 px-2 text-center font-medium w-1/3 border-b border-[#233648]">買数量</th>
                <th className="py-2 px-2 text-center font-medium w-1/3 border-b border-[#233648]">気配値</th>
                <th className="py-2 px-2 text-center font-medium w-1/3 border-b border-[#233648]">売数量</th>
                </tr>
            </thead>
            <tbody>
                {asks.reverse().map((ask, i) => (
                    <tr key={`ask-${i}`} className="hover:bg-[#192633]/50">
                    <td className="py-0.5 px-2 text-right text-[#92adc9]"></td>
                    <td className="py-0.5 px-2 text-center text-red-500 font-medium">
                        {formatCurrency(ask.price, stock?.market === 'japan' ? 'JPY' : 'USD')}
                    </td>
                    <td className="py-0.5 px-2 text-left text-white relative">
                        <span
                        className="absolute inset-y-0 left-0 bg-red-500/20"
                        style={{ width: `${Math.min(ask.size / 5, 100)}%` }}
                        ></span>
                        <span className="relative z-10">{ask.size}</span>
                    </td>
                    </tr>
                ))}
                <tr className="bg-[#192633] border-y border-[#233648]">
                    <td className="py-1 px-4 text-center font-bold text-sm text-white flex justify-center items-center gap-2" colSpan={3}>
                    {stock ? formatCurrency(stock.price, stock.market === 'japan' ? 'JPY' : 'USD') : '-'}
                    <span className="text-[10px] font-normal text-[#92adc9]">
                        Spread: 0.02
                    </span>
                    </td>
                </tr>
                {bids.map((bid, i) => (
                    <tr key={`bid-${i}`} className="hover:bg-[#192633]/50">
                    <td className="py-0.5 px-2 text-right text-white relative">
                        <span
                        className="absolute inset-y-0 right-0 bg-green-500/20"
                        style={{ width: `${Math.min(bid.size / 10, 100)}%` }}
                        ></span>
                        <span className="relative z-10">{bid.size}</span>
                    </td>
                    <td className="py-0.5 px-2 text-center text-green-500 font-medium">
                        {formatCurrency(bid.price, stock?.market === 'japan' ? 'JPY' : 'USD')}
                    </td>
                    <td className="py-0.5 px-2 text-left text-[#92adc9]"></td>
                    </tr>
                ))}
            </tbody>
            </table>
        </div>
    </div>
  );
}
