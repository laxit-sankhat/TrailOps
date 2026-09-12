import mongoose from "mongoose";
const { Schema, model } = mongoose;

const batchSchema = new Schema(
    {
        organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
        tripId: { type: Schema.Types.ObjectId, ref: 'Trip', required: true },
        batchName: { type: String },
        startDate: { type: Date },
        endDate: { type: Date },
        maxCapacity: { type: Number },
        status: { type: String, enum: ['Open', 'Full', 'Completed', 'Cancelled '], default: 'Open' }
        
    }
);

batchSchema.index({ tripId: 1 });
batchSchema.index({ organizationId: 1 });

const Batch = model('Batch', batchSchema);
export default Batch;