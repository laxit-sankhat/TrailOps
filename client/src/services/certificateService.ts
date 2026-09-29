import api from '../api/axiosInstance';

export const generateCertificate = (bookingId: string, participantId?: string) =>
  api.post('/certificates', { bookingId, participantId });
export const verifyCertificate = (code: string) => api.get(`/certificates/verify/${code}`);