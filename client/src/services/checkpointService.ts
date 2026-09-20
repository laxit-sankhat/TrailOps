import api from '../api/axiosInstance';

export const createCheckpoint = (data: any) => api.post('/checkpoints', data);