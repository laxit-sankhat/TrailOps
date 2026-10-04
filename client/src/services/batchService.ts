import api from '../api/axiosInstance';

export const createBatch = (data: any) => api.post('/batches', data);
export const searchBatches = (params: Record<string, string>) => api.get('/batches/search', { params });
export const getMyOrgBatches = () => api.get('/batches/my-org');
export const getBatchById = (batchId: string) => api.get(`/batches/${batchId}`);
export const getBatchesByTrip = (tripId: string) => api.get(`/batches/public/trip/${tripId}`);
export const completeBatch = (batchId: string) => api.patch(`/batches/${batchId}/complete`);