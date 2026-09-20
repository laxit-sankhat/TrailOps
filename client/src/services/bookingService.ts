import api from '../api/axiosInstance';

export const createBooking = (data: any) => api.post('/bookings', data);
export const cancelBooking = (bookingId: string) => api.patch(`/bookings/${bookingId}`);
export const confirmBooking = (bookingId: string) => api.patch(`/bookings/confirm/${bookingId}`);
export const getParticipantsByBatch = (batchId: string) => api.get(`/bookings/batch/${batchId}`);
export const submitForMedicalReview = (bookingId: string) => api.post(`/bookings/${bookingId}/submit-review`);
export const getBookingQR = (bookingId: string) => api.get(`/bookings/${bookingId}/qr`);