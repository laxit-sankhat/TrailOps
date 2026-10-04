import Organization from "../models/Organization.js";
import User from "../models/User.js";
import OrganizationMembership from "../models/OrganizationMembership.js";
import bcrypt from "bcryptjs";
import { isPasswordValid } from '../utils/validators.js';

export const createOrganization = async (req, res) => {
    try{
        const{
            orgName, registrationDetails, contactEmail, address, orgAdminName, orgAdminEmail, orgAdminPassword
        } = req.body;

        const organization = await Organization.create(
            {
                name: orgName,
                registrationDetails,
                contactEmail,
                address
            }
        );

        if (!isPasswordValid(orgAdminPassword)) {
            return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long' });
        }

        const passwordHash = await bcrypt.hash(orgAdminPassword, 10);

        const orgAdminUser = await User.create(
            {
                fullName: orgAdminName,
                email: orgAdminEmail,
                passwordHash,
                role: 'OrgAdmin'
            }
        );

        await OrganizationMembership.create(
            {
                userId: orgAdminUser._id,
                organizationId: organization._id,
                role: 'OrgAdmin'
            }
        );

        res.status(201).json({
            success: true,
            message: 'Organization and OrgAdmin created successfully', 
            organization, 
            orgAdminUser: {id: orgAdminUser._id, email: orgAdminUser.email }
        });
    }
    catch(err){
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
};

export const getMyOrgProfile = async (req, res) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(403).json({ success: false, message: 'No organization scope found for your account' });
    }

    const organization = await Organization.findById(req.user.organizationId)
      .select('_id name registrationDetails contactEmail address status createdAt updatedAt')
      .lean();

    if (!organization) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    res.status(200).json({
      success: true,
      organization
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Unable to retrieve organization profile' });
  }
};

export const updateMyOrgProfile = async (req, res) => {
  try {
    if (!req.user?.organizationId) {
      return res.status(403).json({ success: false, message: 'No organization scope found for your account' });
    }

    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ success: false, message: 'Invalid request payload' });
    }

    const { name, registrationDetails, contactEmail, address } = req.body;
    const updateFields = {};

    // Validate name
    if (name !== undefined) {
      if (typeof name !== 'string') {
        return res.status(400).json({ success: false, message: 'Organization name must be a string' });
      }
      const trimmedName = name.trim();
      if (!trimmedName) {
        return res.status(400).json({ success: false, message: 'Organization name cannot be empty' });
      }
      if (trimmedName.length > 100) {
        return res.status(400).json({ success: false, message: 'Organization name cannot exceed 100 characters' });
      }
      updateFields.name = trimmedName;
    }

    // Validate registrationDetails
    if (registrationDetails !== undefined) {
      if (registrationDetails === null || registrationDetails === '') {
        updateFields.registrationDetails = '';
      } else if (typeof registrationDetails !== 'string') {
        return res.status(400).json({ success: false, message: 'Registration details must be a string' });
      } else {
        const trimmedReg = registrationDetails.trim();
        if (trimmedReg.length > 1000) {
          return res.status(400).json({ success: false, message: 'Registration details cannot exceed 1000 characters' });
        }
        updateFields.registrationDetails = trimmedReg;
      }
    }

    // Validate contactEmail
    if (contactEmail !== undefined) {
      if (typeof contactEmail !== 'string') {
        return res.status(400).json({ success: false, message: 'Contact email must be a string' });
      }
      const trimmedEmail = contactEmail.trim().toLowerCase();
      if (!trimmedEmail) {
        return res.status(400).json({ success: false, message: 'Contact email cannot be empty' });
      }
      const emailRegex = /^\S+@\S+\.\S+$/;
      if (!emailRegex.test(trimmedEmail)) {
        return res.status(400).json({ success: false, message: 'Please provide a valid contact email address' });
      }
      if (trimmedEmail.length > 150) {
        return res.status(400).json({ success: false, message: 'Contact email cannot exceed 150 characters' });
      }
      updateFields.contactEmail = trimmedEmail;
    }

    // Validate address
    if (address !== undefined) {
      if (address === null || address === '') {
        updateFields.address = '';
      } else if (typeof address !== 'string') {
        return res.status(400).json({ success: false, message: 'Address must be a string' });
      } else {
        const trimmedAddress = address.trim();
        if (trimmedAddress.length > 300) {
          return res.status(400).json({ success: false, message: 'Address cannot exceed 300 characters' });
        }
        updateFields.address = trimmedAddress;
      }
    }

    // If no valid editable fields were provided
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid editable fields provided' });
    }

    // Check if another organization is already using this contactEmail
    if (updateFields.contactEmail) {
      const existing = await Organization.findOne({
        contactEmail: updateFields.contactEmail,
        _id: { $ne: req.user.organizationId }
      });
      if (existing) {
        return res.status(409).json({ success: false, message: 'Contact email is already registered to another organization' });
      }
    }

    const updatedOrg = await Organization.findByIdAndUpdate(
      req.user.organizationId,
      { $set: updateFields },
      { new: true, runValidators: true }
    )
      .select('_id name registrationDetails contactEmail address status createdAt updatedAt')
      .lean();

    if (!updatedOrg) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    res.status(200).json({
      success: true,
      organization: updatedOrg
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Contact email is already registered to another organization' });
    }
    console.error(err);
    res.status(500).json({ success: false, message: 'Unable to update organization profile' });
  }
};