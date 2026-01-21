// Stub hooks for missing dependencies

export const useNotificationManager = () => ({
  notifications: [],
  addNotification: () => {},
  removeNotification: () => {},
});

export const useSynapse = () => ({
  connect: () => {},
  disconnect: () => {},
  isConnected: false,
});

export const useApprovalRequests = () => ({
  requests: [],
  loading: false,
  createRequest: () => {},
  approveRequest: () => {},
  rejectRequest: () => {},
});
