import { Outlet } from 'react-router-dom';
import ParticipantSidebar from '../components/participant/ParticipantSidebar';
import './ParticipantRouteLayout.css';

export default function ParticipantRouteLayout() {
  return (
    <div className="participant-route-layout">
      <ParticipantSidebar />
      <main className="participant-route-main">
        <Outlet />
      </main>
    </div>
  );
}
