import User from '../models/User.js';
import OrganizationMembership from '../models/OrganizationMembership.js';

// Safe profile formatter ensuring sensitive fields (passwordHash, reset tokens) are never returned
const formatUserProfile = (user, organizationId = null) => {
  return {
    id: user._id,
    _id: user._id,
    fullName: user.fullName,
    email: user.email,
    mobileNumber: user.mobileNumber || '',
    address: user.address || '',
    dob: user.dob ? user.dob.toISOString() : null,
    profilePicture: user.profilePicture || '',
    emergencyContact: {
      name: user.emergencyContact?.name || '',
      relation: user.emergencyContact?.relation || '',
      phone: user.emergencyContact?.phone || ''
    },
    role: user.role,
    organizationId: organizationId || null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
};

export const getMyProfile = async (req, res) => {
  try {
    // Ownership strictly enforced via req.user.userId from verified JWT
    const user = await User.findById(req.user.userId).select('-passwordHash -resetTokenHash -resetTokenExpiresAt');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let organizationId = req.user.organizationId || null;
    if (!organizationId) {
      const membership = await OrganizationMembership.findOne({ userId: user._id });
      if (membership) {
        organizationId = membership.organizationId;
      }
    }

    res.status(200).json({
      success: true,
      user: formatUserProfile(user, organizationId)
    });
  } catch (err) {
    console.error('Error fetching profile:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateMyProfile = async (req, res) => {
  try {
    // Only extract explicitly allowed fields - never accept email, role, password, organizationId, or IDs
    const { fullName, mobileNumber, address, dob, profilePicture, emergencyContact } = req.body;

    const updateFields = {};

    // Validate and process fullName
    if (fullName !== undefined) {
      if (typeof fullName !== 'string' || !fullName.trim()) {
        return res.status(400).json({ success: false, message: 'Full name cannot be empty' });
      }
      updateFields.fullName = fullName.trim();
    }

    // Validate and process mobileNumber
    if (mobileNumber !== undefined) {
      if (mobileNumber !== null && typeof mobileNumber !== 'string') {
        return res.status(400).json({ success: false, message: 'Mobile number must be a string' });
      }
      updateFields.mobileNumber = mobileNumber ? mobileNumber.trim() : '';
    }

    // Validate and process address
    if (address !== undefined) {
      if (address !== null && typeof address !== 'string') {
        return res.status(400).json({ success: false, message: 'Address must be a string' });
      }
      updateFields.address = address ? address.trim() : '';
    }

    // Validate and process dob
    if (dob !== undefined) {
      if (dob === null || dob === '') {
        updateFields.dob = null;
      } else {
        const parsedDob = new Date(dob);
        if (Number.isNaN(parsedDob.getTime())) {
          return res.status(400).json({ success: false, message: 'Invalid date of birth' });
        }
        updateFields.dob = parsedDob;
      }
    }

    // Validate and process profilePicture
    if (profilePicture !== undefined) {
      if (profilePicture !== null && typeof profilePicture !== 'string') {
        return res.status(400).json({ success: false, message: 'Profile picture must be a string URL' });
      }
      updateFields.profilePicture = profilePicture ? profilePicture.trim() : '';
    }

    // Validate and process emergencyContact
    if (emergencyContact !== undefined) {
      if (emergencyContact === null) {
        updateFields.emergencyContact = { name: '', relation: '', phone: '' };
      } else if (typeof emergencyContact !== 'object' || Array.isArray(emergencyContact)) {
        return res.status(400).json({ success: false, message: 'Emergency contact must be an object' });
      } else {
        const { name, relation, phone } = emergencyContact;
        if (name !== undefined && typeof name !== 'string') {
          return res.status(400).json({ success: false, message: 'Emergency contact name must be a string' });
        }
        if (relation !== undefined && typeof relation !== 'string') {
          return res.status(400).json({ success: false, message: 'Emergency contact relation must be a string' });
        }
        if (phone !== undefined && typeof phone !== 'string') {
          return res.status(400).json({ success: false, message: 'Emergency contact phone must be a string' });
        }
        updateFields.emergencyContact = {
          name: name ? name.trim() : '',
          relation: relation ? relation.trim() : '',
          phone: phone ? phone.trim() : ''
        };
      }
    }

    // Ownership strictly enforced: user ID comes solely from verified JWT
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('-passwordHash -resetTokenHash -resetTokenExpiresAt');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let organizationId = req.user.organizationId || null;
    if (!organizationId) {
      const membership = await OrganizationMembership.findOne({ userId: user._id });
      if (membership) {
        organizationId = membership.organizationId;
      }
    }

    res.status(200).json({
      success: true,
      user: formatUserProfile(user, organizationId)
    });
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};