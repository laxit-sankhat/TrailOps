import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const bookingGroupSchema = new Schema({
  batchId: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
  organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
  initiatorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  groupCode: { type: String, required: true, unique: true },
  status: { type: String, enum: ['Open', 'Processed', 'Waitlisted', 'Cancelled'], default: 'Open' }
}, { timestamps: true });

bookingGroupSchema.index({ batchId: 1 });

const BookingGroup = model('BookingGroup', bookingGroupSchema);
export default BookingGroup;