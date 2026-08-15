import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const checkpointSchema = new Schema(
    {
        batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
        name: { type: String },
        sequinceNumber: { type: Number },
    },
    { timestamps: true }
);

const Checkpoint = model('Checkpoint', checkpointSchema);
export default Checkpoint;

