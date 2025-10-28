// Types pour le système de poker

export enum Suit {
  hearts = 'h',    // Cœur
  diamonds = 'd',  // Carreau
  clubs = 'c',     // Trèfle
  spades = 's'     // Pique
}

export enum Rank {
  two = '2',
  three = '3',
  four = '4',
  five = '5',
  six = '6',
  seven = '7',
  eight = '8',
  nine = '9',
  ten = 'T',
  jack = 'J',
  queen = 'Q',
  king = 'K',
  ace = 'A'
}

export type Card = `${Rank}${Suit}`;

export enum Street {
  preflop = 'PREFLOP',
  flop = 'FLOP',
  turn = 'TURN',
  river = 'RIVER',
  showdown = 'SHOWDOWN'
}

export enum ActionType {
  fold = 'folds',
  call = 'calls',
  raise = 'raises',
  bet = 'bets',
  check = 'checks'
}

export enum ActionDataType {
  street = 'street',
  action = 'action',
  dealt = 'dealt',
  show = 'show',
  win = 'win'
}

export interface Player {
  seat: number;
  name: string;
  chips: number;
  bounty?: string;
  cards: Card[] | null;
  isDealer: boolean;
  isHero?: boolean; // Indique si c'est le joueur principal
}

export interface Action {
  index: number;
  street: Street;
  player?: string;
  action: string;
  actionType?: ActionType;
  type: ActionDataType;
  pot: number;
  amount?: number;        // Montant de l'action (pour les mises, gains, etc.)
  betAmount?: number;     // Montant spécifique de la mise/relance
  cards?: Card[];
}

export interface Hand {
  id: number;
  handNumber: string;
  date: string;
  stakes: string;
  tableInfo: string;
  players: Player[];
  actions: Action[];
  board: Card[];
  pot: number;
  blinds: Record<string, number>;
  playerWinnings: Record<string, number>;
  playerAntes?: Record<string, number>;
  playerBlinds?: Record<string, number>;
}

export interface PlayerState {
  hasFolded: boolean;
  hasCards: boolean;
  isShowingCards: boolean;
  bet: number;
  hasChecked: boolean;
  currentChips: number;
  isAllIn: boolean;
  showCards: boolean;
  isActive: boolean;
  isWinner: boolean;
}

export interface TableState {
  visibleBoard: Card[];
  currentPotValue: number;
  potInCenter: number;
  bigBlind: number;
  getPlayerData: (player: Player) => PlayerState;
}

export interface ParsedHandHistory {
  hands: Hand[];
}

// Utilitaires pour les énumérations
export const SuitSymbols = {
  [Suit.hearts]: '♥',    // Cœur
  [Suit.diamonds]: '♦',  // Carreau
  [Suit.clubs]: '♣',     // Trèfle
  [Suit.spades]: '♠'     // Pique
} as const;

export const SuitNames = {
  [Suit.hearts]: 'Hearts',
  [Suit.diamonds]: 'Diamonds',
  [Suit.clubs]: 'Clubs',
  [Suit.spades]: 'Spades'
} as const;

export const RankNames = {
  [Rank.two]: 'Two',
  [Rank.three]: 'Three',
  [Rank.four]: 'Four',
  [Rank.five]: 'Five',
  [Rank.six]: 'Six',
  [Rank.seven]: 'Seven',
  [Rank.eight]: 'Eight',
  [Rank.nine]: 'Nine',
  [Rank.ten]: 'Ten',
  [Rank.jack]: 'Jack',
  [Rank.queen]: 'Queen',
  [Rank.king]: 'King',
  [Rank.ace]: 'Ace'
} as const;

export const StreetNames = {
  [Street.preflop]: 'Pre-Flop',
  [Street.flop]: 'Flop',
  [Street.turn]: 'Turn',
  [Street.river]: 'River',
  [Street.showdown]: 'Showdown'
} as const;

export const ActionTypeNames = {
  [ActionType.fold]: 'Fold',
  [ActionType.call]: 'Call',
  [ActionType.raise]: 'Raise',
  [ActionType.bet]: 'Bet',
  [ActionType.check]: 'Check'
} as const;

// Type pour les replays sauvegardés
export interface SavedReplay {
  id?: number;
  label: string;
  hands: Hand[];
  createdAt: string;
  handsCount: number;
  stakes?: string;
}