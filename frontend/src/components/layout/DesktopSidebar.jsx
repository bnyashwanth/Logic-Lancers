import { NavLink } from 'react-router-dom';
import './DesktopSidebar.css';
import Icon from '../ui/Icon';

const navItems = [
  { to: '/map', icon: 'map', label: 'Map' },
  { to: '/feed', icon: 'dynamic_feed', label: 'Feed' },
  { to: '/profile', icon: 'person', label: 'Profile' },
];

export default function DesktopSidebar() {
  return (
    <aside className="desktop-sidebar">
      <div className="desktop-sidebar__heading">Navigation</div>
      {navItems.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `desktop-sidebar__item ${isActive ? 'desktop-sidebar__item--active' : ''}`}
        >
          {({ isActive }) => (
            <>
              <Icon name={item.icon} filled={isActive} size={24} />
              <span>{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </aside>
  );
}
