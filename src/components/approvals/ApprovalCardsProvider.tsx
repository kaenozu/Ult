"use client";

import { ApprovalCardContainer } from "@/components/approvals/ApprovalCard";
import { useApprovalRequests } from "@/hooks/useApprovalRequests";

export function ApprovalCardsProvider() {
  const { activeRequests, removeRequest } = useApprovalRequests();

  return (
    <ApprovalCardContainer
      requests={activeRequests}
      onRemoveRequest={removeRequest}
    />
  );
}
