import React from 'react';
import { Hand } from '../../types/poker';
import { useTableState } from '../../hooks/useTableState';
import { Player } from './Player';
import { TableCenter } from './TableCenter';
import './PokerTable.css';

interface PokerTableProps {
  hand: Hand | null;
  currentAction: number;
  showChipsInBB: boolean;
}

const PokerTable: React.FC<PokerTableProps> = ({ hand, currentAction, showChipsInBB }) => {
  const { visibleBoard, currentPotValue, potInCenter, bigBlind, getPlayerData } = useTableState(hand, currentAction);

  if (!hand) {
    return (
      <div className="poker-table-container">
        <div className="no-hand-message">
          Aucune main chargée
        </div>
      </div>
    );
  }

  return (
    <div className="poker-table-container">
      <div className="poker-table">
        {/* Joueurs */}
        {hand.players.map((player, idx) => {
          const playerState = getPlayerData(player);
          
          return (
            <Player
              key={player.name} // Utiliser le nom comme clé pour éviter les problèmes de réorganisation
              player={{...player, chips: playerState.currentChips}}
              position={idx + 1}
              playerState={playerState}
              showChipsInBB={showChipsInBB}
              bigBlind={bigBlind}
            />
          );
        })}

        {/* Centre de la table */}
        <TableCenter
          visibleBoard={visibleBoard}
          currentPotValue={currentPotValue}
          potInCenter={potInCenter}
          showChipsInBB={showChipsInBB}
          bigBlind={bigBlind}
        />
      </div>
    </div>
  );
};

export default PokerTable;
