import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const nonWhitespaceValidator = {
  validator: function (value) {
    return typeof value === 'string' && value.trim().length > 0;
  },
  message: '{PATH} cannot be empty or contain only whitespace'
};

const tripSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    name: {
      type: String,
      required: [true, 'Trip name is required'],
      trim: true,
      maxlength: [150, 'Trip name cannot exceed 150 characters'],
      validate: nonWhitespaceValidator
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
      maxlength: [150, 'Location cannot exceed 150 characters'],
      validate: nonWhitespaceValidator
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters']
    },
    difficultyLevel: {
      type: String,
      required: [true, 'Difficulty level is required'],
      enum: {
        values: ['Easy', 'Moderate', 'Difficult'],
        message: 'difficultyLevel must be Easy, Moderate, or Difficult'
      }
    },
    durationDays: {
      type: Number,
      required: [true, 'Duration in days is required'],
      min: [1, 'durationDays must be at least 1']
    },
    startDate: {
      type: Date
    },
    endDate: {
      type: Date,
      validate: {
        validator: function (value) {
          if (!value || !this.startDate) return true;
          return new Date(value) >= new Date(this.startDate);
        },
        message: 'endDate cannot be earlier than startDate'
      }
    },
    basePrice: {
      type: Number,
      required: [true, 'Base price is required'],
      min: [0, 'basePrice cannot be negative']
    },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    imageUrl: { type: String, default: null },
    imagePublicId: { type: String, default: null }, 
    images: {
      type: [{ url: { type: String, required: true }, publicId: { type: String, required: true } }],
      default: []
    },
  },
  {
    timestamps: true
  }
);

tripSchema.index({ organizationId: 1 });

const Trip = model('Trip', tripSchema);

export default Trip;