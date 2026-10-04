import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const organizationMembershipSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
        role: {
            type: String,
            enum: ['OrgAdmin', 'TripCoordinator', 'MedicalOfficer', 'TrekLeader', 'Volunteer'],
            required: true
        },
        status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
    },
    { timestamps: true }
);

// Ensures an organization has only one OrgAdmin membership
// partialFilterExpression applies this uniqueness rule only to OrgAdmin records
organizationMembershipSchema.index(
  { organizationId: 1, role: 1 },
  { unique: true, partialFilterExpression: { role: 'OrgAdmin' } }
);

// Makes it efficient to find all memberships belonging to a user
organizationMembershipSchema.index({ userId: 1 });

// Prevents the same user from having duplicate membership
// in the same organization
organizationMembershipSchema.index({ userId: 1, organizationId: 1 }, { unique: true });

const OrganizationMembership = model('OrganizationMembership', organizationMembershipSchema);
export default OrganizationMembership;