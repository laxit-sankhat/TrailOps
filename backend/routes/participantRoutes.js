import express from 'express';
import { registerParticipant } from '../controllers/participantController.js';

const router = express.Router();

router.post('/', registerParticipant);

export default router;
