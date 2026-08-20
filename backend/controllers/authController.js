import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import OrganizationMembership from "../models/OrganizationMembership.js";
import RefreshToken from "../models/RefreshToken.js";

//creates AccessToken
const issueAccessToken = (user, organizationId) => {
    return jwt.sign(
        { userId: user._id, role: user.role, organizationId },
        process.env.JWT_ACCESS_SECRET,
        { expiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN }
    );
};
//creates RefreshToken
const issueRefreshToken = (user) => {
    return jwt.sign(
        { userId: user._id },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN }
    );
};

//Sets Cookie
const setRefreshCookie = (res, refreshToken) => {
    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000
    });
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        //Authenticate User From Stored passwordHash
        const isMatch = await bcrypt.compare(password, user.passwordHash);

        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        //Assigns Appropriate OrganizationId
        let organizationId = null;
        const membership = await OrganizationMembership.findOne({ userId: user._id });

        if (membership) {
            organizationId = membership.organizationId;
        }

        //Calls for Token creation
        const accessToken = issueAccessToken(user, organizationId);
        const refreshToken = issueRefreshToken(user);

        //Creates RefreshTokenHash then deletes all previous Hash from DB,and creates new record of that 
        const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

        await RefreshToken.deleteMany({ userId: user._id });

        await RefreshToken.create({
            userId: user._id,
            tokenHash: refreshTokenHash,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });

        //Setting RefreshToken into Cookie
        setRefreshCookie(res, refreshToken);

        return res.status(200).json({
            success: true,
            accessToken,
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                organizationId
            }
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};

//Calls by frontend upon catch error,when Accesstoken expires and Sends Cookies as "req"
export const refresh = async (req, res) => {
    try {
        const refreshToken = req.cookies?.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({
                success: false,
                message: "Refresh token missing"
            });
        }

        //Verifies JWT among it's stored RefreshSecret
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

        const user = await User.findById(decoded.userId);

        //From DB find the Stored RefreshHash using UserID and Compare it with our RefrehToken
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User not found"
            });
        }

        const storedTokens = await RefreshToken.find({ userId: user._id });

        let validTokenFound = false;

        for (const storedToken of storedTokens) {
            const match = await bcrypt.compare(refreshToken, storedToken.tokenHash);

            if (match) {
                validTokenFound = true;
                break;
            }
        }

        if (!validTokenFound) {
            return res.status(401).json({
                success: false,
                message: "Refresh token is invalid or revoked"
            });
        }

        let organizationId = null;
        const membership = await OrganizationMembership.findOne({ userId: user._id });

        if (membership) {
            organizationId = membership.organizationId;
        }
        //At last Creating Access token after Successful RefeshToken's Validation
        const newAccessToken = issueAccessToken(user, organizationId);

        return res.status(200).json({
            success: true,
            accessToken: newAccessToken
        });
    } catch (err) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired refresh token"
        });
    }
};

//On logout We delete all RefreshToken stored db with UserId,also clears cookie
export const logout = async (req, res) => {
    try {
        const refreshToken = req.cookies?.refreshToken;

        if (refreshToken) {
            try {
                const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

                await RefreshToken.deleteMany({ userId: decoded.userId });
            } catch (err) {
                // ignore invalid token on logout
            }
        }

        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict"
        });

        return res.status(200).json({
            success: true,
            message: "Logged out successfully"
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message
        });
    }
};