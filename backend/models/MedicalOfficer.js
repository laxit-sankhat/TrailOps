import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const medicalOfficer = new Schema(
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

    // ===== Medical Officer fields =====
    licenseNumber: String,
    specialization: String
  },
  {
    timestamps: true
  }
);

const MedicalOfficer = model('MedicalOfficer', medicalOfficer);

export default MedicalOfficer;