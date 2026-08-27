import MedicalProfile from '../models/MedicalProfile.js';

export const uploadMedicalProfile = async (req, res) => {
  try {
    const { bloodGroup, allergies, medicalConditions, medications, emergencyContactDetails, reportFileUrl, validUntil } = req.body;

    const profile = await MedicalProfile.create({
      participantId: req.user.userId,
      bloodGroup,
      allergies,
      medicalConditions,
      medications,
      emergencyContactDetails,
      reportFileUrl,
      validUntil
    });

    res.status(201).json({ success: true, profile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};