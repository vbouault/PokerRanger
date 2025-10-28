import React from 'react';
import { Card as CardType } from '../../types/poker';
import { Card } from '../shared/Card';
import { formatAmount } from '../../utils/bbFormatter';

interface TableCenterProps {
  visibleBoard: CardType[];
  currentPotValue: number;
  potInCenter: number;
  showChipsInBB: boolean;
  bigBlind: number;
}

export const TableCenter: React.FC<TableCenterProps> = ({
  visibleBoard,
  currentPotValue,
  potInCenter,
  showChipsInBB,
  bigBlind
}) => {
  // Formater les montants selon le mode d'affichage
  const formatAmountValue = (amount: number): string => formatAmount(amount, showChipsInBB, bigBlind);
  return (
    <div className="table-center">
      <div className="pot-info">
        <div className="total-pot">Pot total: {formatAmountValue(currentPotValue || 0)}</div>
        <div className="center-pot">Pot: {formatAmountValue(potInCenter || 0)}</div>
      </div>

      {/* Board */}
      {visibleBoard.length > 0 && (
        <div className="board">
          {visibleBoard.map((card, idx) => (
            <Card key={idx} card={card} />
          ))}
        </div>
      )}
    </div>
  );
};
