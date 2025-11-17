import React, { useState, useEffect, useCallback } from 'react';
import { useRangeManager } from '../../hooks/useRangeManager';
import { POKER_HANDS_GRID, DEFAULT_COLORS, Action, Range } from '../../types/range';
import { databaseService } from '../../services/indexedDB';
import ColorPicker from './ColorPicker';
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
  const [editingActionId, setEditingActionId] = useState<number | null>(null);
  const [editingActionName, setEditingActionName] = useState('');
  const [editingActionColorId, setEditingActionColorId] = useState<number | null>(null);
  const [editingActionColor, setEditingActionColor] = useState<string>('');
  const [colorPickerReloadTrigger, setColorPickerReloadTrigger] = useState(0);
  const [colorPickerPosition, setColorPickerPosition] = useState<{ top: number; left: number } | null>(null);

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

  // Fermer l'édition de couleur en cliquant en dehors
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (editingActionColorId !== null && !target.closest('.action-color-editing') && !target.closest('.action-color')) {
        setEditingActionColorId(null);
        setEditingActionColor('');
        setColorPickerPosition(null);
      }
    };

    if (editingActionColorId !== null) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [editingActionColorId]);

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

  const handleAddAction = async () => {
    if (!currentRange || !newActionName.trim()) return;
    
    await createAction(currentRange.id, newActionName.trim(), newActionColor);
    // Sauvegarder la couleur récente dans IndexedDB
    try {
      await databaseService.addRecentColor(newActionColor);
      await databaseService.cleanupRecentColors(10);
      setColorPickerReloadTrigger(prev => prev + 1); // Forcer le rechargement des couleurs récentes
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la couleur récente:', error);
    }
    setNewActionName('');
    setIsAddingAction(false);
  };

  const handleStartEditing = (action: Action) => {
    setEditingActionId(action.id);
    setEditingActionName(action.name);
  };

  const handleSaveEditing = async (actionId: number) => {
    const action = actions.find(a => a.id === actionId);
    if (!action || !editingActionName.trim()) {
      setEditingActionId(null);
      return;
    }
    
    await updateAction(actionId, editingActionName.trim(), action.color);
    setEditingActionId(null);
    setEditingActionName('');
  };

  const handleCancelEditing = () => {
    setEditingActionId(null);
    setEditingActionName('');
  };

  const handleStartEditingColor = (action: Action, event: React.MouseEvent<HTMLDivElement>) => {
    setEditingActionColorId(action.id);
    setEditingActionColor(action.color);
    
    // Calculer la position du color picker pour qu'il soit visible
    const target = event.currentTarget;
    const rect = target.getBoundingClientRect();
    const actionsPanel = target.closest('.actions-panel');
    const actionsPanelRect = actionsPanel?.getBoundingClientRect();
    
    // Positionner le color picker en dessous de l'élément, mais s'assurer qu'il reste visible
    let top = rect.bottom + 10;
    let left = rect.left;
    
    // Si le color picker dépasse en bas, le positionner au-dessus
    const colorPickerHeight = 350; // Hauteur approximative du color picker
    if (top + colorPickerHeight > window.innerHeight) {
      top = rect.top - colorPickerHeight - 10;
    }
    
    // Si le color picker dépasse à droite, l'aligner à droite de l'élément
    const colorPickerWidth = 320;
    if (left + colorPickerWidth > window.innerWidth) {
      left = window.innerWidth - colorPickerWidth - 10;
    }
    
    // S'assurer que le color picker ne dépasse pas à gauche
    if (left < 10) {
      left = 10;
    }
    
    setColorPickerPosition({ top, left });
  };

  const handleSaveColorEditing = async (actionId: number) => {
    const action = actions.find(a => a.id === actionId);
    if (!action) {
      setEditingActionColorId(null);
      return;
    }
    
    await updateAction(actionId, action.name, editingActionColor);
    // Sauvegarder la couleur récente dans IndexedDB
    try {
      await databaseService.addRecentColor(editingActionColor);
      await databaseService.cleanupRecentColors(10);
      setColorPickerReloadTrigger(prev => prev + 1); // Forcer le rechargement des couleurs récentes
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la couleur récente:', error);
    }
    setEditingActionColorId(null);
    setEditingActionColor('');
    setColorPickerPosition(null);
  };

  const handleCancelColorEditing = () => {
    setEditingActionColorId(null);
    setEditingActionColor('');
    setColorPickerPosition(null);
  };

  const stats = getRangeStats();

  // Fonction pour calculer le nombre de combos d'une main
  const getHandCombos = (hand: string): number => {
    // Paires (AA, KK, etc.) : 6 combos
    if (hand.length === 2 && hand[0] === hand[1]) {
      return 6;
    }
    // Suited (AKs, AQs, etc.) : 4 combos
    if (hand.endsWith('s')) {
      return 4;
    }
    // Offsuit (AKo, AQo, etc.) : 12 combos
    if (hand.endsWith('o')) {
      return 12;
    }
    return 0;
  };

  // Calculer les combos et pourcentage pour chaque action
  const getActionStats = (actionId: number) => {
    const actionHands = rangeHands.filter(rh => rh.actionId === actionId);
    const totalCombos = actionHands.reduce((sum, rh) => sum + getHandCombos(rh.hand), 0);
    const percentage = (totalCombos / 1326) * 100;
    return { combos: totalCombos, percentage };
  };

  // Calculer le total des combos sélectionnés (toutes actions confondues)
  const getTotalStats = () => {
    const totalCombos = rangeHands.reduce((sum, rh) => sum + getHandCombos(rh.hand), 0);
    const percentage = (totalCombos / 1326) * 100;
    return { combos: totalCombos, percentage };
  };

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
          <div className="hands-section">
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

            {/* Statistiques des actions sous la grille */}
            {currentRange && actions.length > 0 && (
              <div className="range-stats-section">
                <div className="action-stats-list">
                  {actions.map((action) => {
                    const actionStats = getActionStats(action.id);
                    return (
                      <div key={action.id} className="action-stat-item">
                        <div
                          className="action-stat-color"
                          style={{ backgroundColor: action.color }}
                        />
                        <span className="action-stat-text">
                          {actionStats.combos} / 1326 ({actionStats.percentage.toFixed(1)}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
                {rangeHands.length > 0 && (
                  <div className="total-stats-row">
                    {(() => {
                      const totalStats = getTotalStats();
                      return (
                        <div className="total-stats-value">
                           {totalStats.combos} / 1326 ({totalStats.percentage.toFixed(1)}%)
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Panneau des actions */}
          <div className="actions-panel">
            <h3>Actions</h3>
            
            {/* Liste des actions existantes */}
            <div className="actions-list">
              {actions.map((action) => {
                const actionStats = getActionStats(action.id);
                return (
                <div
                  key={action.id}
                  className={`action-item ${selectedAction?.id === action.id ? 'active' : ''}`}
                  onClick={() => {
                    if (editingActionId !== action.id) {
                      setSelectedAction(selectedAction?.id === action.id ? null : action);
                    }
                  }}
                >
                  <div
                    className={`action-radio ${selectedAction?.id === action.id ? 'selected' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (editingActionId !== action.id) {
                        setSelectedAction(selectedAction?.id === action.id ? null : action);
                      }
                    }}
                  />
                  {editingActionColorId === action.id && colorPickerPosition ? (
                    <>
                      <div 
                        className="action-color-editing" 
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          position: 'fixed',
                          top: `${colorPickerPosition.top}px`,
                          left: `${colorPickerPosition.left}px`,
                          zIndex: 10000
                        }}
                      >
                        <ColorPicker
                          color={editingActionColor}
                          onChange={setEditingActionColor}
                          reloadTrigger={colorPickerReloadTrigger}
                        />
                        <div className="color-edit-buttons">
                          <button
                            className="btn-color-save"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveColorEditing(action.id);
                            }}
                          >
                            ✓
                          </button>
                          <button
                            className="btn-color-cancel"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelColorEditing();
                            }}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div
                      className="action-color"
                      style={{ backgroundColor: action.color }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartEditingColor(action, e);
                      }}
                      title="Cliquer pour modifier la couleur"
                    />
                  )}
                  <div className="action-name-wrapper">
                    {editingActionId === action.id ? (
                      <input
                        type="text"
                        value={editingActionName}
                        onChange={(e) => setEditingActionName(e.target.value)}
                        onBlur={() => handleSaveEditing(action.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveEditing(action.id);
                          } else if (e.key === 'Escape') {
                            handleCancelEditing();
                          }
                        }}
                        className="action-name-input-edit"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span 
                        className="action-name"
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          handleStartEditing(action);
                        }}
                      >
                        {action.name}
                      </span>
                    )}
                  </div>
                  <div className="action-controls">
                    {/* <span className="action-drag">⋮⋮</span> */}
                    <button
                      className="action-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteAction(action.id);
                        if (selectedAction?.id === action.id) {
                          setSelectedAction(null);
                        }
                        if (editingActionId === action.id) {
                          handleCancelEditing();
                        }
                        if (editingActionColorId === action.id) {
                          handleCancelColorEditing();
                        }
                      }}
                    >
                      ×
                    </button>
                  </div>
                </div>
                );
              })}
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
                <ColorPicker
                  color={newActionColor}
                  onChange={setNewActionColor}
                  reloadTrigger={colorPickerReloadTrigger}
                />
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