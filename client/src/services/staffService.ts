import api from '../api/axiosInstance';

export const getMyOrgStaff = (params?: { status?: string }) => api.get('/staff/my-org', { params });
export const getStaffMemberById = (userId: string) => api.get(`/staff/${userId}`);
export const createStaffMember = (data: any) => api.post('/staff', data);
export const removeStaffMember = (userId: string) => api.patch(`/staff/${userId}/remove`);
export const reactivateStaffMember = (userId: string) => api.patch(`/staff/${userId}/activate`);
