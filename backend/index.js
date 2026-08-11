import mongoose from "mongoose";
import User from './model/User.js';
import Participant from './model/Participant.js';
import MedicalOfficer from './model/MedicalOfficer.js';
import Admin from './model/Admin.js';
import Volunteer from './model/Volunteer.js';
import TrekLeader from './model/TrekLeader.js';
import AttendanceRecord from './model/AttendanceRecord.js';
import Trip from './model/Trip.js';
import SOSAlert from './model/SOSAlert.js';
import Booking from './model/Booking.js';
import Batch from './model/Batch.js';

import GearAllocation from './model/GearAllocation.js';
import GearItem from './model/GearItem.js';

mongoose.connect("mongodb+srv://urvapatel6674_db_user:<urvapatel6674_db_user>@cluster0.dihr7qn.mongodb.net/")

const admin=await Admin.create({
    userId: "admin001",
    fullName: "Admin User",
    email: "admin123@gmail.com",
    mobileNumber: "1234567890",
    passwordHash: "hashed_password",
    address: "123 Admin St, City, Country",
    dob: new Date("1990-01-01"),
    profilePicture: "https://example.com/profile.jpg",
    emergencyContact: {
        name: "Emergency Contact",
        relationship: "Spouse",
        mobileNumber: "0987654321"
    },
    role: "admin",
    organizationName: "Invisible",
    permissions: ["manage_users", "view_reports", "edit_settings"]
});
console.log("Admin created:", admin);