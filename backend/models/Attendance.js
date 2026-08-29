import mongoose from "mongoose";
const { Schema, model } = mongoose;

const attendenceSchema = new Schema(
    {
        participantId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        checkpointId: { type: Schema.Types.ObjectId, ref: 'CheckPoint', required: true },
        batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
        markedByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        timestamp: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

attendenceSchema.index({ participantId: 1, checkPointId: 1 }, { unique: true });

const Attendance = model('Attendance', attendenceSchema);
export default Attendance;