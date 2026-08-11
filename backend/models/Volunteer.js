import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const volunteer = new Schema(
  {
    // User
    userId: String,
    fullName: String,
    email: String,
    mobileNumber: String,
    passwordHash: String,
    address: String,
    dob: Date,
    profilePicture: String,
    emergencyContact: {
      name: String,
      phone: String,
      relation: String
    },
    role: String,

    // Volunteer
    availability: Boolean,
    assignedRole: String
  },
  {
    timestamps: true
  }
);

const Volunteer = model('Volunteer', volunteer);

export default Volunteer;