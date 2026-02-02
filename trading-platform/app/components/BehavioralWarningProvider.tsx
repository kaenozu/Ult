/**
 * Behavioral Warning Provider Component
 * 
 * Provides behavioral warning modal for the entire application
 * Should be placed at the root of the application
 */

'use client';

import { useBehavioralWarningStore } from '@/app/store/behavioralWarningStore';
import { BehavioralWarningModal } from './BehavioralWarningModal';

export function BehavioralWarningProvider({ children }: { children: React.ReactNode }) {
  const {
    isModalOpen,
    currentWarnings,
    isBlocked,
    blockReason,
    confirmOrder,
    cancelOrder,
  } = useBehavioralWarningStore();

  return (
    <>
      {children}
      <BehavioralWarningModal
        isOpen={isModalOpen}
        warnings={currentWarnings}
        isBlocked={isBlocked}
        blockReason={blockReason}
        onConfirm={confirmOrder}
        onCancel={cancelOrder}
      />
    </>
  );
}
