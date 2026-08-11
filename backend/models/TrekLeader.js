import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const trekLeader = new Schema(
  {
    // ===== User fields =====
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

    // ===== Trek Leader fields =====
    certifications: [Object]
  },
  {
    timestamps: true
  }
);

const TrekLeader = model('TrekLeader', trekLeader);

export default TrekLeader;