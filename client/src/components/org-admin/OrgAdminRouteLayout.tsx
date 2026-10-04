import OrgAdminNavbar from './OrgAdminNavbar';
import OrgAdminSidebar from './OrgAdminSidebar';
import { Outlet } from 'react-router-dom';
import './OrgAdminRouteLayout.css';

export default function OrgAdminRouteLayout() {
  return (
    <div className="org-admin-layout">
      <OrgAdminSidebar />
      <main className="org-admin-main">
        <OrgAdminNavbar />
        <div className="org-admin-route-content"><Outlet /></div>
      </main>
    </div>
  );
}
