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