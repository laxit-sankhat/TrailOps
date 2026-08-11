import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const gearItem = new Schema(
  {
    equipmentId: String,
    name: String,
    category: String,
    quantity: Number,
    condition: String,
    availabilityStatus: String
  },
  {
    timestamps: true
  }
);

const GearItem = model('GearItem', gearItem);

export default GearItem;