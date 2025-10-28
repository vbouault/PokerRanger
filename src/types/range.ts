// Types pour le système de ranges poker

// Un dossier contient des dossiers et/ou des ranges, mais n'a pas d'actions/mains
export interface Folder {
  id: number;
  name: string;
  parentId?: number;
  position: number;
  createdAt: string;
  folders?: Folder[];
  ranges?: Range[];
}

// Une range contient des actions et des mains, mais ne peut pas contenir d'autres éléments
export interface Range {
  id: number;
  name: string;
  folderId?: number; // ID du dossier parent (ou undefined si à la racine)
  position: number;
  createdAt: string;
}

export interface Action {
  id: number;
  rangeId: number;
  name: string;
  color: string; // Code couleur hex (#FF0000)
  position: number;
}

export interface RangeHand {
  rangeId: number;
  actionId: number;
  hand: string; // 'AA', 'AKs', 'A2o', etc.
}

// Ordre des cartes pour la grille (A, K, Q, J, T, 9, 8, 7, 6, 5, 4, 3, 2)
export const CARD_RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'] as const;

// Générer la grille 13x13 des mains de poker
export const generatePokerHandsGrid = (): string[][] => {
  const grid: string[][] = [];
  
  for (let row = 0; row < 13; row++) {
    const rowHands: string[] = [];
    for (let col = 0; col < 13; col++) {
      const card1 = CARD_RANKS[row];
      const card2 = CARD_RANKS[col];
      
      if (row === col) {
        // Diagonale : paires
        rowHands.push(`${card1}${card2}`);
      } else if (row < col) {
        // Triangle supérieur : suited hands
        rowHands.push(`${card1}${card2}s`);
      } else {
        // Triangle inférieur : offsuit hands
        // Inverser l'ordre pour avoir la plus grosse carte en premier
        rowHands.push(`${card2}${card1}o`);
      }
    }
    grid.push(rowHands);
  }
  
  return grid;
};

// Grille des mains de poker
export const POKER_HANDS_GRID = generatePokerHandsGrid();

// Liste plate de toutes les mains pour compatibilité
export const POKER_HANDS = POKER_HANDS_GRID.flat();

export type PokerHand = typeof POKER_HANDS[number];

// Couleurs par défaut pour les actions
export const DEFAULT_COLORS = [
  '#A31E00', 
  '#FF4500', // Orange Red
  '#32CD32', // Lime Green
  '#1D421D', // Lime
  '#212183', // Blue
  '#FF8C00', // Dark Orange
  '#8A2BE2', // Blue Violet
  '#FFD700', // Gold
  '#FF69B4', // Hot Pink
  '#00CED1'  // Dark Turquoise
] as const;

export interface RangeStats {
  totalHands: number;
  selectedHands: number;
  percentage: number;
  actionBreakdown: Record<string, number>;
}
