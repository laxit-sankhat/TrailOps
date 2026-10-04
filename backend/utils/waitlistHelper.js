import Booking from '../models/Booking.js';
import Batch from '../models/Batch.js';
import BookingGroup from '../models/BookingGroup.js';

export const ACTIVE_STATUSES = ['Inquiry', 'PendingMedicalReview', 'MedicallyApproved', 'Confirmed'];

/**
 * Promotes the next eligible waitlisted booking (or group) to 'Inquiry' for a given batch.
 * Preserves group atomicity (never splits a group) and true FIFO queue order (createdAt: 1).
 * Supports participating in an external Mongoose transaction session (SEC-01).
 *
 * @param {string|import('mongoose').Types.ObjectId} batchId
 * @param {import('mongoose').ClientSession|null} [session=null] - Optional Mongoose session for transactional execution.
 * @returns {Promise<{ promoted: number, isGroup: boolean, groupId?: any, bookingId?: any } | null>}
 */
export const promoteWaitlistForBatch = async (batchId, session = null) => {
  if (!batchId) return null;

  // 1. Load Batch (and serialize via reservationLock mutex if session is provided)
  let batchDoc;
  if (session) {
    batchDoc = await Batch.findOneAndUpdate(
      { _id: batchId },
      { $inc: { reservationLock: 1 } },
      { session, new: true }
    );
  } else {
    batchDoc = await Batch.findById(batchId);
  }

  if (!batchDoc) return null;

  // 2. Calculate current real-time seat availability
  const countQuery = Booking.countDocuments({
    batchId,
    status: { $in: ACTIVE_STATUSES }
  });
  if (session) countQuery.session(session);
  const currentlyOccupied = await countQuery;

  const seatsFree = batchDoc.maxCapacity - currentlyOccupied;
  if (seatsFree <= 0) {
    return null;
  }

  // 3. Find next waitlisted booking in strict FIFO order by creation timestamp
  const nextQuery = Booking.findOne({
    batchId,
    status: 'Waitlisted'
  }).sort({ createdAt: 1 });
  if (session) nextQuery.session(session);
  const nextInLine = await nextQuery;

  if (!nextInLine) {
    return null;
  }

  if (nextInLine.groupId) {
    // Group promotion: must promote all waitlisted members together or none
    const groupQuery = Booking.find({
      groupId: nextInLine.groupId,
      status: 'Waitlisted'
    });
    if (session) groupQuery.session(session);
    const groupMembers = await groupQuery;

    if (groupMembers.length === 0) {
      return null;
    }

    if (seatsFree >= groupMembers.length) {
      const updateQuery = Booking.updateMany(
        {
          _id: { $in: groupMembers.map((m) => m._id) },
          status: 'Waitlisted'
        },
        { $set: { status: 'Inquiry' } }
      );
      if (session) updateQuery.session(session);
      const updateResult = await updateQuery;

      const bgQuery = BookingGroup.updateOne(
        { _id: nextInLine.groupId },
        { $set: { status: 'Processed' } }
      );
      if (session) bgQuery.session(session);
      await bgQuery;

      return {
        promoted: updateResult.modifiedCount,
        isGroup: true,
        groupId: nextInLine.groupId
      };
    }
    // Not enough freed capacity for the whole group yet - head-of-line blocking
    return null;
  } else {
    // Individual promotion: atomically transition from 'Waitlisted' to 'Inquiry'
    const options = { new: true };
    if (session) options.session = session;

    const promotedBooking = await Booking.findOneAndUpdate(
      {
        _id: nextInLine._id,
        status: 'Waitlisted'
      },
      { $set: { status: 'Inquiry' } },
      options
    );

    if (!promotedBooking) {
      // Concurrently promoted by another process
      return null;
    }

    return {
      promoted: 1,
      isGroup: false,
      bookingId: promotedBooking._id
    };
  }
};
