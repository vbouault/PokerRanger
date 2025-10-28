import React from 'react';
import './ActionHistory.css';
import { Action } from '../../types/poker';

interface ActionHistoryProps {
  actions: Action[];
  currentActionIndex: number;
}

const ActionHistory: React.FC<ActionHistoryProps> = ({ actions, currentActionIndex }) => {
  if (!actions || actions.length === 0) {
    return null;
  }

  return (
    <div className="action-history-container">
      <h3>📜 Historique des actions</h3>
      <div className="action-list">
        {actions.map((action, index) => (
          <div 
            key={index} 
            className={`action-item ${index === currentActionIndex ? 'current' : ''} ${index < currentActionIndex ? 'past' : 'future'} ${action.type}`}
          >
            <div className="action-index">{index + 1}</div>
            <div className="action-content">
              {action.street && (
                <span className="action-street-tag">{action.street}</span>
              )}
              {action.player && (
                <span className="action-player-name">{action.player}</span>
              )}
              <span className="action-description">{action.action}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActionHistory;
