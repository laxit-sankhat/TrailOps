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