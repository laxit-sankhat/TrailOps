import api from '../api/axiosInstance';

export const createTrip = (data: any) => api.post('/trips', data);
export const getMyOrgTrips = () => api.get('/trips/my-org');
export const getTripsByOrg = (organizationId: string) => api.get(`/trips/organization/${organizationId}`);
export const getTripById = (tripId: string) => api.get(`/trips/detail/${tripId}`);
export const updateTrip = (tripId: string, data: any) => api.patch(`/trips/${tripId}`, data);
export const searchTrips = (params: Record<string, string>) => api.get('/trips/search', { params });
export const getAllPublicTrips = () => api.get('/trips/public/all');
export const getBatchesForTrip = (tripId: string) => api.get(`/trips/${tripId}/batches`);
export const uploadTripImage = (tripId: string, file: File) => {
  const formData = new FormData();
  formData.append('image', file);
  return api.post(`/trips/${tripId}/image`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
};
export const removeTripImage = (tripId: string, publicId: string) =>
  api.delete(`/trips/${tripId}/images/${encodeURIComponent(publicId)}`);