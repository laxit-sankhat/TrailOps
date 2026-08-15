import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const incidentSchema = new Schema(
    {
        sosAlertId: { type: Schema.Types.ObjectId, ref: 'SOSAlert' },
        batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
        affectParticipantId: { type: Schema.Types.ObjectId, ref: 'User' },
        description: { type: String },
        actionTaken: { type: String },
        loggedByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        volunteerNotes: { type: String },
    },
    { timestamps: true }
);

const Incident = model('Incident', incidentSchema);
export default Incident;