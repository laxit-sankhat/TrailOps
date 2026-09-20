import api from '../api/axiosInstance';

export const uploadMedicalProfile = (data: any) => api.post('/medical/profile', data);
export const getPendingReviews = () => api.get(`/medical/reviews/pending?_t=${Date.now()}`);
export const reviewMedicalSubmission = (reviewId: string, data: any) => api.patch(`/medical/reviews/${reviewId}`, data);