import React from 'react';
import { useNavigate } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import './ImmersiveNav.css';

function ImmersiveNav({ title, subtitle, timer, onExit, actions }) {
  const navigate = useNavigate();

  return (
    <nav className="imm-nav">
      <div className="imm-nav-left">
        <button className="imm-exit-btn" onClick={onExit || (() => navigate('/workspace'))} title="Exit Mode">
          <LucideIcons.ArrowLeft size={18} />
        </button>
        <div className="imm-title-group">
          <h1 className="imm-title">{title}</h1>
          {subtitle && <span className="imm-subtitle">{subtitle}</span>}
        </div>
      </div>

      <div className="imm-nav-center">
        {timer && (
          <div className="imm-timer">
            <LucideIcons.Clock size={16} />
            <span>{timer}</span>
          </div>
        )}
      </div>

      <div className="imm-nav-right">
        {actions}
      </div>
    </nav>
  );
}

export default ImmersiveNav;
