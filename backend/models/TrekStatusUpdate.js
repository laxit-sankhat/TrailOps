import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const trekStatusUpdateSchema = new Schema(
  {
    batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
    milestone: String,
    updatedByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // Trek Leader only
    timestamp: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

const TrekStatusUpdate = model('TrekStatusUpdate', trekStatusUpdateSchema);
export default TrekStatusUpdate;

    