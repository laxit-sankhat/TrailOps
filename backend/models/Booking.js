import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const bookingSchema = new Schema(
    {
        participantId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
        tripId: { type: Schema.Types.ObjectId, ref: 'Trip', required: true },
        organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
        status: {
            type: String,
            enum: [
                'Draft',
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

        groupId: { type: Schema.Types.ObjectId, ref: 'BookingGroup', default: null },
        qrCodeValue: { type: String },
    },
    { timestamps: true }
);

bookingSchema.index({ batchId: 1, status: 1 });
bookingSchema.index({ organizationId: 1 });
bookingSchema.index({ participantId: 1 });

const Booking = model('Booking', bookingSchema);
export default Booking;