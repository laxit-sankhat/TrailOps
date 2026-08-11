import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const attendanceRecord = new Schema(
  {
    attendanceId: String,
    checkpointName: String,
    timestamp: Date,
    status: String
  },
  {
    timestamps: true
  }
);

const AttendanceRecord = model('AttendanceRecord', attendanceRecord);

export default AttendanceRecord;