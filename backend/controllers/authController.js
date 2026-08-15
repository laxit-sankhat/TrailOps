import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import OrganizationMembership from "../models/OrganizationMembership.js";

export const login = async (req, res) => {
    try{
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);

        if(!isMatch){
            return res.status(401).json({ success: false, message: 'Invalid email or password' });
        }

        let organizationId = null;
        const membership = await OrganizationMembership.findOne({ userId: user._id });
        if (membership) {
            organizationId = membership.organizationId;
        }

        const token = jwt.sign(
            { userId: user._id, role: user.role, organizationId }, 
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        );

        res.status(200).json({
            success: true,
            token,
            user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role, organizationId }
        });
    }
    catch(err){
        res.status(500).json({ success: false, message: err.message });
    }
};

