import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const certificateSchema = new Schema(
    {
        participantId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
        tripId: { type: Schema.Types.ObjectId, ref: 'Trip', required: true },
        batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
        certificateCode: { type: String, unique: true },
        pdfUrl: { type: String }
    },
    { timestamps: true }
);

const Certificate = model('Certificate', certificateSchema);
export default Certificate;

