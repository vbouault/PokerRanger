import React, { useState, useRef, useEffect } from 'react';
import './ActionControls.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBackwardFast, faBackwardStep, faForwardFast, faForwardStep } from '@fortawesome/free-solid-svg-icons';
import { Action } from '../../types/poker';
import { formatAmount } from '../../utils/bbFormatter';

interface ActionControlsProps {
  currentHand: number;
  totalHands: number;
  currentAction: number;
  totalActions: number;
  onPreviousHand: () => void;
  onNextHand: () => void;
  onPreviousAction: () => void;
  onNextAction: () => void;
  onGoToHand: (handIndex: number) => void;
  currentActionData?: Action;
  showChipsInBB: boolean;
  onToggleChipsInBB: () => void;
  bigBlind: number;
}

const ActionControls: React.FC<ActionControlsProps> = ({
  currentHand,
  totalHands,
  currentAction,
  totalActions,
  onPreviousHand,
  onNextHand,
  onPreviousAction,
  onNextAction,
  onGoToHand,
  currentActionData,
  showChipsInBB,
  onToggleChipsInBB,
  bigBlind
}) => {
  const [isEditingHand, setIsEditingHand] = useState(false);
  const [handInputValue, setHandInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus sur l'input quand on entre en mode édition
  useEffect(() => {
    if (isEditingHand && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditingHand]);

  const handleHandClick = () => {
    setIsEditingHand(true);
    setHandInputValue((currentHand + 1).toString());
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHandInputValue(e.target.value);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleGoToHand();
    } else if (e.key === 'Escape') {
      setIsEditingHand(false);
      setHandInputValue('');
    }
  };

  const handleInputBlur = () => {
    setIsEditingHand(false);
    setHandInputValue('');
  };

  const handleGoToHand = () => {
    const handNumber = parseInt(handInputValue);
    if (handNumber >= 1 && handNumber <= totalHands) {
      onGoToHand(handNumber - 1);
    }
    setIsEditingHand(false);
    setHandInputValue('');
  };

  // Formater les montants selon le mode d'affichage
  const formatAmountValue = (amount: number): string => formatAmount(amount, showChipsInBB, bigBlind);
  return (
    <div className="action-controls-container">
      {/* Navigation des mains */}
      <div className="hand-navigation">
        <button
          onClick={onPreviousHand}
          disabled={currentHand === 0}
          className="nav-button"
        >
          <FontAwesomeIcon icon={faBackwardFast} />
        </button>
        <button
          onClick={onPreviousAction}
          disabled={currentAction <= 0}
          className="nav-button action-nav"
        >
          <FontAwesomeIcon icon={faBackwardStep} />
        </button>

        <div className="hand-counter" title='Ctrl+←/→ (mains), ←/→ (actions)'>
          {isEditingHand ? (
            <div className="hand-input-container">
              <input
                ref={inputRef}
                type="number"
                value={handInputValue}
                onChange={handleInputChange}
                onKeyDown={handleInputKeyDown}
                onBlur={handleInputBlur}
                min="1"
                max={totalHands}
                className="hand-input"
                placeholder={`1-${totalHands}`}
              />
              <span className="hand-input-suffix">/ {totalHands}</span>
            </div>
          ) : (
            <div className="hand-display" onClick={handleHandClick}>
              Main {currentHand + 1} / {totalHands}
            </div>
          )}
        </div>

        <button
          onClick={onNextAction}
          disabled={currentAction >= totalActions - 1}
          className="nav-button action-nav"
        >
          <FontAwesomeIcon icon={faForwardStep} />
        </button>

        <button
          onClick={onNextHand}
          disabled={currentHand >= totalHands - 1}
          className="nav-button"
        >
          <FontAwesomeIcon icon={faForwardFast} />
        </button>
      </div>

      {/* Bouton toggle pour l'affichage en BB */}
      <div className="bb-toggle-container">
        <button
          onClick={onToggleChipsInBB}
          className={`bb-toggle-button ${showChipsInBB ? 'active' : ''}`}
          title={showChipsInBB ? 'Afficher les jetons en montants' : 'Afficher les jetons en BB'}
        >
          {showChipsInBB ? 'BB' : '€'}
        </button>
      </div>

      {/* Affichage de l'action courante */}
      {/* {currentActionData && (
        <div className="current-action-display">
          <div className="action-text">
            {currentActionData.player && (
              <span className="action-player">{currentActionData.player}: </span>
            )}
            <span className="action-detail">
              {showChipsInBB && bigBlind > 0 && currentActionData.amount 
                ? currentActionData.action.replace(/\d+(\.\d+)?/g, (match) => {
                    const amount = parseFloat(match);
                    return formatAmountValue(amount);
                  })
                : currentActionData.action
              }
            </span>
          </div>
        </div>
      )} */}
    </div>
  );
};

export default ActionControls;
