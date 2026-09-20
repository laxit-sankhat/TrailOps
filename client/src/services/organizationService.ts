import api from '../api/axiosInstance';

export const createOrganization = (data: any) => api.post('/organizations', data);