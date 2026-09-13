import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const tripSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    name: String,
    location: String,
    description: String,
    difficultyLevel: { type: String, enum: ['Easy', 'Moderate', 'Difficult'] },
    durationInHours: { type: Number, min: 1, max: 90 },
    startDate: Date,
    endDate: Date,
    basePrice: { type: Number, min: 0 },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    imageUrl: { type: String, default: null },
  },
  {
    timestamps: true
  }
);

tripSchema.index({ organizationId: 1 });

const Trip = model('Trip', tripSchema);

export default Trip;