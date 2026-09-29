import api from '../api/axiosInstance';
export const getMyBatchAssignments = () => api.get('/batch-assignments/my');
export const createBatchAssignment = (data: any) => api.post('/batch-assignments', data);