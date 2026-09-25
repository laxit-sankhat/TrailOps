import api from '../api/axiosInstance';

export const postTrekStatusUpdate = (data: any) => api.post('/trek-status', data);
export const getTrekStatusHistory = (batchId: string) => api.get(`/trek-status/${batchId}`);