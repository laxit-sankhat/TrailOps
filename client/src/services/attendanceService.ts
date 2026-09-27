import api from '../api/axiosInstance';

export const markAttendanceManual = (data: any) => api.post('/attendance/manual', data);
