import Checkpoint from '../models/Checkpoint.js';
import Batch from '../models/Batch.js';
import BatchAssignment from '../models/BatchAssignment.js';
import Attendance from '../models/Attendance.js';

export const createCheckpoint = async (req, res) => {
    try{
        const { batchId, name, sequenceOrder } = req.body;      

        const assignment = await BatchAssignment.findOne({
            batchId,
            userId: req.user.userId,
            roleInBatch: 'TrekLeader'
        });

        if(!assignment)
            return res.status(403).json({ success: false, message: 'You are not assigned as Trek Leader for this batch' });

        const checkpoint = await Checkpoint.create({ batchId, name, sequenceOrder });

        res.status(201).json({ success: true, checkpoint });
    }
    catch(err){
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
};

export const markAttendance = async (req, res) => {
    try{
        const { participantId, checkpointId, batchId } = req.body;
        
        const assignment = await BatchAssignment.findOne({
            batchId,
            userId: req.user.userId,
            roleInBatch: { $in: ['TrekLeader', 'Volunteer'] }
        });

        if(!assignment)
            return res.status(403).json({ success: false, message: 'You are not assigned to this batch' });

        const markedByUserId = req.user.userId;

        const attendance = await Attendance.create({ participantId, checkpointId, batchId, markedByUserId });

        res.status(201).json({ success: true, attendance });
    }
    catch(err){
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
};