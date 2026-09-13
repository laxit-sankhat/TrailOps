import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import OrganizationMembership from '../models/OrganizationMembership.js';
import { isPasswordValid } from '../utils/validators.js';

const ALLOWED_STAFF_ROLES = ['TripCoordinator', 'MedicalOfficer', 'TrekLeader', 'Volunteer'];

export const createStaffMember = async (req, res) => {
    try {
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

        const passwordHash = await bcrypt.hash(password, 10);

        const staffUser = await User.create({
            fullName,
            email,
            passwordHash,
            role
        });

        await OrganizationMembership.create({
            userId: staffUser._id,
            organizationId: req.user.organizationId, 
            role
        });

        res.status(201).json({
            success: true,
            staffUser: { id: staffUser._id, fullName: staffUser.fullName, email: staffUser.email, role: staffUser.role }
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
};

export const removeStaffMember = async (req, res) => {
  try {
    const membership = await OrganizationMembership.findOne({
      userId: req.params.userId,
      organizationId: req.user.organizationId
    });

    if (!membership) return res.status(404).json({ success: false, message: 'Staff member not found in your organization' });

    membership.status = 'Inactive';
    await membership.save();

    res.status(200).json({ success: true, message: 'Staff member deactivated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};