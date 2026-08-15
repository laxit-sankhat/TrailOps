import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'No token provided' });
    }
    const token = authHeader.split(' ')[1];

    try{
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (err) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
}

export const restrictTo = (...allowedRoles) => {
    return (req, res, next) => {
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'You do not have permission to perform this action' });
        }
        next();
    };
};

export const restrictToOwnOrg = (req, res, next) => {
    if (req.user.role === 'SuperAdmin') {
        return next(); 
    }

    const targetOrgId = req.params.organizationId || req.body.organizationId;

    if (!targetOrgId) {
        return res.status(400).json({ success: false, message: 'organizationId is required' });
    }

    if (targetOrgId !== req.user.organizationId) {
        return res.status(403).json({ success: false, message: 'You cannot access another organization\'s data' });
    }

    next();
};