import mongoose from "mongoose";
const {Schema, model} = mongoose;

const userSchema = new Schema(
    {
        fullName: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        mobileNumber: { type: String },
        passwordHash: { type: String, required: true },
        address: { type: String },
        dob: { type: Date },
        profilePicture: { type: String },

        emergencyContact: {
            name: { type: String },
            relation: { type: String },
            phone: { type: String }
        },

        role: {
            type: String,
            enum: [
                'SuperAdmin',
                'OrgAdmin',
                'TripCoordinator',
                'MedicalOfficer',
                'TrekLeader',
                'Volunteer',
                'Participant'
            ],
            required: true
        },

        // MedicalOfficer only
        licenseNumber: { type: String },
        specialization: { type: String },

        // TrekLeader only
        certifications: [Object],

        // Volunteer only
        availability: Boolean

    },
    { timestamps: true }
);

const User = model('User', userSchema);
export default User;
