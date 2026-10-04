import {
  CalendarDays,
  Compass,
  HeartPulse,
  LayoutDashboard,
  Map,
  Settings,
  Star,
  Users
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import './ParticipantSidebar.css';

const dashboardPath = '/dashboard/participant';
const explorePath = `${dashboardPath}/explore`;
const bookingsPath = `${dashboardPath}/bookings`;
const tripsPath = `${dashboardPath}/trips`;
const groupsPath = `${dashboardPath}/groups`;
const medicalPath = `${dashboardPath}/medical`;
const feedbackPath = `${dashboardPath}/feedback`;
const profilePath = `${dashboardPath}/profile`;

const navigationGroups = [
  {
    label: 'Discover',
    items: [
      { label: 'Explore Trips', icon: Compass, to: explorePath }
    ]
  },
  {
    label: 'My Journey',
    items: [
      { label: 'My Trips', icon: Map, to: tripsPath },
      { label: 'My Bookings', icon: CalendarDays, to: bookingsPath },
      { label: 'Group Bookings', icon: Users, to: groupsPath },
      { label: 'Medical', icon: HeartPulse, to: medicalPath }
    ]
  },
  {
    label: 'Experience',
    items: [
      { label: 'Feedback', icon: Star, to: feedbackPath }
    ]
  },
  {
    label: 'Account',
    items: [
      { label: 'Profile', icon: Settings, to: profilePath }
    ]
  }
];

export default function ParticipantSidebar() {
  return (
    <aside className="participant-sidebar" aria-label="Participant navigation">
      <div className="participant-sidebar__brand">
        <span className="participant-sidebar__brand-mark" aria-hidden="true">🌲</span>
        <span className="participant-sidebar__brand-text">TrailOps</span>
      </div>

      <nav className="participant-sidebar__nav">
        <div className="participant-sidebar__group">
          <NavLink
            to={dashboardPath}
            end
            className="participant-sidebar__link"
            title="Dashboard"
            aria-label="Dashboard"
          >
            <span className="participant-sidebar__link-icon-wrap" aria-hidden="true">
              <LayoutDashboard className="participant-sidebar__link-icon" size={19} />
            </span>
            <span className="participant-sidebar__link-text">Dashboard</span>
          </NavLink>
        </div>

        {navigationGroups.map((group) => (
          <div
            className={`participant-sidebar__group ${group.label === 'My Journey' ? 'participant-sidebar__group--journey' : ''}`}
            key={group.label}
          >
            <div className="participant-sidebar__divider" aria-hidden="true" />
            <h2 className="participant-sidebar__heading">{group.label}</h2>
            <div className="participant-sidebar__links">
              {group.items.map(({ label, icon: Icon, to }) => (
                <NavLink
                  key={label}
                  to={to}
                  end
                  className="participant-sidebar__link"
                  title={label}
                  aria-label={label}
                >
                  <span className="participant-sidebar__link-icon-wrap" aria-hidden="true">
                    <Icon className="participant-sidebar__link-icon" size={19} />
                  </span>
                  <span className="participant-sidebar__link-text">{label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}

