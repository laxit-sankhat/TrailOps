import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from '../NotificationBell';
import { LogOut, User as UserIcon } from 'lucide-react';
import './ParticipantNavbar.css';

export default function ParticipantNavbar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const getContextTitle = () => {
    const path = location.pathname;
    if (path.includes('/explore')) return 'Explore Treks';
    if (path.includes('/trips')) return 'My Trips';
    if (path.includes('/bookings')) return 'My Bookings';
    if (path.includes('/groups')) return 'Group Bookings';
    if (path.includes('/medical')) return 'Medical Profile';
    if (path.includes('/feedback')) return 'Trek Feedback';
    if (path.includes('/profile')) return 'Account Profile';
    return 'Participant Portal';
  };

  return (
    <header className="participant-navbar" aria-label="Participant top bar">
      <div className="participant-navbar__context">
        <span className="participant-navbar__portal-title">{getContextTitle()}</span>
      </div>

      <div className="participant-navbar__actions">
        {user && (
          <div className="participant-navbar__notifications">
            <NotificationBell />
          </div>
        )}

        {user && (
          <div
            className="participant-navbar__user-profile"
            title={user.fullName || user.email || 'Participant'}
          >
            <div className="participant-navbar__user-avatar" aria-hidden="true">
              <UserIcon size={16} />
            </div>
            <span className="participant-navbar__user-name">
              {user.fullName || user.email?.split('@')[0] || 'Participant'}
            </span>
            <span className="participant-navbar__role-badge">
              PARTICIPANT
            </span>
          </div>
        )}

        <button
          type="button"
          className="participant-navbar__logout-btn"
          onClick={() => logout()}
          title="Sign out of your TrailOps account"
          aria-label="Log Out"
        >
          <LogOut size={15} aria-hidden="true" />
          <span>Log Out</span>
        </button>
      </div>
    </header>
  );
}
