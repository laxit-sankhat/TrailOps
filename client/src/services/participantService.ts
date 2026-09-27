import api from '../api/axiosInstance';

export const registerParticipant = (data: any) => api.post('/participants', data);