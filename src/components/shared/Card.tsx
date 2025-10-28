import React from 'react';
import { Card as CardType } from '../../types/poker';
import { getCardColor, parseCard } from '../../utils/pokerCalculations';

interface CardProps {
  card?: CardType;
  faceDown?: boolean;
}

export const Card: React.FC<CardProps> = ({ card, faceDown = false }) => {
  if (!card && !faceDown) return null;

  if (faceDown) {
    return (
      <div className="card card-back">
        <div className="card-pattern"></div>
      </div>
    );
  }

  const { rank, symbol } = parseCard(card!);
  const cardColor = getCardColor(card!);

  return (
    <div className={`card ${cardColor}`}>
      <div className="card-rank">{rank}</div>
      <div className="card-suit">{symbol}</div>
    </div>
  );
};
