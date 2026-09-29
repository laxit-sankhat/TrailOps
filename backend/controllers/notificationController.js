import Notification from '../models/Notification.js';

export const getMyNotifications = async (req, res) => {
  try {
    const recipientUserId = req.user.userId;
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ recipientUserId }).sort({ createdAt: -1 }).limit(50),
      Notification.countDocuments({ recipientUserId, isRead: false })
    ]);
    res.status(200).json({ success: true, notifications, unreadCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    if (notification.recipientUserId.toString() !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'This notification does not belong to you' });
    }

    notification.isRead = true;
    await notification.save();
    res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};
