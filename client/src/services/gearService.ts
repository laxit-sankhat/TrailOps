import api from '../api/axiosInstance';
export const getMyOrgGear = () => api.get('/gear');
export const getMyOrgAllocations = () => api.get('/gear/allocations');
export const createGearItem = (data: any) => api.post('/gear', data);
export const allocateGear = (data: any) => api.post('/gear/allocate', data);
export const returnGear = (allocationId: string, data: any) => api.patch(`/gear/allocations/${allocationId}/return`, data);
export const removeGearItem = (gearItemId: string) => api.patch(`/gear/${gearItemId}/remove`);