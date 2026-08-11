import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const batch = new Schema(
  {
    batchId: String,
    batchName: String,
    startDate: Date,
    endDate: Date,
    maxCapacity: Number,
    status: String,
    currentMilestone: String
  },
  {
    timestamps: true
  }
);

const Batch = model('Batch', batch);

export default Batch;