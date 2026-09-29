import api from '../api/axiosInstance';
export const getMyBatchAssignments = () => api.get('/batch-assignments/my');
export const getAssignmentsForBatch = (batchId: string, role?: string) =>
  api.get(`/batch-assignments/batch/${batchId}${role ? `?role=${role}` : ''}`);
export const createBatchAssignment = (data: any) => api.post('/batch-assignments', data);