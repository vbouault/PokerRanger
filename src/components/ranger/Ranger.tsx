import React, { useState, useEffect } from 'react';
import { useRangeManager } from '../../hooks/useRangeManager';
import { POKER_HANDS_GRID, DEFAULT_COLORS, Action, Range } from '../../types/range';
import './Ranger.css';

interface RangerProps {
  selectedRange?: Range | null;
}

const Ranger: React.FC<RangerProps> = ({ selectedRange }) => {
  const {
    currentRange,
    actions,
    rangeHands,
    isLoading,
    error,
    selectRange,
    createAction,
    updateAction,
    deleteAction,
    assignHandToAction,
    removeHandFromAction,
    getRangeStats,
    getHandAction
  } = useRangeManager();

  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  const [isAddingAction, setIsAddingAction] = useState(false);
  const [newActionName, setNewActionName] = useState('');
  const [newActionColor, setNewActionColor] = useState<string>(DEFAULT_COLORS[0]);
  const [isDragging, setIsDragging] = useState(false);

  // Synchroniser le range sélectionné depuis le gestionnaire de fichiers
  useEffect(() => {
    if (selectedRange && selectedRange.id !== currentRange?.id) {
      selectRange(selectedRange);
    }
  }, [selectedRange, currentRange, selectRange]);

  // Gérer le relâchement de la souris globalement
  useEffect(() => {
    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  if (isLoading) {
    return (
      <div className="ranger-container">
        <div className="loading">Chargement...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ranger-container">
        <div className="error">Erreur: {error}</div>
      </div>
    );
  }

  const handleHandClick = (hand: string) => {
    if (!selectedAction) {
      // Si aucune action sélectionnée, retirer la main
      removeHandFromAction(hand as any);
    } else {
      // Assigner la main à l'action sélectionnée
      assignHandToAction(hand as any, selectedAction.id);
    }
  };

  const handleHandMouseDown = (hand: string, e: React.MouseEvent) => {
    e.preventDefault(); // Empêche la sélection de texte
    setIsDragging(true);
    handleHandClick(hand);
  };

  const handleHandMouseEnter = (hand: string) => {
    if (isDragging) {
      handleHandClick(hand);
    }
  };

  const handleAddAction = () => {
    if (!currentRange || !newActionName.trim()) return;
    
    createAction(currentRange.id, newActionName.trim(), newActionColor);
    setNewActionName('');
    setIsAddingAction(false);
  };

  const stats = getRangeStats();

  return (
    <div className="ranger-container">
      <div className="ranger-header">
        <h3>{currentRange ? currentRange.name : 'Sélectionnez un range'}</h3>
        {/* {currentRange && (
          <div className="range-stats">
            <div className="stat">
              <span className="stat-label">Mains sélectionnées:</span>
              <span className="stat-value">{stats.selectedHands}/{stats.totalHands}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Pourcentage:</span>
              <span className="stat-value">{stats.percentage}%</span>
            </div>
          </div>
        )} */}
      </div>

      {currentRange && (
        <div className="ranger-content">
          {/* Grille des mains */}
          <div className="hands-grid">
            {POKER_HANDS_GRID.map((row, rowIndex) => 
              row.map((hand, colIndex) => {
                const handAction = getHandAction(hand as any);
                const isSelected = selectedAction?.id === handAction?.id;
                
                return (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className={`hand-cell ${isSelected ? 'selected' : ''}`}
                    style={{
                      backgroundColor: handAction?.color || '#3a3a3a',
                      userSelect: 'none',
                      // border: handAction ? `2px solid ${handAction.color}` : '1px solid #ccc'
                    }}
                    onMouseDown={(e) => handleHandMouseDown(hand, e)}
                    onMouseEnter={() => handleHandMouseEnter(hand)}
                    title={handAction ? `${hand} - ${handAction.name}` : hand}
                  >
                    {hand}
                  </div>
                );
              })
            )}
          </div>

          {/* Panneau des actions */}
          <div className="actions-panel">
            <h3>Actions</h3>
            
            {/* Liste des actions existantes */}
            <div className="actions-list">
              {actions.map((action) => (
                <div
                  key={action.id}
                  className={`action-item ${selectedAction?.id === action.id ? 'active' : ''}`}
                  onClick={() => setSelectedAction(selectedAction?.id === action.id ? null : action)}
                >
                  <div
                    className={`action-radio ${selectedAction?.id === action.id ? 'selected' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedAction(selectedAction?.id === action.id ? null : action);
                    }}
                  />
                  <div
                    className="action-color"
                    style={{ backgroundColor: action.color }}
                  />
                  <span className="action-name">{action.name}</span>
                  <div className="action-controls">
                    <span className="action-drag">⋮⋮</span>
                    <button
                      className="action-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteAction(action.id);
                        if (selectedAction?.id === action.id) {
                          setSelectedAction(null);
                        }
                      }}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Ajouter une nouvelle action */}
            {isAddingAction ? (
              <div className="add-action-form">
                <input
                  type="text"
                  placeholder="Nom de l'action"
                  value={newActionName}
                  onChange={(e) => setNewActionName(e.target.value)}
                  className="action-name-input"
                />
                <div className="color-picker">
                  {DEFAULT_COLORS.map((color) => (
                    <button
                      key={color}
                      className={`color-option ${newActionColor === color ? 'selected' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewActionColor(color)}
                    />
                  ))}
                </div>
                <div className="form-buttons">
                  <button onClick={handleAddAction} className="btn-primary">
                    Ajouter
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingAction(false);
                      setNewActionName('');
                    }}
                    className="btn-secondary"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsAddingAction(true)}
                className="btn-add-action"
              >
                + Ajouter une couleur
              </button>
            )}

          </div>
        </div>
      )}
    </div>
  );
};

export default Ranger;