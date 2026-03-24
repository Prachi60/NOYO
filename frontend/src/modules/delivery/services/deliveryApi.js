import axiosInstance from "@core/api/axios";

export const deliveryApi = {
  sendLoginOtp: (data) => axiosInstance.post("/delivery/send-login-otp", data),
  sendSignupOtp: (data) =>
    axiosInstance.post("/delivery/send-signup-otp", data),
  verifyOtp: (data) => axiosInstance.post("/delivery/verify-otp", data),
  getProfile: () => axiosInstance.get("/delivery/profile"),
  updateProfile: (data) => axiosInstance.put("/delivery/profile", data),
  getStats: () => axiosInstance.get("/delivery/stats"),
  getEarnings: () => axiosInstance.get("/delivery/earnings"),
  getOrderHistory: (params) =>
    axiosInstance.get("/delivery/order-history", { params }),
  getAvailableOrders: () => axiosInstance.get("/orders/available"),
  acceptOrder: (orderId) => axiosInstance.put(`/orders/accept/${orderId}`),
  skipOrder: (orderId) => axiosInstance.put(`/orders/skip/${orderId}`),
  getOrderDetails: (orderId) => axiosInstance.get(`/orders/details/${orderId}`),
  getNotifications: () => axiosInstance.get("/notifications"),
  markNotificationRead: (id) => axiosInstance.put(`/notifications/${id}/read`),
  markAllNotificationsRead: () =>
    axiosInstance.put("/notifications/mark-all-read"),
  requestWithdrawal: (data) =>
    axiosInstance.post("/delivery/request-withdrawal", data),
  updateOrderStatus: (orderId, data) =>
    axiosInstance.put(`/orders/status/${orderId}`, data),
  updateReturnStatus: (orderId, data) =>
    axiosInstance.put(`/orders/return-status/${orderId}`, data),
};
