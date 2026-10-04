import {
  BarChart3,
  Building2,
  CalendarDays,
  LayoutDashboard,
  Map,
  Package,
  Star,
  Users
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import './OrgAdminSidebar.css';

const navigationGroups = [
  {
    label: 'Operations',
    items: [
      { label: 'Trips', path: '/dashboard/org-admin/trips', icon: Map },
      { label: 'Batches', path: '/dashboard/org-admin/batches', icon: CalendarDays },
      { label: 'Staff', path: '/dashboard/org-admin/staff', icon: Users },
      { label: 'Gear', path: '/dashboard/org-admin/gear', icon: Package }
    ]
  },
  {
    label: 'Insights',
    items: [
      { label: 'Analytics', path: '/dashboard/org-admin/analytics', icon: BarChart3 },
      { label: 'Feedback', path: '/dashboard/org-admin/feedback', icon: Star }
    ]
  },
  {
    label: 'Organization',
    items: [
      { label: 'Organization', path: '/dashboard/org-admin/organization', icon: Building2 }
    ]
  }
];

export default function OrgAdminSidebar() {
  return (
    <aside className="org-admin-sidebar" aria-label="Organization admin navigation">
      <div className="org-admin-sidebar__brand">
        <span className="org-admin-sidebar__brand-mark" aria-hidden="true">🌲</span>
        <span className="org-admin-sidebar__brand-text">TrailOps</span>
      </div>

      <nav className="org-admin-sidebar__nav">
        <div className="org-admin-sidebar__group">
          <NavLink
            to="/dashboard/org-admin"
            end
            className="org-admin-sidebar__link"
            title="Dashboard"
            aria-label="Dashboard"
          >
            <span className="org-admin-sidebar__link-icon-wrap" aria-hidden="true">
              <LayoutDashboard className="org-admin-sidebar__link-icon" size={19} />
            </span>
            <span className="org-admin-sidebar__link-text">Dashboard</span>
          </NavLink>
        </div>

        {navigationGroups.map((group) => (
          <div className="org-admin-sidebar__group" key={group.label}>
            <div className="org-admin-sidebar__divider" aria-hidden="true" />
            <h2 className="org-admin-sidebar__heading">{group.label}</h2>
            <div className="org-admin-sidebar__links">
              {group.items.map(({ label, path, icon: Icon }) => (
                <NavLink
                  key={label}
                  to={path}
                  className="org-admin-sidebar__link"
                  title={label}
                  aria-label={label}
                >
                  <span className="org-admin-sidebar__link-icon-wrap" aria-hidden="true">
                    <Icon className="org-admin-sidebar__link-icon" size={19} />
                  </span>
                  <span className="org-admin-sidebar__link-text">{label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
