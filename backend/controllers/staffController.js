import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import OrganizationMembership from '../models/OrganizationMembership.js';
import RefreshToken from '../models/RefreshToken.js';
import BatchAssignment from '../models/BatchAssignment.js';
import Batch from '../models/Batch.js';
import { isPasswordValid } from '../utils/validators.js';

const ALLOWED_STAFF_ROLES = ['TripCoordinator', 'MedicalOfficer', 'TrekLeader', 'Volunteer'];

export const createStaffMember = async (req, res) => {
    try {
        if (!req.user?.organizationId) {
            return res.status(403).json({ success: false, message: 'No organization scope found for your account' });
        }

        const { fullName, email, password, role } = req.body;
        
        if (!isPasswordValid(password)) {
            return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long' });
        }

        // Roles are restricted to a fixed allowlist, never trusted from the client
        // as-is - otherwise an authenticated Org Admin could set role: 'SuperAdmin'
        // on a new staff account and grant themselves platform-wide access.
        if (!ALLOWED_STAFF_ROLES.includes(role)) {
            return res.status(400).json({
                success: false,
                message: `role must be one of: ${ALLOWED_STAFF_ROLES.join(', ')}`
            });
        }

        const normalizedEmail = typeof email === 'string' ? email.toLowerCase().trim() : '';
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: 'A user with this email already exists.'
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const session = await mongoose.startSession();
        session.startTransaction();

        let staffUser;
        try {
            const [createdUser] = await User.create([{
                fullName: typeof fullName === 'string' ? fullName.trim() : fullName,
                email: normalizedEmail,
                passwordHash,
                role
            }], { session });

            await OrganizationMembership.create([{
                userId: createdUser._id,
                organizationId: req.user.organizationId,
                role
            }], { session });

            await session.commitTransaction();
            staffUser = createdUser;
        } catch (txErr) {
            await session.abortTransaction();
            if (txErr.code === 11000) {
                return res.status(409).json({
                    success: false,
                    message: 'A user with this email already exists.'
                });
            }
            throw txErr;
        } finally {
            session.endSession();
        }

        res.status(201).json({
            success: true,
            staffUser: { id: staffUser._id, fullName: staffUser.fullName, email: staffUser.email, role: staffUser.role }
        });
    }
    catch (err) {
        console.error(err);
        if (err.code === 11000) {
            return res.status(409).json({ success: false, message: 'A user with this email already exists.' });
        }
        res.status(500).json({ success: false, message: err.message });
    }
};

export const removeStaffMember = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    if (!req.user?.organizationId) {
      return res.status(403).json({ success: false, message: 'No organization scope found for your account' });
    }

    const membership = await OrganizationMembership.findOne({
      userId: req.params.userId,
      organizationId: req.user.organizationId
    });

    if (!membership) return res.status(404).json({ success: false, message: 'Staff member not found in your organization' });

    // Check if staff member is assigned to an ongoing batch (active expedition)
    const now = new Date();
    const ongoingBatches = await Batch.find({
      organizationId: req.user.organizationId,
      status: { $nin: ['Completed', 'Cancelled '] },
      startDate: { $lte: now },
      endDate: { $gte: now }
    });
    const ongoingBatchIds = ongoingBatches.map(b => b._id);
    if (ongoingBatchIds.length > 0) {
      const ongoingAssignment = await BatchAssignment.findOne({
        userId: req.params.userId,
        batchId: { $in: ongoingBatchIds }
      }).populate('batchId');

      if (ongoingAssignment) {
        return res.status(400).json({
          success: false,
          message: `Cannot deactivate staff member while assigned to ongoing batch "${ongoingAssignment.batchId?.batchName || 'active departure'}". Please reassign or conclude the batch first.`
        });
      }
    }

    membership.status = 'Inactive';
    await membership.save();

    await RefreshToken.deleteMany({ userId: membership.userId });

    // Clean up future/active operational batch assignments (preserving completed and cancelled historical records)
    const operationalBatches = await Batch.find({
      organizationId: req.user.organizationId,
      status: { $nin: ['Completed', 'Cancelled '] }
    });
    const operationalBatchIds = operationalBatches.map(b => b._id);
    if (operationalBatchIds.length > 0) {
      await BatchAssignment.deleteMany({
        userId: req.params.userId,
        batchId: { $in: operationalBatchIds }
      });
      await BatchAssignment.updateMany(
        { batchId: { $in: operationalBatchIds }, supervisingTrekLeaderId: req.params.userId },
        { $unset: { supervisingTrekLeaderId: '' } }
      );
    }

    res.status(200).json({ success: true, message: 'Staff member deactivated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const reactivateStaffMember = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    if (!req.user?.organizationId) {
      return res.status(403).json({ success: false, message: 'No organization scope found for your account' });
    }

    const membership = await OrganizationMembership.findOne({
      userId: req.params.userId,
      organizationId: req.user.organizationId
    }).populate('userId', 'fullName email role');

    if (!membership) {
      return res.status(404).json({ success: false, message: 'Staff member not found in your organization' });
    }

    membership.status = 'Active';
    await membership.save();

    res.status(200).json({
      success: true,
      message: 'Staff member reactivated successfully',
      staff: membership
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getStaffMemberById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.userId)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID' });
    }

    if (!req.user?.organizationId) {
      return res.status(403).json({ success: false, message: 'No organization scope found for your account' });
    }

    const membership = await OrganizationMembership.findOne({
      userId: req.params.userId,
      organizationId: req.user.organizationId
    }).populate('userId', 'fullName email role');

    if (!membership) {
      return res.status(404).json({ success: false, message: 'Staff member not found in your organization' });
    }

    res.status(200).json({ success: true, staff: membership });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getMyOrgStaff = async (req, res) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(403).json({ success: false, message: 'No organization scope found for your account' });
    }

    const filter = { organizationId: req.user.organizationId };
    if (req.query.status && req.query.status !== 'all') {
      filter.status = req.query.status;
    }

    const memberships = await OrganizationMembership.find(filter)
      .populate('userId', 'fullName email role');
    const staff = Array.from(new Map(
      memberships
        .filter((membership) => membership.userId)
        .map((membership) => [membership.userId._id.toString(), membership])
    ).values());
    res.status(200).json({ success: true, staff });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};