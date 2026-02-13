/**
 * Use Guarded Order Execution Hook
 * 
 * Hook that wraps order execution with behavioral bias validation
 * Shows warnings modal when needed and blocks emotional trades
 */

import { useCallback } from 'react';
import { usePortfolioStore } from '@/app/store/portfolioStore';
import { useExtendedJournalStore } from '@/app/store/journalStoreExtended';
import { useBehavioralWarningStore } from '@/app/store/behavioralWarningStore';
import { OrderRequest, OrderResult } from '@/app/types/order';
import { getBehavioralBiasGuard } from '@/app/lib/trading/behavioralBiasGuard';
import { JournalEntry } from '@/app/types';

/**
 * Hook for executing orders with behavioral bias checks
 */
export function useGuardedOrderExecution() {
  const executeOrder = usePortfolioStore(state => state.executeOrder);
  const portfolio = usePortfolioStore(state => state.portfolio);
  const journal = useExtendedJournalStore(state => state.journal);
  const recordTradeForPsychology = useExtendedJournalStore(state => state.recordTradeForPsychology);
  const showWarningModal = useBehavioralWarningStore(state => state.showWarningModal);

  /**
   * Execute order with behavioral bias validation
   */
  const executeGuardedOrder = useCallback(
    (order: OrderRequest): Promise<OrderResult> => {
      return new Promise((resolve, reject) => {
        // Get behavioral bias guard
        const guard = getBehavioralBiasGuard();

        // Validate order
        const validation = guard.validateOrder(
          order,
          portfolio.positions,
          journal,
          portfolio.cash
        );

        // If order is blocked, show modal and reject
        if (!validation.allowed) {
          showWarningModal(
            validation.warnings,
            true,
            validation.blockReason,
            order,
            () => {
              // This should never be called for blocked orders
              reject(new Error('Order is blocked'));
            },
            () => {
              reject(new Error('Order cancelled by user'));
            }
          );
          return;
        }

        // If order requires confirmation, show modal and wait for user decision
        if (validation.requiresConfirmation) {
          showWarningModal(
            validation.warnings,
            false,
            undefined,
            order,
            () => {
              // User confirmed - execute order
              const result = executeOrder(order);
              
              // Record trade for psychology monitoring if successful
              if (result.success && result.newPosition) {
                const journalEntry: JournalEntry = {
                  id: result.orderId || `journal_${Date.now()}`,
                  symbol: order.symbol,
                  date: new Date().toISOString(),
                  signalType: order.side === 'LONG' ? 'BUY' : 'SELL',
                  entryPrice: order.price,
                  quantity: order.quantity,
                  notes: '',
                  status: 'OPEN',
                };
                recordTradeForPsychology(journalEntry, result.remainingCash);
              }
              
              resolve(result);
            },
            () => {
              // User cancelled
              reject(new Error('Order cancelled by user'));
            }
          );
          return;
        }

        // No warnings or confirmations needed - execute directly
        const result = executeOrder(order);
        
        // Record trade for psychology monitoring if successful
        if (result.success && result.newPosition) {
          const journalEntry: JournalEntry = {
            id: result.orderId || `journal_${Date.now()}`,
            symbol: order.symbol,
            date: new Date().toISOString(),
            signalType: order.side === 'LONG' ? 'BUY' : 'SELL',
            entryPrice: order.price,
            quantity: order.quantity,
            notes: '',
            status: 'OPEN',
          };
          recordTradeForPsychology(journalEntry, result.remainingCash);
        }
        
        resolve(result);
      });
    },
    [
      executeOrder,
      portfolio.positions,
      portfolio.cash,
      journal,
      recordTradeForPsychology,
      showWarningModal,
    ]
  );

  return { executeGuardedOrder };
}
