import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import OrganizationMembership from '../models/OrganizationMembership.js';

const ALLOWED_STAFF_ROLES = ['TripCoordinator', 'MedicalOfficer', 'TrekLeader', 'Volunteer'];

export const createStaffMember = async (req, res) => {
    try {
        const { fullName, email, password, role } = req.body;
        
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