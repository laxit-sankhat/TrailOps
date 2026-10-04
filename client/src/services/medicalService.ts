import api from '../api/axiosInstance';

export const uploadMedicalProfile = (data: FormData | Record<string, any>) => api.post('/medical/profile', data);
export const getMyMedicalProfile = () => api.get('/medical/profile/my');
export const getMyMedicalDocument = () => api.get('/medical/profile/my/document');
export const getPendingReviews = () => api.get(`/medical/reviews/pending?_t=${Date.now()}`);
export const reviewMedicalSubmission = (reviewId: string, data: any) => api.patch(`/medical/reviews/${reviewId}`, data);
export const getReviewDocument = (reviewId: string) => api.get(`/medical/reviews/${reviewId}/document`);