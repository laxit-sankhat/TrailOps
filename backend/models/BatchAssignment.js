import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const batchAssignmentSchema = new Schema(
    {
        batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        roleInBatch: { type: String, enum: ['TrekLeader', 'Volunteer'], required: true },
        supervisingTrekLeaderId: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    { timestamps: true }
);

batchAssignmentSchema.index({ batchId: 1, userId: 1 });

const BatchAssignment = model('BatchAssignment', batchAssignmentSchema);
export default BatchAssignment;

