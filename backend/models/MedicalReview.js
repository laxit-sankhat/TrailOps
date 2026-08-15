import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const medicalReviewSchema = new Schema(
    {
        bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
        medicalProfileId: { type: Schema.Types.ObjectId, ref: 'MedicalProfile', required: true },
        organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
        medicalReviewerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        status: {
            type: String,
            enum: ['Approved', 'Rejected', 'NeedsMoreInfo'],
            default: 'NeedsMoreInfo'
        },
        notes: { type: String },
    }, 
    { timestamps: true }
);

const MedicalReview = model('MedicalReview', medicalReviewSchema);
export default MedicalReview;