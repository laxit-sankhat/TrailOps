import api from '../api/axiosInstance';

export interface EmergencyContact {
  name?: string;
  relation?: string;
  phone?: string;
}

export interface UserProfile {
  id: string;
  _id?: string;
  fullName: string;
  email: string;
  mobileNumber?: string;
  address?: string;
  dob?: string | null;
  profilePicture?: string;
  emergencyContact?: EmergencyContact;
  role: string;
  organizationId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserProfileResponse {
  success: boolean;
  user: UserProfile;
}

export interface UpdateUserProfilePayload {
  fullName?: string;
  mobileNumber?: string;
  address?: string;
  dob?: string | null;
  profilePicture?: string;
  emergencyContact?: EmergencyContact;
}

/**
 * Fetch current authenticated user's profile.
 * GET /api/users/me
 */
export const getMyProfile = () => api.get<UserProfileResponse>('/users/me');

/**
 * Update current authenticated user's profile.
 * PATCH /api/users/me
 * Only editable fields: fullName, mobileNumber, address, dob, profilePicture, emergencyContact.
 */
export const updateMyProfile = (data: UpdateUserProfilePayload) =>
  api.patch<UserProfileResponse>('/users/me', data);
