import api from '../api/axiosInstance';

export const createBatch = (data: any) => api.post('/batches', data);
export const searchBatches = (params: Record<string, string>) => api.get('/batches/search', { params });
export const completeBatch = (batchId: string) => api.patch(`/batches/${batchId}/complete`);