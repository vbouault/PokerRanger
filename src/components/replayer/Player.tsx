import React from 'react';
import { Player as PlayerType, PlayerState } from '../../types/poker';
import { Card } from '../shared/Card';
import { formatAmount, formatChips } from '../../utils/bbFormatter';

interface PlayerProps {
  player: PlayerType;
  position: number;
  playerState: PlayerState;
  showChipsInBB: boolean;
  bigBlind: number;
}

export const Player: React.FC<PlayerProps> = ({ 
  player, 
  position, 
  playerState,
  showChipsInBB,
  bigBlind
}) => {
  const {
    hasFolded,
    isActive,
    showCards,
    bet,
    hasChecked,
    isAllIn,
    isWinner
  } = playerState;

  // Formater les jetons et montants selon le mode d'affichage
  const formatChipsValue = (chips: number): string => formatChips(chips, showChipsInBB, bigBlind);
  const formatAmountValue = (amount: number): string => formatAmount(amount, showChipsInBB, bigBlind);

  // Ne pas afficher de cartes si le joueur a fold
  if (hasFolded) {
    return (
      <div className={`player player-${position} folded ${isWinner ? 'winner' : ''}`}>
        {player.isDealer && (
          <div className="dealer-button">D</div>
        )}
        <div className="player-info">
          {player.bounty && (
            <div className="bounty-badge">
              {player.bounty}
            </div>
          )}
          <div className="player-name">
            {player.name}
          </div>
          <div className="player-chips">{formatChipsValue(player.chips)}</div>
        </div>
        {bet > 0 && (
          <div className="player-bet">
            {formatAmountValue(bet)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`player player-${position} ${isActive ? 'active' : ''} ${isWinner ? 'winner' : ''}`}>
      {player.isDealer && (
        <div className="dealer-button">D</div>
      )}
      
      {/* Afficher les vraies cartes si on les connaît, sinon cartes de dos si actif */}
      {(isActive || showCards) && (
        <div className="player-cards">
          {showCards && player.cards ? (
            // Afficher les vraies cartes
            player.cards.map((card, idx) => (
              <Card key={idx} card={card} />
            ))
          ) : isActive ? (
            // Afficher des cartes de dos
            <>
              <Card key={0} faceDown={true} />
              <Card key={1} faceDown={true} />
            </>
          ) : null}
        </div>
      )}

      {/* Afficher "Parole" si le joueur a check */}
      {hasChecked && (
        <div className="player-check">
          Parole
        </div>
      )}

      <div className="player-info">
        {player.bounty && (
          <div className="bounty-badge">
            {player.bounty}
          </div>
        )}
        <div className="player-name">
          {player.name}
        </div>
        <div className="player-chips">
          {isAllIn ? 'ALL IN' : formatChipsValue(player.chips)}
        </div>
      </div>

      {/* Afficher la mise du joueur */}
      {bet > 0 && (
        <div className="player-bet">
          {formatAmountValue(bet)}
        </div>
      )}
    </div>
  );
};
