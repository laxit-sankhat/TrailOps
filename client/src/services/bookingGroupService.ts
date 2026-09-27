import api from '../api/axiosInstance';

export const createBookingGroup = (batchId: string) => api.post('/booking-groups', { batchId });
export const joinBookingGroup = (groupCode: string) => api.post('/booking-groups/join', { groupCode });
export const submitBookingGroup = (groupId: string) => api.patch(`/booking-groups/${groupId}/submit`);
