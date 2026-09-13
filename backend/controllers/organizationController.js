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
}