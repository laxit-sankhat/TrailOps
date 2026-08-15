import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const feedbackSchema = new Schema(
    {
        participantId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        tripId: { type: Schema.Types.ObjectId, ref: 'Trip', required: true },
        organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
        batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
        ratingGuide: { type: Number, min: 1, max: 5 },
        ratingFood: { type: Number, min: 1, max: 5 },
        ratingSafety: { type: Number, min: 1, max: 5 },
        ratingOverall: { type: Number, min: 1, max: 5 },
        comments: { type: String }
    },
    { timestamps: true }
);

const Feedback = model('Feedback', feedbackSchema);
export default Feedback;

