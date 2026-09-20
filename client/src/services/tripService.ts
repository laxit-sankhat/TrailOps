import api from '../api/axiosInstance';

export const createTrip = (data: any) => api.post('/trips', data);
export const getTripsByOrg = (organizationId: string) => api.get(`/trips/${organizationId}`);
export const updateTrip = (tripId: string, data: any) => api.patch(`/trips/${tripId}`, data);
export const searchTrips = (params: Record<string, string>) => api.get('/trips/search', { params });
export const getAllPublicTrips = () => api.get('/trips/public/all');