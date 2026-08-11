import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const sosAlert = new Schema(
  {
    sosId: String,
    emergencyType: String,
    triggeredAt: Date,
    status: String,
    incidentDescription: String,
    actionTaken: String
  },
  {
    timestamps: true
  }
);

const SOSAlert = model('SOSAlert', sosAlert);

export default SOSAlert;