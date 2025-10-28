import { Card, Player, ActionType, Suit, SuitSymbols } from '../types/poker';

/**
 * Extrait le montant d'une action de poker
 */
export const extractBetAmount = (actionType: ActionType, amountStr: string): number => {
  if (actionType === ActionType.raise) {
    // Pour les raises, chercher d'abord "to X" puis "X"
    const toMatch = amountStr.match(/to (\d+\.?\d*)/);
    if (toMatch) {
      return parseFloat(toMatch[1]);
    }
    const match = amountStr.match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 0;
  } else if (actionType === ActionType.call || actionType === ActionType.bet) {
    const match = amountStr.match(/(\d+\.?\d*)/);
    return match ? parseFloat(match[1]) : 0;
  }
  return 0;
};

/**
 * Calcule le montant supplémentaire à ajouter pour une action
 */
export const calculateAdditionalAmount = (
  actionType: ActionType,
  amount: number,
  currentBet: number
): number => {
  switch (actionType) {
    case ActionType.raise:
      return amount - currentBet;
    case ActionType.call:
      return amount;
    case ActionType.bet:
      return amount - currentBet;
    default:
      return 0;
  }
};

/**
 * Calcule le total des mises pour une street donnée
 */
export const calculateTotalBets = (playerBets: Record<string, number>): number => {
  return Object.values(playerBets).reduce((sum, bet) => sum + bet, 0);
};

/**
 * Initialise les chips de départ pour tous les joueurs
 */
export const initializePlayerChips = (players: Player[], antes?: Record<string, number>): Record<string, number> => {
  const playerChips: Record<string, number> = {};
  
  players.forEach(player => {
    const initialChips = parseFloat(player.chips.toString().replace(/[^\d.]/g, ''));
    playerChips[player.name] = initialChips;
  });

  // Soustraire les antes du tapis initial
  if (antes) {
    Object.keys(antes).forEach(playerName => {
      playerChips[playerName] = Math.max(0, playerChips[playerName] - antes[playerName]);
    });
  }

  return playerChips;
};

/**
 * Met à jour les mises d'un joueur
 */
export const updatePlayerBet = (
  playerName: string,
  amount: number,
  actionType: ActionType,
  currentBets: Record<string, number>,
  playerChips: Record<string, number>
): { newBets: Record<string, number>; newChips: Record<string, number> } => {
  const currentBet = currentBets[playerName] || 0;
  const additionalAmount = calculateAdditionalAmount(actionType, amount, currentBet);
  
  let newTotalBet: number;
  switch (actionType) {
    case ActionType.raise:
      newTotalBet = amount;
      break;
    case ActionType.call:
      newTotalBet = currentBet + amount;
      break;
    case ActionType.bet:
      newTotalBet = amount;
      break;
    default:
      newTotalBet = currentBet;
  }

  const newBets = {
    ...currentBets,
    [playerName]: newTotalBet
  };

  const newChips = {
    ...playerChips,
    [playerName]: Math.max(0, playerChips[playerName] - additionalAmount)
  };

  return { newBets, newChips };
};

/**
 * Détermine la couleur d'une carte (4 couleurs: rouge, noir, vert, bleu)
 */
export const getCardColor = (card: Card): 'red' | 'black' | 'green' | 'blue' => {
  const suit = card.slice(-1) as 'h' | 'd' | 'c' | 's';
  switch (suit) {
    case 'h': return 'red';    // Cœur - rouge
    case 's': return 'black';  // Pique - noir
    case 'c': return 'green';  // Trèfle - vert
    case 'd': return 'blue';   // Carreau - bleu
    default: return 'black';
  }
};

/**
 * Détermine si une carte est rouge (pour compatibilité)
 */
export const isRedCard = (card: Card): boolean => {
  return getCardColor(card) === 'red';
};

/**
 * Extrait le rang et la couleur d'une carte
 */
export const parseCard = (card: Card): { rank: string; suit: string; symbol: string } => {
  const suit = card.slice(-1) as Suit;
  const rank = card.slice(0, -1);

  return {
    rank,
    suit,
    symbol: SuitSymbols[suit] || suit
  };
};
