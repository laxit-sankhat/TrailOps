import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const admin = new Schema(
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

    // ===== Admin fields =====
    organizationName: String,
    permissions: [String]
  },
  {
    timestamps: true
  }
);

const Admin = model('Admin', admin);

export default Admin;