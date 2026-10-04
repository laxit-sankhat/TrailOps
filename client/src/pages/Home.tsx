import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../types';
import './Home.css';

const roleToDashboard: Record<Role, string> = {
  SuperAdmin: '/dashboard/super-admin',
  OrgAdmin: '/dashboard/org-admin',
  TripCoordinator: '/dashboard/trip-coordinator',
  MedicalOfficer: '/dashboard/medical-officer',
  TrekLeader: '/dashboard/trek-leader',
  Volunteer: '/dashboard/volunteer',
  Participant: '/dashboard/participant'
};

export default function Home() {
  const { user } = useAuth();
  const dashboardPath = user ? roleToDashboard[user.role] : null;

  return (
    <div className="home-container">
      {/* Public Header */}
      <header className="home-header">
        <div className="home-header-inner">
          <Link to="/" className="home-brand">
            <span className="home-brand-logo">🌲</span>
            <span>TrailOps</span>
          </Link>

          <nav className="home-nav" aria-label="Main Navigation">
            <Link to="/verify-certificate" className="home-nav-link">
              Verify Certificate
            </Link>

            {user && dashboardPath ? (
              <Link to={dashboardPath} className="home-nav-btn">
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="home-nav-link">
                  Sign In
                </Link>
                <Link to="/register" className="home-nav-btn">
                  Register
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="home-hero" aria-labelledby="hero-title">
        <div className="home-hero-inner">
          <div className="home-pill">
            <span>NGO Trekking Operations SaaS</span>
          </div>

          <h1 id="hero-title" className="home-title">TrailOps</h1>
          <p className="home-subtitle">Trekking Operations Management Platform</p>
          <p className="home-description">
            A purpose-built operational management platform for non-profit trekking organizations.
            Coordinate expeditions, enforce strict batch capacity and waitlist integrity, manage
            participant medical clearance workflows, track field personnel, and verify attendance credentials.
          </p>

          <div className="home-hero-actions">
            {user && dashboardPath ? (
              <Link to={dashboardPath} className="home-cta-primary">
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link to="/register" className="home-cta-primary">
                  Get Started
                </Link>
                <Link to="/login" className="home-cta-secondary">
                  Sign In
                </Link>
              </>
            )}
          </div>

          <Link to="/verify-certificate" className="home-verify-link">
            <span>Have a certificate? Verify completion credential →</span>
          </Link>
        </div>
      </section>

      {/* Feature Capabilities Section */}
      <section className="home-features" aria-labelledby="features-title">
        <div className="home-section-header">
          <h2 id="features-title" className="home-section-title">Core Platform Capabilities</h2>
          <p className="home-section-desc">
            Designed specifically for the strict logistical, medical, and capacity requirements
            of organized group expeditions.
          </p>
        </div>

        <div className="home-grid">
          {/* Feature 1 */}
          <article className="home-card">
            <div className="home-card-icon" aria-hidden="true">🏔️</div>
            <h3 className="home-card-title">Batch & Capacity Management</h3>
            <p className="home-card-text">
              Organize multi-tenant treks by batches with strictly enforced capacity limits.
              Transactional serialization prevents overbooking while managing automated FIFO waitlists
              and all-or-nothing group booking submissions.
            </p>
            <ul className="home-card-list">
              <li>Transactional reservation locks on batch capacity</li>
              <li>Automated FIFO waitlist placement and promotion</li>
              <li>Group booking integrity with zero group splitting</li>
            </ul>
          </article>

          {/* Feature 2 */}
          <article className="home-card">
            <div className="home-card-icon" aria-hidden="true">🩺</div>
            <h3 className="home-card-title">Participant Safety & Medical Reviews</h3>
            <p className="home-card-text">
              Structured medical screening pipelines ensure participants are physically prepared
              for alpine conditions. Medical officers review health questionnaires and certifications
              before confirming bookings.
            </p>
            <ul className="home-card-list">
              <li>Comprehensive participant medical profile submissions</li>
              <li>Dedicated Medical Officer clearance and review portal</li>
              <li>Multi-stage booking pipeline through final medical approval</li>
            </ul>
          </article>

          {/* Feature 3 */}
          <article className="home-card">
            <div className="home-card-icon" aria-hidden="true">🧭</div>
            <h3 className="home-card-title">Field & Staff Coordination</h3>
            <p className="home-card-text">
              Role-scoped authorization connecting organization administrators, trip coordinators,
              trek leaders, and volunteers. Assign leaders to specific batches and monitor trail readiness.
            </p>
            <ul className="home-card-list">
              <li>Organization-scoped staff roster and role assignment</li>
              <li>Designated trek leader and volunteer batch assignments</li>
              <li>Checkpoint milestone logging and gear inventory tracking</li>
            </ul>
          </article>

          {/* Feature 4 */}
          <article className="home-card">
            <div className="home-card-icon" aria-hidden="true">📜</div>
            <h3 className="home-card-title">QR Attendance & Certificate Verification</h3>
            <p className="home-card-text">
              Paperless on-trail operations using dynamic QR code check-in scans. Issue verifiable,
              tamper-evident completion certificates with public online credential verification.
            </p>
            <ul className="home-card-list">
              <li>Live camera-based QR code attendance scanner for staff</li>
              <li>Automated generation of unique completion certificates</li>
              <li>Public verification portal for certificate authenticity</li>
            </ul>
          </article>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="home-banner" aria-labelledby="banner-title">
        <div className="home-banner-inner">
          <h2 id="banner-title" className="home-banner-title">Ready for Your Next Expedition?</h2>
          <p className="home-banner-text">
            Join as a participant to explore upcoming treks, reserve batch spots individually or with a group,
            and complete required safety reviews.
          </p>
          <div className="home-banner-actions">
            {user && dashboardPath ? (
              <Link to={dashboardPath} className="home-cta-primary">
                Return to Dashboard
              </Link>
            ) : (
              <>
                <Link to="/register" className="home-cta-primary">
                  Register as Participant
                </Link>
                <Link to="/login" className="home-cta-secondary">
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <div className="home-footer-inner">
          <div className="home-footer-brand">
            <Link to="/" className="home-footer-logo">
              <span aria-hidden="true">🌲</span>
              <span>TrailOps</span>
            </Link>
            <p className="home-footer-desc">
              Dedicated operations platform for non-profit trekking organizations,
              field safety coordination, and participant expedition management.
            </p>
          </div>

          <div className="home-footer-links-group">
            <div className="home-footer-col">
              <span className="home-footer-heading">Access</span>
              <Link to="/login" className="home-footer-link">Sign In</Link>
              <Link to="/register" className="home-footer-link">Participant Registration</Link>
            </div>

            <div className="home-footer-col">
              <span className="home-footer-heading">Verification</span>
              <Link to="/verify-certificate" className="home-footer-link">Verify Certificate</Link>
            </div>
          </div>
        </div>

        <div className="home-footer-bottom">
          <p>© {new Date().getFullYear()} TrailOps. Trekking Operations Management Platform.</p>
        </div>
      </footer>
    </div>
  );
}
