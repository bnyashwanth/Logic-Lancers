import { Outlet } from 'react-router-dom';
import TopAppBar from './TopAppBar';
import BottomNavBar from './BottomNavBar';
import DesktopSidebar from './DesktopSidebar';
import './AppShell.css';

export default function AppShell() {
  return (
    <div className="app-shell">
      <TopAppBar />
      <DesktopSidebar />
      <main className="app-shell__content">
        <Outlet />
      </main>
      <BottomNavBar />
    </div>
  );
}
