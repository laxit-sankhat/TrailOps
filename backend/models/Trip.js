import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const trip = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    name: String,
    location: String,
    description: String,
    difficultyLevel: String,
    durationInHours: Number,
    startDate: Date,
    endDate: Date,
    basePrice: Number,
    status: String
  },
  {
    timestamps: true
  }
);

const Trip = model('Trip', trip);

export default Trip;