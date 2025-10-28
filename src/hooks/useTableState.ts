import { useMemo } from 'react';
import { Hand, Player, PlayerState, TableState, Street, Card, ActionDataType, ActionType } from '../types/poker';
import { 
  initializePlayerChips, 
  updatePlayerBet, 
  calculateTotalBets,
  extractBetAmount 
} from '../utils/pokerCalculations';

/**
 * Calcule la big blind à partir des blinds de la main
 */
const calculateBigBlind = (hand: Hand): number => {
  const blindValues = Object.values(hand.blinds);
  if (blindValues.length === 0) return 1; // Valeur par défaut
  
  // La big blind est généralement la plus grande valeur des blinds
  return Math.max(...blindValues);
};

/**
 * Hook personnalisé pour gérer l'état de la table de poker
 */
export const useTableState = (hand: Hand | null, currentAction: number): TableState => {

  return useMemo(() => {
    if (!hand || currentAction === undefined) {
      return createEmptyTableState();
    }

    const tableState = new TableStateManager(hand, currentAction);
    return tableState.calculateState();
  }, [hand, currentAction]);
};

/**
 * Crée un état de table vide
 */
const createEmptyTableState = (): TableState => ({
  visibleBoard: [],
  currentPotValue: 0,
  potInCenter: 0,
  bigBlind: 1,
  getPlayerData: (player: Player) => ({
    hasFolded: false,
    hasCards: player.cards !== null,
    isShowingCards: false,
    bet: 0,
    hasChecked: false,
    currentChips: player.chips,
    isAllIn: false,
    showCards: player.cards !== null,
    isActive: false,
    isWinner: false
  })
});

/**
 * Gestionnaire d'état de table
 */
class TableStateManager {
  private hand: Hand;
  private currentAction: number;
  private visibleBoard: Card[] = [];
  private currentPotValue = 0;
  private foldedPlayers = new Set<string>();
  private playersShowingCards = new Set<string>();
  private playerBets: Record<string, number> = {};
  private playerChecks = new Set<string>();
  private playerChips: Record<string, number> = {};
  private hasDealtCards = false;
  private isShowdown = false;
  private currentStreet: Street = Street.preflop;
  private lastActionPlayer: string | null = null;
  private potInCenter = 0;
  private winningPlayer: string | null = null;

  constructor(hand: Hand, currentAction: number) {
    this.hand = hand;
    this.currentAction = currentAction;
  }

  /**
   * Calcule l'état complet de la table
   */
  public calculateState(): TableState {
    this.initializeState();
    this.processActions();
    this.calculateFinalState();
    
    const bigBlind = calculateBigBlind(this.hand);
    
    return {
      visibleBoard: this.visibleBoard,
      currentPotValue: this.currentPotValue,
      potInCenter: this.potInCenter,
      bigBlind,
      getPlayerData: this.getPlayerData.bind(this)
    };
  }

  /**
   * Initialise l'état de base
   */
  private initializeState(): void {
    // Initialiser les chips de départ
    this.playerChips = initializePlayerChips(this.hand.players, this.hand.playerAntes);
    
    // Initialiser les blinds
    if (this.hand.blinds) {
      Object.keys(this.hand.blinds).forEach(playerName => {
        this.playerBets[playerName] = this.hand.blinds[playerName];
        this.playerChips[playerName] = Math.max(0, this.playerChips[playerName] - this.hand.blinds[playerName]);
      });
    }
  }

  /**
   * Traite toutes les actions jusqu'à l'action courante
   */
  private processActions(): void {
    for (let i = 0; i <= this.currentAction; i++) {
      const action = this.hand.actions[i];
      if (!action) continue;

      this.processAction(action, i);
    }
  }

  /**
   * Traite une action individuelle
   */
  private processAction(action: any, actionIndex: number): void {
    // Gérer les changements de street
    if (action.type === ActionDataType.street) {
      this.handleStreetChange(action);
    }

    // Gérer les cartes distribuées
    if (action.type === ActionDataType.dealt) {
      this.hasDealtCards = true;
    }

    // Gérer les shows
    if (action.type === ActionDataType.show) {
      this.playersShowingCards.add(action.player);
    }

    // Gérer les folds
    if (action.actionType === ActionType.fold) {
      this.foldedPlayers.add(action.player);
    }

    // Gérer les gains
    if (action.type === ActionDataType.win && action.player && action.amount) {
      this.handleWin(action, actionIndex);
    }

    // Gérer les actions des joueurs
    if (action.type === ActionDataType.action && action.player) {
      this.handlePlayerAction(action, actionIndex);
    }

    // Gérer les cartes du board (seulement pour les actions de type 'street')
    if (action.cards && action.type === ActionDataType.street) {
      this.visibleBoard.push(...(action.cards as Card[]));
    }

    // Récupérer le pot de l'action courante
    if (actionIndex === this.currentAction && action.pot !== undefined) {
      this.currentPotValue = action.pot;
    }
  }

