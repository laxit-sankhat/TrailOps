import api from '../api/axiosInstance';
export const getCheckpointsByBatch = (batchId: string) => api.get(`/checkpoints/batch/${batchId}`);
export const createCheckpoint = (data: any) => api.post('/checkpoints', data);