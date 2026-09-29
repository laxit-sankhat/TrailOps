import api from '../api/axiosInstance';

export const getMyOrgStaff = () => api.get('/staff');