  /**
   * Gère les changements de street
   */
  private handleStreetChange(action: any): void {
    if (action.street !== Street.preflop && action.street !== this.currentStreet) {
      // Ajouter les mises de la street précédente au pot au centre
      const totalBetsFromPreviousStreet = calculateTotalBets(this.playerBets);
      this.potInCenter += totalBetsFromPreviousStreet;
      
      // Réinitialiser les mises quand on change de street
      for (let player in this.playerBets) {
        this.playerBets[player] = 0;
      }
    }
    
    this.currentStreet = action.street;
    if (action.street === Street.showdown) {
      this.isShowdown = true;
    }
  }

  /**
   * Gère les gains des joueurs
   */
  private handleWin(action: any, actionIndex: number): void {
    this.playerChips[action.player] = (this.playerChips[action.player] || 0) + action.amount;
    
    // Marquer le joueur gagnant
    this.winningPlayer = action.player;
    
    // Remettre les pots à 0 après qu'un joueur remporte la main
    if (actionIndex === this.currentAction) {
      this.currentPotValue = 0;
      this.potInCenter = 0;
      // Réinitialiser les mises de tous les joueurs
      for (let player in this.playerBets) {
        this.playerBets[player] = 0;
      }
    }
  }

  /**
   * Gère les actions des joueurs
   */
  private handlePlayerAction(action: any, actionIndex: number): void {
    const actionType = action.actionType;
    const amountStr = action.action;

    // Effacer les checks précédents quand une nouvelle action est faite
    if (actionIndex === this.currentAction) {
      this.playerChecks.clear();
    }

    if (actionType === ActionType.call || actionType === ActionType.bet || actionType === ActionType.raise) {
      // Utiliser betAmount si disponible, sinon extraire de amountStr
      const amount = action.betAmount || extractBetAmount(actionType, amountStr);
      if (amount > 0) {
        const { newBets, newChips } = updatePlayerBet(
          action.player,
          amount,
          actionType,
          this.playerBets,
          this.playerChips
        );
        this.playerBets = newBets;
        this.playerChips = newChips;
      }
    } else if (actionType === ActionType.check) {
      // Tracker le check seulement si c'est l'action courante
      if (actionIndex === this.currentAction) {
        this.playerChecks.add(action.player);
      }
    }

    // Tracker le dernier joueur ayant agi
    if (actionIndex === this.currentAction) {
      this.lastActionPlayer = action.player;
    }
  }

  /**
   * Calcule l'état final
   */
  private calculateFinalState(): void {
    // Ajouter les mises de la street actuelle au pot au centre si on est au showdown
    if (this.isShowdown) {
      const totalBetsFromCurrentStreet = calculateTotalBets(this.playerBets);
      this.potInCenter += totalBetsFromCurrentStreet;
    }
    
    // Calculer le pot centre = pot total - mises des joueurs
    const totalPlayerBets = calculateTotalBets(this.playerBets);
    this.potInCenter = Math.max(0, this.currentPotValue - totalPlayerBets);
  }

  /**
   * Obtient les données d'un joueur
   */
  private getPlayerData(player: Player): PlayerState {
    const hasFolded = this.foldedPlayers.has(player.name);
    const hasCards = player.cards !== null;
    const isShowingCards = this.playersShowingCards.has(player.name);
    const bet = this.playerBets[player.name] || 0;
    const hasChecked = this.playerChecks.has(player.name);
    const currentChips = this.playerChips[player.name] !== undefined 
      ? this.playerChips[player.name] 
      : parseFloat(player.chips.toString().replace(/[^\d.]/g, ''));
    const isAllIn = currentChips === 0 && !hasFolded;

    // Afficher les vraies cartes si :
    // - C'est le joueur principal (hero)
    // - OU le joueur montre ses cartes (action "Montre")
    const showCards = (player.isHero && hasCards) || isShowingCards;

    // Le joueur est actif (a des cartes) si :
    // - On a distribué des cartes (la main a commencé)
    // - ET le joueur n'a pas fold
    const isActive = this.hasDealtCards && !hasFolded;

    // Le joueur est gagnant si c'est le joueur qui a remporté la main
    const isWinner = this.winningPlayer === player.name;

    return {
      hasFolded,
      hasCards,
      isShowingCards,
      bet,
      hasChecked,
      currentChips,
      isAllIn,
      showCards,
      isActive,
      isWinner
    };
  }
}
