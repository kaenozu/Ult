"use client";

import { ApprovalCardContainer } from "@/components/features/approvals/ApprovalCard";
import { useApprovalRequests } from "@/components/shared/hooks/useApprovalRequests";

export function ApprovalCardsProvider() {
  const { activeRequests, removeRequest } = useApprovalRequests();

  return (
    <ApprovalCardContainer
      requests={activeRequests}
      onRemoveRequest={removeRequest}
    />
  );
}
