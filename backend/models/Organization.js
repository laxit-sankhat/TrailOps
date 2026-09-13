import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const organizationSchema = new Schema(
    {
        name: { type: String, required: true },
        registrationDetails: { type: String },
        contactEmail: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
        },
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