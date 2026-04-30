import { NavLink } from 'react-router-dom';
import './BottomNavBar.css';
import Icon from '../ui/Icon';

const navItems = [
  { to: '/map', icon: 'map', label: 'Map' },
  { to: '/feed', icon: 'dynamic_feed', label: 'Feed' },
  { to: '/profile', icon: 'person', label: 'Profile' },
];

export default function BottomNavBar() {
  return (
    <nav className="bottom-nav">
      {navItems.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`}
        >
          {({ isActive }) => (
            <>
              <Icon name={item.icon} filled={isActive} size={24} />
              <span className="bottom-nav__label">{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
