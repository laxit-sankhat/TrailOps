import api from '../api/axiosInstance';

export const submitFeedback = (data: any) => api.post('/feedback', data);

