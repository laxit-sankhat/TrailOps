import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const booking = new Schema(
    {
        participantId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
        tripId: { type: Schema.Types.ObjectId, ref: 'Trip', required: true },
        organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
        status: {
            type: String,
            enum: [
                'Inquiry',
                'PendingMedicalReview',
                'MedicallyApproved',
                'Confirmed',
                'Waitlisted',
                'Rejected',
                'Cancelled'
            ],
            default: 'Inquiry'
        },
        qrCodeValue: { type: String },
    },
    { timestamps: true }
);

const Booking = model('Booking', booking);
export default Booking;