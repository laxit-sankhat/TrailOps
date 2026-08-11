import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const gearAllocation = new Schema(
  {
    allocationId: String,
    rentedAt: Date,
    returnDate: Date,
    returnCondition: String
  },
  {
    timestamps: true
  }
);

const GearAllocation = model('GearAllocation', gearAllocation);

export default GearAllocation;