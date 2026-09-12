import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const tripSchema = new Schema(
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

tripSchema.index({ organizationId: 1 });

const Trip = model('Trip', tripSchema);

export default Trip;