import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const notificationSchema = new Schema({
  recipientUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  message: { type: String, required: true },
  relatedType: { type: String },
  relatedId: { type: Schema.Types.ObjectId },
  isRead: { type: Boolean, default: false }
}, { timestamps: true });

const Notification = model('Notification', notificationSchema);
export default Notification;
