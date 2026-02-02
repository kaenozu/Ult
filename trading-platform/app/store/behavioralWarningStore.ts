/**
 * Behavioral Warning Store
 * 
 * Manages state for behavioral warning modal and order validation
 */

import { create } from 'zustand';
import { PsychologyWarning } from '@/app/lib/trading/psychology';
import { OrderRequest } from '@/app/types/order';

interface BehavioralWarningState {
  /** Whether the modal is currently shown */
  isModalOpen: boolean;
  /** Current warnings to display */
  currentWarnings: PsychologyWarning[];
  /** Whether the current order is blocked */
  isBlocked: boolean;
  /** Block reason if order is blocked */
  blockReason?: string;
  /** Pending order waiting for confirmation */
  pendingOrder: OrderRequest | null;
  /** Callback when order is confirmed */
  onConfirmCallback: (() => void) | null;
  /** Callback when order is cancelled */
  onCancelCallback: (() => void) | null;

  /** Show the warning modal */
  showWarningModal: (
    warnings: PsychologyWarning[],
    isBlocked: boolean,
    blockReason: string | undefined,
    order: OrderRequest,
    onConfirm: () => void,
    onCancel: () => void
  ) => void;

  /** Hide the warning modal */
  hideWarningModal: () => void;

  /** Confirm the pending order */
  confirmOrder: () => void;

  /** Cancel the pending order */
  cancelOrder: () => void;

  /** Reset state */
  reset: () => void;
}

export const useBehavioralWarningStore = create<BehavioralWarningState>((set, get) => ({
  isModalOpen: false,
  currentWarnings: [],
  isBlocked: false,
  blockReason: undefined,
  pendingOrder: null,
  onConfirmCallback: null,
  onCancelCallback: null,

  showWarningModal: (warnings, isBlocked, blockReason, order, onConfirm, onCancel) => {
    set({
      isModalOpen: true,
      currentWarnings: warnings,
      isBlocked,
      blockReason,
      pendingOrder: order,
      onConfirmCallback: onConfirm,
      onCancelCallback: onCancel,
    });
  },

  hideWarningModal: () => {
    set({
      isModalOpen: false,
      currentWarnings: [],
      isBlocked: false,
      blockReason: undefined,
      pendingOrder: null,
      onConfirmCallback: null,
      onCancelCallback: null,
    });
  },

  confirmOrder: () => {
    const { onConfirmCallback } = get();
    if (onConfirmCallback) {
      onConfirmCallback();
    }
    get().hideWarningModal();
  },

  cancelOrder: () => {
    const { onCancelCallback } = get();
    if (onCancelCallback) {
      onCancelCallback();
    }
    get().hideWarningModal();
  },

  reset: () => {
    set({
      isModalOpen: false,
      currentWarnings: [],
      isBlocked: false,
      blockReason: undefined,
      pendingOrder: null,
      onConfirmCallback: null,
      onCancelCallback: null,
    });
  },
}));
