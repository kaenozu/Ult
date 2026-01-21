'use client';

<<<<<<< HEAD
import { ApprovalCardContainer } from "@/components/features/approvals/ApprovalCard";
import { useApprovalRequests } from "@/components/shared/hooks/business/useApprovalRequests";
=======
import { ApprovalCardContainer } from '@/components/features/approvals/ApprovalCard';
import { useApprovalRequests } from '@/components/shared/hooks/business/useApprovalRequests';
>>>>>>> main

export function ApprovalCardsProvider() {
  const { activeRequests, removeRequest } = useApprovalRequests();

  return (
    <ApprovalCardContainer
      requests={activeRequests}
      onRemoveRequest={removeRequest}
    />
  );
}
