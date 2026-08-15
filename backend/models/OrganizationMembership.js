import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const organizationMembershipSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
        role: {
            type: String,
            enum: ['OrgAdmin', 'TripCoordinator', 'MedicalOfficer', 'TrekLeader'],
            required: true
        },
        status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
    },
    { timestamps: true }
);

organizationMembershipSchema.index(
  { organizationId: 1, role: 1 },
  { unique: true, partialFilterExpression: { role: 'OrgAdmin' } }
);

const OrganizationMembership = model('OrganizationMembership', organizationMembershipSchema);
export default OrganizationMembership;