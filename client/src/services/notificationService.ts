import api from '../api/axiosInstance';

export const getMyNotifications = () => api.get('/notifications/my');
export const markNotificationRead = (id: string) => api.patch(`/notifications/${id}/read`);
