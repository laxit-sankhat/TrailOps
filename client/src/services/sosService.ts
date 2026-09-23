import api from '../api/axiosInstance';

export const triggerSOS = (data: any) => api.post('/sos', data);
export const logIncident = (data: any) => api.post('/incidents', data);
export const addVolunteerNote = (incidentId: string, notes: string) =>
  api.patch(`/incidents/${incidentId}/notes`, { volunteerNotes: notes });