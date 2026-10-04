export type Role =
  | 'SuperAdmin'
  | 'OrgAdmin'
  | 'TripCoordinator'
  | 'MedicalOfficer'
  | 'TrekLeader'
  | 'Volunteer'
  | 'Participant';

export type BookingStatus =
  | 'Inquiry'
  | 'PendingMedicalReview'
  | 'MedicallyApproved'
  | 'Confirmed'
  | 'Waitlisted'
  | 'Rejected'
  | 'Cancelled';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  organizationId: string | null;
}

export interface BatchSummary {
  _id: string;
  batchName: string;
  startDate?: string;
  endDate?: string;
  status?: string;
}

export interface BatchAssignmentSummary {
  _id: string;
  batchId: BatchSummary | null;
}

export interface CheckpointSummary {
  _id: string;
  name: string;
  sequenceOrder: number;
}

export interface OrganizationStaffSummary {
  role: Role;
  userId: {
    _id: string;
    fullName: string;
    role: Role;
  } | null;
}

export interface GearItemSummary {
  _id: string;
  name: string;
  category: string;
  quantity: number;
}

export interface ParticipantBookingSummary {
  _id: string;
  status: BookingStatus;
  tripId: { name: string } | null;
  batchId: {
    batchName: string;
    startDate?: string;
    endDate?: string;
  } | null;
}

export interface PublicTrip {
  _id: string;
  name: string;
  location?: string;
  description?: string;
  difficultyLevel?: 'Easy' | 'Moderate' | 'Difficult';
  durationInHours?: number;
  basePrice?: number;
  status?: string;
  imageUrl?: string | null;
  images?: { url: string; publicId?: string }[];
  organizationId?: { _id: string; name?: string } | string;
}

export interface TripBatch {
  _id: string;
  tripId?: string;
  batchName: string;
  startDate?: string;
  endDate?: string;
  maxCapacity?: number;
  status?: string;
}

export interface OrgFeedbackItem {
  _id: string;
  bookingId?: string;
  tripId?: {
    _id: string;
    name?: string;
    location?: string;
  } | null;
  batchId?: {
    _id: string;
    batchName?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
  } | null;
  participantId?: {
    _id: string;
    fullName?: string;
  } | null;
  ratingGuide: number;
  ratingFood: number;
  ratingSafety: number;
  ratingOverall: number;
  comments?: string;
  createdAt: string;
}

export interface OrgFeedbackStats {
  totalReviews: number;
  avgOverall: number | null;
  avgGuide: number | null;
  avgFood: number | null;
  avgSafety: number | null;
  ratingDistribution: {
    '1': number;
    '2': number;
    '3': number;
    '4': number;
    '5': number;
    [key: string]: number;
  };
}

export interface OrgFeedbackFilters {
  tripId?: string;
  batchId?: string;
  ratingOverall?: number;
  page?: number;
  limit?: number;
}

export interface OrgFeedbackResponse {
  success: boolean;
  count: number;
  total: number;
  page: number;
  limit: number;
  feedbacks: OrgFeedbackItem[];
}

export interface OrgFeedbackStatsResponse {
  success: boolean;
  stats: OrgFeedbackStats;
}

export interface OrganizationProfile {
  _id: string;
  name: string;
  registrationDetails?: string;
  contactEmail: string;
  address?: string;
  status: 'Approved' | 'Suspended';
  createdAt: string;
  updatedAt?: string;
}

export interface UpdateOrganizationPayload {
  name?: string;
  registrationDetails?: string;
  contactEmail?: string;
  address?: string;
}

export interface OrganizationProfileResponse {
  success: boolean;
  organization: OrganizationProfile;
}