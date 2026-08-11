import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const booking = new Schema(
  {
    bookingId: String,
    registrationDate: Date,
    status: String,
    qrCodeValue: String,
    certificateCode: String,
    certificateGeneratedAt: Date,
    certificatePdfUrl: String
  },
  {
    timestamps: true
  }
);

const Booking = model('Booking', booking);

export default Booking;