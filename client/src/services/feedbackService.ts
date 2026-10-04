import api from '../api/axiosInstance';
import type {
  OrgFeedbackFilters,
  OrgFeedbackResponse,
  OrgFeedbackStatsResponse
} from '../types';

export const submitFeedback = (data: any) => api.post('/feedback', data);

export const getMyFeedback = () => api.get('/feedback/my');

export const getOrgFeedback = (params?: OrgFeedbackFilters) =>
  api.get<OrgFeedbackResponse>('/feedback/my-org', { params });

export const getOrgFeedbackStats = () =>
  api.get<OrgFeedbackStatsResponse>('/feedback/my-org/stats');
