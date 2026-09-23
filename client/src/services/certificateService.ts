import api from '../api/axiosInstance';

export const generateCertificate = (bookingId: string) => api.post('/certificates', { bookingId });
export const verifyCertificate = (code: string) => api.get(`/certificates/verify/${code}`);