import api from '../api/axiosInstance';

export const getOrgStats = () => api.get('/analytics/org');
export const getPlatformStats = () => api.get('/analytics/platform');
export const getBatchComplianceReport = (batchId: string) => api.get(`/analytics/batch/${batchId}`);