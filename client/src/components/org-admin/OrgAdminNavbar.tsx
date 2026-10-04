import { useAuth } from '../../context/AuthContext';
import NotificationBell from '../NotificationBell';
import { LogOut, User as UserIcon } from 'lucide-react';
import './OrgAdminNavbar.css';

export default function OrgAdminNavbar() {
  const { user, logout } = useAuth();

  return (
    <header className="org-admin-navbar" aria-label="Organization administrator top bar">
      <div className="org-admin-navbar__context">
        <span className="org-admin-navbar__portal-title">Organization Operations</span>
      </div>

      <div className="org-admin-navbar__actions">
        {user && (
          <div className="org-admin-navbar__notifications">
            <NotificationBell />
          </div>
        )}

        {user && (
          <div className="org-admin-navbar__user-profile" title={user.fullName || 'Org Admin'}>
            <div className="org-admin-navbar__user-avatar" aria-hidden="true">
              <UserIcon size={16} />
            </div>
            <span className="org-admin-navbar__user-name">
              {user.fullName || 'Org Admin'}
            </span>
            <span className="org-admin-navbar__role-badge">
              ORGADMIN
            </span>
          </div>
        )}

        <button
          type="button"
          className="org-admin-navbar__logout-btn"
          onClick={() => logout()}
          title="Sign out of your organization account"
          aria-label="Log Out"
        >
          <LogOut size={15} aria-hidden="true" />
          <span>Log Out</span>
        </button>
      </div>
    </header>
  );
}
