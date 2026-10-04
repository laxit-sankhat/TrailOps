import mongoose from "mongoose";
const {Schema, model} = mongoose;

const userSchema = new Schema(
    {
        // Basic user information
        fullName: { type: String, required: true },

        // Email is unique and normalized
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
        },

        mobileNumber: { type: String },

        // Stores HASHED password, never the actual password
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

        // Password-reset security fields
        // Actual reset token is NOT stored; only its hash is stored
        resetTokenHash: { type: String, default: null },
        resetTokenExpiresAt: { type: Date, default: null },

        // MedicalOfficer only
        licenseNumber: { type: String },
        specialization: { type: String },

        // TrekLeader only
        certifications: [Object],

        // Volunteer only
        availability: Boolean

    },
    // Automatically adds createdAt and updatedAt
    { timestamps: true }
);

// Creates the MongoDB "users" collection through Mongoose
const User = model('User', userSchema);
export default User;
