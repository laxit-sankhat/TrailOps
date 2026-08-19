import bcrypt from 'bcryptjs';
import User from '../models/User.js';

export const registerParticipant = async (req, res) => {
  try {
    const { fullName, email, password, mobileNumber, dob } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const participant = await User.create({
      fullName,
      email,
      passwordHash,
      mobileNumber,
      dob,
      role: 'Participant' // hardcoded - never trust client-supplied role here
    });

    res.status(201).json({
      success: true,
      participant: { id: participant._id, fullName: participant.fullName, email: participant.email }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};