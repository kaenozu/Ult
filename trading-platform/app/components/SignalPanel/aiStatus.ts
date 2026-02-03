import { JournalEntry } from '@/app/types';
import { AI_TRADING } from '@/app/lib/constants';

type ProfitSplit = {
  realizedProfit: number;
  unrealizedProfit: number;
};

const sumProfitByStatus = (entries: JournalEntry[]): ProfitSplit => {
  return entries.reduce<ProfitSplit>(
    (acc, entry) => {
      const { entryPrice, exitPrice, quantity, signalType, status } = entry;
      if (exitPrice === undefined || exitPrice === null) {
        if (status === 'CLOSED') {
          return acc;
        }
        return acc;
      }

      const direction = signalType === 'SELL' ? -1 : 1;
      const profit = (exitPrice - entryPrice) * quantity * direction;

      if (status === 'CLOSED') {
        acc.realizedProfit += profit;
      } else {
        acc.unrealizedProfit += profit;
      }

      return acc;
    },
    { realizedProfit: 0, unrealizedProfit: 0 }
  );
};

export const calculateAIStatusMetrics = (entries: JournalEntry[]) => {
  const { realizedProfit, unrealizedProfit } = sumProfitByStatus(entries);
  const totalProfit = realizedProfit;
  const virtualBalance = AI_TRADING.INITIAL_VIRTUAL_BALANCE + realizedProfit + unrealizedProfit;

  return { totalProfit, virtualBalance, realizedProfit, unrealizedProfit };
};
