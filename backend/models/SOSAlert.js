import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const sosAlert = new Schema(
  {
    batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
    triggeredByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    emergencyType: String,
    status: { type: String, enum: ['Open', 'Resolved'], default: 'Open' }
  },
  {
    timestamps: true
  }
);

const SOSAlert = model('SOSAlert', sosAlert);

export default SOSAlert;