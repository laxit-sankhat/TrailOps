import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const integerRatingValidator = {
    validator: Number.isInteger,
    message: '{PATH} must be an integer'
};

const feedbackSchema = new Schema(
    {
        participantId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
        tripId: { type: Schema.Types.ObjectId, ref: 'Trip', required: true },
        organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
        batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
        ratingGuide: {
            type: Number,
            required: [true, 'ratingGuide is required'],
            min: [1, 'ratingGuide must be at least 1'],
            max: [5, 'ratingGuide cannot exceed 5'],
            validate: integerRatingValidator
        },
        ratingFood: {
            type: Number,
            required: [true, 'ratingFood is required'],
            min: [1, 'ratingFood must be at least 1'],
            max: [5, 'ratingFood cannot exceed 5'],
            validate: integerRatingValidator
        },
        ratingSafety: {
            type: Number,
            required: [true, 'ratingSafety is required'],
            min: [1, 'ratingSafety must be at least 1'],
            max: [5, 'ratingSafety cannot exceed 5'],
            validate: integerRatingValidator
        },
        ratingOverall: {
            type: Number,
            required: [true, 'ratingOverall is required'],
            min: [1, 'ratingOverall must be at least 1'],
            max: [5, 'ratingOverall cannot exceed 5'],
            validate: integerRatingValidator
        },
        comments: {
            type: String,
            trim: true,
            maxlength: [2000, 'comments cannot exceed 2000 characters']
        }
    },
    { timestamps: true }
);

// Indexes
feedbackSchema.index({ bookingId: 1 }, { unique: true, sparse: true });
feedbackSchema.index({ participantId: 1, createdAt: -1 });
feedbackSchema.index({ organizationId: 1, createdAt: -1 });
feedbackSchema.index({ batchId: 1 });

const Feedback = model('Feedback', feedbackSchema);
export default Feedback;

