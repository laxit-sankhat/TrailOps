import User from '../models/User.js';

export const updateMyProfile = async (req, res) => {
  try {
    const { fullName, mobileNumber, address, dob, profilePicture, emergencyContact } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { fullName, mobileNumber, address, dob, profilePicture, emergencyContact },
      { new: true, runValidators: true }
    );

    res.status(200).json({ success: true, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};