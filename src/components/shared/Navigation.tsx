import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navigation.css';

const Navigation: React.FC = () => {
  const location = useLocation();

  return (
    <nav className="navigation">
      <div className="nav-container">
        <div className="nav-brand">
          <h2>Poker Ranger</h2>
        </div>
        <div className="nav-links">
          <Link 
            to="/" 
            className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
          >
            Ranger
          </Link>
          <Link 
            to="/replayer" 
            className={`nav-link ${location.pathname === '/replayer' ? 'active' : ''}`}
          >
            Replay
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
