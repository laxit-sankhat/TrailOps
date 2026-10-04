import api from '../api/axiosInstance';
import type {
  OrganizationProfileResponse,
  UpdateOrganizationPayload
} from '../types';

export const createOrganization = (data: any) => api.post('/organizations', data);

export const getMyOrgProfile = () =>
  api.get<OrganizationProfileResponse>('/organizations/my-org');

export const updateMyOrgProfile = (data: UpdateOrganizationPayload) =>
  api.patch<OrganizationProfileResponse>('/organizations/my-org', data);