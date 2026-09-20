import api from '../api/axiosInstance';

export const createBatchAssignment = (data: any) => api.post('/batch-assignments', data);