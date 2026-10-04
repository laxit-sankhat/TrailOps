import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const medicalProfileSchema = new Schema(
    {
        participantId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        bloodGroup: { type: String },
        allergies: { type: String },
        medicalConditions: { type: String },
        medications: { type: String },
        emergencyContactDetails: { type: String },
        reportFileUrl: { type: String },
        reportPublicId: { type: String },
        reportFileName: { type: String },
        reportResourceType: { type: String },
        validUntil: { type: Date }
    },
    { timestamps: true }
);

const MedicalProfile = model('MedicalProfile', medicalProfileSchema);
export default MedicalProfile;