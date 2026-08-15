import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const organizationSchema = new Schema(
    {
        name: { type: String, required: true },
        registrationDetails: { type: String },
        contactEmail: { type: String, required: true },
        address: { type: String },
        status: {
            type: String,
            enum: ['Approved', 'Suspended'],
            default: 'Approved'
            }
    },
    { timestamps: true }
);

const Organization = model('Organization', organizationSchema);
export default Organization;