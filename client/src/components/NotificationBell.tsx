import { useCallback, useEffect, useState } from 'react';
import { getMyNotifications, markNotificationRead } from '../services/notificationService';

type NotificationItem = {
  _id: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const refreshNotifications = useCallback(async () => {
    try {
      const response = await getMyNotifications();
      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unreadCount || 0);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    const initialRefresh = window.setTimeout(refreshNotifications, 0);
    const intervalId = window.setInterval(refreshNotifications, 30_000);
    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(intervalId);
    };
  }, [refreshNotifications]);

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      await refreshNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
        style={{ padding: '0.45rem 0.75rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}
      >
        Notifications
        {unreadCount > 0 && (
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: '1.25rem', height: '1.25rem', marginLeft: '0.4rem', borderRadius: '9999px', background: '#dc2626', color: '#fff', fontSize: '0.7rem' }}>
            {unreadCount}
          </span>
        )}
      </button>
      {isOpen && (
        <div style={{ position: 'absolute', zIndex: 20, top: 'calc(100% + 0.5rem)', right: 0, width: 'min(22rem, calc(100vw - 2rem))', maxHeight: '24rem', overflowY: 'auto', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', boxShadow: 'var(--shadow-lg)', color: 'var(--text-main)' }}>
          <strong>Recent notifications</strong>
          {notifications.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.75rem' }}>No notifications.</p>
          ) : (
            <ul style={{ listStyle: 'none', marginTop: '0.75rem' }}>
              {notifications.map((notification) => (
                <li key={notification._id} style={{ padding: '0.65rem 0', borderTop: '1px solid var(--border-color)', background: notification.isRead ? 'transparent' : 'var(--bg-surface-alt)' }}>
                  <p style={{ margin: '0 0 0.25rem', fontSize: '0.85rem' }}>{notification.message}</p>
                  <time dateTime={notification.createdAt} style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{new Date(notification.createdAt).toLocaleString()}</time>
                  {!notification.isRead && (
                    <button type="button" onClick={() => handleMarkRead(notification._id)} style={{ display: 'block', marginTop: '0.35rem', padding: 0, background: 'transparent', color: 'var(--primary-accent)', fontSize: '0.75rem' }}>
                      Mark as read
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
