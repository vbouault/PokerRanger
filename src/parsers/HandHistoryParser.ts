import { Hand, Action, Street, ActionType, Card, ActionDataType } from '../types/poker';

/**
 * Parser modulaire pour les historiques de mains de poker
 * Supporte les formats PokerStars, Winamax, et format générique
 */
export class HandHistoryParser {
  private handIndex = 0;
  private actionIndex = 0;
  private currentStreet: Street = Street.preflop;
  private currentPot = 0;
  private inSummary = false;

  /**
   * Parse un texte d'historique de main
   */
  public parse(historyText: string): Hand[] {
    const hands: Hand[] = [];
    const handBlocks = this.splitIntoHandBlocks(historyText);

    handBlocks.forEach(block => {
      const hand = this.parseHandBlock(block);
      if (hand && (hand.players.length > 0 || hand.actions.length > 0)) {
        hands.push(hand);
      }
    });

    return hands;
  }

  /**
   * Divise le texte en blocs de mains
   */
  private splitIntoHandBlocks(historyText: string): string[] {
    return historyText.split(/\n\n+|\*\*\*\*\*/).filter(block => block.trim());
  }

  /**
   * Parse un bloc de main individuel
   */
  private parseHandBlock(block: string): Hand | null {
    const lines = block.split('\n').filter(line => line.trim());
    if (lines.length === 0) return null;

    this.resetParserState();
    
    const hand: Hand = this.createEmptyHand();
    
    lines.forEach(line => {
      this.processLine(line.trim(), hand);
    });

    // Réorganiser les joueurs pour que le hero soit toujours en premier
    hand.players = this.reorderPlayersWithHeroFirst(hand.players);

    return hand;
  }

  /**
   * Réinitialise l'état du parser
   */
  private resetParserState(): void {
    this.actionIndex = 0;
    this.currentStreet = Street.preflop;
    this.currentPot = 0;
    this.inSummary = false;
  }

  /**
   * Crée une main vide
   */
  private createEmptyHand(): Hand {
    return {
      id: this.handIndex++,
      handNumber: '',
      date: '',
      stakes: '',
      tableInfo: '',
      players: [],
      actions: [],
      board: [],
      pot: 0,
      blinds: {},
      playerWinnings: {}
    };
  }

  /**
   * Traite une ligne du fichier d'historique
   */
  private processLine(line: string, hand: Hand): void {
    // Ignorer les lignes dans la section SUMMARY
    if (line.includes('*** SUMMARY ***')) {
      this.inSummary = true;
      return;
    }

    // Ignorer les actions dans le summary
    if (this.inSummary && this.isActionInSummary(line)) {
      return;
    }

    // Parser les différents types de lignes
    this.parseHandInfo(line, hand) ||
    this.parsePlayer(line, hand) ||
    this.parseDealer(line, hand) ||
    this.parseStreet(line, hand) ||
    this.parseAnte(line, hand) ||
    this.parseBlind(line, hand) ||
    this.parseCards(line, hand) ||
    this.parseAction(line, hand) ||
    this.parseShow(line, hand) ||
    this.parseWin(line, hand) ||
    this.parsePot(line, hand) ||
    this.parseSummaryShow(line, hand);
  }

  /**
   * Vérifie si une ligne est une action dans le summary
   */
  private isActionInSummary(line: string): boolean {
    const actionKeywords = [
      'posts', 'folds', 'calls', 'raises', 'bets', 'checks',
      'collected', 'wins', 'won', 'and won', 'and lost'
    ];
    return actionKeywords.some(keyword => line.includes(keyword));
  }

  /**
   * Parse les informations générales de la main
   */
  private parseHandInfo(line: string, hand: Hand): boolean {
    if (line.includes('Hand #') || line.includes('Hand ID') || line.includes('Winamax Poker')) {
      hand.handNumber = line;
      
      // Extraire le buyin pour Winamax (format: "buyIn: X€ + Y€")
      if (line.includes('buyIn:')) {
        const buyInMatch = line.match(/buyIn:\s*([\d.]+€\s*\+\s*[\d.]+€)/);
        if (buyInMatch) {
          hand.stakes = buyInMatch[1];
        }
      }
      // Extraire le buyin pour PokerStars (format: "$X+$Y" ou "€X+€Y")
      else if (line.match(/[€$][\d.]+\+[€$][\d.]+/)) {
        const buyInMatch = line.match(/([€$][\d.]+\+[€$][\d.]+)/);
        if (buyInMatch) {
          hand.stakes = buyInMatch[1];
        }
      }
      
      return true;
    }
    
    if (line.match(/\d{4}\/\d{2}\/\d{2}/) || line.match(/\d{2}:\d{2}:\d{2}/)) {
      hand.date = line;
      return true;
    }
    
    if (line.includes('€') || line.includes('$') || line.includes('Blinds')) {
      // Ne pas écraser les stakes si déjà définis (depuis le buyIn)
      if (!hand.stakes) {
        hand.stakes = line;
      }
      return true;
    }
    
    if (line.includes('Table') || line.includes('table')) {
      hand.tableInfo = line;
      return true;
    }
    
    return false;
  }

  /**
   * Parse les informations des joueurs
   */
  private parsePlayer(line: string, hand: Hand): boolean {
    if (!line.match(/^Seat \d+: .+ \(.+\)/) || this.inSummary) {
      return false;
    }

    const seatMatch = line.match(/^Seat (\d+): (.+?) \((.+)\)/);
    if (!seatMatch) return false;

    const playerInfo = seatMatch[3];
    const chipsBountyMatch = playerInfo.match(/^(.+?),\s*(.+?\s+bounty)$/);
    
    let chips = playerInfo;
    let bounty: string | undefined;
    
    if (chipsBountyMatch) {
      chips = chipsBountyMatch[1].trim();
      bounty = chipsBountyMatch[2].trim();
    }
    
    hand.players.push({
      seat: parseInt(seatMatch[1]),
      name: seatMatch[2],
      chips: parseFloat(chips.replace(/[^\d.]/g, '')) || 0,
      bounty,
      cards: null,
      isDealer: false
    });

    return true;
  }

  /**
   * Parse le bouton dealer
   */
  private parseDealer(line: string, hand: Hand): boolean {
    if (!line.includes('Seat #') || !line.includes('is the button')) {
      return false;
    }

    const buttonMatch = line.match(/Seat #(\d+) is the button/);
    if (!buttonMatch) return false;

    const buttonSeat = parseInt(buttonMatch[1]);
    const dealer = hand.players.find(p => p.seat === buttonSeat);
    if (dealer) dealer.isDealer = true;

    return true;
  }

  /**
   * Parse les streets (PREFLOP, FLOP, TURN, RIVER, SHOWDOWN)
   */
  private parseStreet(line: string, hand: Hand): boolean {
        if (line.includes('*** HOLE CARDS ***') || line.includes('*** PRE-FLOP ***')) {
          this.currentStreet = Street.preflop;
          // Pas d'action pour le preflop (masqué)
          return true;
        }
    
    if (line.includes('*** FLOP ***')) {
      const cards = line.match(/\[([^\]]+)\]/);
      this.currentStreet = Street.flop;
      const actionText = cards ? `Flop: ${cards[1]}` : 'Flop';
      const cardArray = cards ? cards[1].split(' ') as Card[] : [];
      this.addStreetAction(hand, Street.flop, actionText, cardArray);
      if (cards) hand.board.push(...cardArray);
      return true;
    }
    
    if (line.includes('*** TURN ***')) {
      const cards = line.match(/\[([^\]]+)\]\[([^\]]+)\]/);
      this.currentStreet = Street.turn;
      if (cards) {
        const turnCard = cards[2] as Card;
        this.addStreetAction(hand, Street.turn, `Turn: ${turnCard}`, [turnCard]);
        hand.board.push(turnCard);
      }
      return true;
    }
    
    if (line.includes('*** RIVER ***')) {
      const cards = line.match(/\]\[([^\]]+)\]$/);
      this.currentStreet = Street.river;
      if (cards) {
        const riverCard = cards[1] as Card;
        this.addStreetAction(hand, Street.river, `River: ${riverCard}`, [riverCard]);
        hand.board.push(riverCard);
      }
      return true;
    }
    
    if (line.includes('*** SHOW DOWN ***')) {
      this.currentStreet = Street.showdown;
      this.addStreetAction(hand, Street.showdown, 'Showdown');
      return true;
    }
    
    return false;
  }

  /**
   * Parse les antes
   */
  private parseAnte(line: string, hand: Hand): boolean {
    if (!line.match(/^.+? posts ante/i)) return false;

    const anteMatch = line.match(/^(.+?) posts ante (.+)$/i);
    if (!anteMatch) return false;

    const amount = parseFloat(anteMatch[2].replace(/[^0-9.]/g, '')) || 0;
    this.currentPot += amount;
    
    if (!hand.playerAntes) hand.playerAntes = {};
    hand.playerAntes[anteMatch[1]] = (hand.playerAntes[anteMatch[1]] || 0) + amount;

    // Les antes ne sont pas ajoutées aux actions (masquées)
    return true;
  }

  /**
   * Parse les blinds
   */
  private parseBlind(line: string, hand: Hand): boolean {
    if (!line.match(/^.+? posts (small|big) blind/i)) return false;

    const blindMatch = line.match(/^(.+?) posts (small|big) blind (.+)$/i);
    if (!blindMatch) return false;

    const amount = parseFloat(blindMatch[3].replace(/[^0-9.]/g, '')) || 0;
    this.currentPot += amount;
    hand.blinds[blindMatch[1]] = amount;
    
    if (!hand.playerBlinds) hand.playerBlinds = {};
    hand.playerBlinds[blindMatch[1]] = (hand.playerBlinds[blindMatch[1]] || 0) + amount;

    // Les blinds ne sont pas ajoutés aux actions (masqués)
    return true;
  }

  /**
   * Parse les cartes distribuées
   */
  private parseCards(line: string, hand: Hand): boolean {
    if (!line.includes('Dealt to')) return false;

    const cardsMatch = line.match(/Dealt to (.+?) \[([^\]]+)\]/);
    if (!cardsMatch) return false;

    const playerName = cardsMatch[1];
    const cards = cardsMatch[2].split(' ') as Card[];
    const player = hand.players.find(p => p.name === playerName);
    
    if (player) {
      player.cards = cards;
      // Marquer le premier joueur qui reçoit des cartes comme le hero
      if (!hand.players.some(p => p.isHero)) {
        player.isHero = true;
      }
    }
    
    this.addAction(hand, {
      street: this.currentStreet,
      player: playerName,
      action: `Reçoit: ${cards.join(' ')}`,
      type: ActionDataType.dealt,
      cards
    });

    return true;
  }

  /**
   * Parse les actions des joueurs
   */
  private parseAction(line: string, hand: Hand): boolean {
    if (!line.match(/^.+? (folds|calls|raises|bets|checks)/i)) return false;

    const actionMatch = line.match(/^(.+?) (folds|calls|raises|bets|checks)(.*)$/i);
    if (!actionMatch) return false;

    const playerName = actionMatch[1];
    const action = actionMatch[2].toLowerCase() as ActionType;
    const amountStr = actionMatch[3].trim();
    
    // Extraire le montant de la mise
    const betAmount = this.extractBetAmount(action, amountStr);
    this.currentPot += betAmount;
    
    // Créer le texte d'action sans le montant (plus propre)
    const actionText = this.createActionText(action, amountStr, betAmount);
    
    this.addAction(hand, {
      street: this.currentStreet,
      player: playerName,
      action: actionText,
      actionType: action,
      type: ActionDataType.action,
      betAmount: betAmount > 0 ? betAmount : undefined
    });

    return true;
  }

  /**
   * Parse les shows (showdown)
   */
  private parseShow(line: string, hand: Hand): boolean {
    if (!line.match(/^.+? shows \[/i)) return false;

    const showMatch = line.match(/^(.+?) shows \[([^\]]+)\](.*)$/i);
    if (!showMatch) return false;

    const playerName = showMatch[1];
    const cards = showMatch[2].split(' ') as Card[];
    const handDesc = showMatch[3].trim();
    
    const player = hand.players.find(p => p.name === playerName);
    if (player && !player.cards) {
      player.cards = cards;
    }
    
    this.addAction(hand, {
      street: this.currentStreet,
      player: playerName,
      action: `Montre ${cards.join(' ')} ${handDesc}`,
      type: ActionDataType.show
    });

    return true;
  }

  /**
   * Parse les gains
   */
  private parseWin(line: string, hand: Hand): boolean {
    if (!line.match(/^.+? (collected|wins|won) /i)) return false;

    const winMatch = line.match(/^(.+?) (collected|wins|won) (.+?)( from| \||$)/i);
    if (!winMatch) return false;

    const playerName = winMatch[1];
    const amountStr = winMatch[3];
    const amount = parseFloat(amountStr.replace(/[^0-9.]/g, '')) || 0;
    
    hand.playerWinnings[playerName] = (hand.playerWinnings[playerName] || 0) + amount;
    
    this.addAction(hand, {
      street: this.currentStreet,
      player: playerName,
      action: `Remporte ${amountStr}`,
      type: ActionDataType.win,
      amount
    });

    return true;
  }

  /**
   * Parse le pot total
   */
  private parsePot(line: string, hand: Hand): boolean {
    if (!line.includes('Total pot')) return false;

    const potMatch = line.match(/Total pot (.+?)( \||$)/);
    if (potMatch) {
      hand.pot = parseFloat(potMatch[1].replace(/[^0-9.]/g, '')) || 0;
    }

    return true;
  }

  /**
   * Parse les shows dans le summary
   */
  private parseSummaryShow(line: string, hand: Hand): boolean {
    if (!this.inSummary || !line.match(/showed \[/i)) return false;

    const showMatch = line.match(/Seat \d+: (.+?) \(.+?\) showed \[([^\]]+)\]/i);
    if (!showMatch) return false;

    const playerName = showMatch[1];
    const cards = showMatch[2].split(' ') as Card[];
    const player = hand.players.find(p => p.name === playerName);
    
    if (player && !player.cards) {
      player.cards = cards;
    }

    return true;
  }

  /**
   * Ajoute une action de street
   */
  private addStreetAction(hand: Hand, street: Street, action: string, cards?: Card[]): void {
    this.addAction(hand, {
      street,
      action,
      type: ActionDataType.street,
      cards
    });
  }

  /**
   * Extrait le montant d'une action de poker
   */
  private extractBetAmount(actionType: ActionType, amountStr: string): number {
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
  }

  /**
   * Crée un texte d'action propre sans les détails de montant
   */
  private createActionText(actionType: ActionType, amountStr: string, betAmount: number): string {
    switch (actionType) {
      case ActionType.fold:
        return 'Se couche';
      case ActionType.check:
        return 'Parole';
      case ActionType.call:
        return betAmount > 0 ? `Suit ${betAmount}` : 'Suit';
      case ActionType.bet:
        return `Mise ${betAmount}`;
      case ActionType.raise:
        return `Relance à ${betAmount}`;
      default:
        return `${actionType} ${amountStr}`.trim();
    }
  }

  /**
   * Ajoute une action à la main
   */
  private addAction(hand: Hand, actionData: Partial<Action>): void {
    const action: Action = {
      index: this.actionIndex++,
      street: this.currentStreet,
      pot: this.currentPot,
      ...actionData
    } as Action;
    
    hand.actions.push(action);
  }

  /**
   * Réorganise les joueurs pour que le hero soit toujours en premier
   * tout en maintenant l'ordre des sièges autour de la table
   */
  private reorderPlayersWithHeroFirst(players: any[]): any[] {
    const heroIndex = players.findIndex(player => player.isHero);
    
    if (heroIndex === -1) {
      // Si pas de hero identifié, retourner l'ordre original
      return [...players];
    }
    
    // Trier les joueurs par numéro de siège pour maintenir l'ordre autour de la table
    const sortedPlayers = [...players].sort((a, b) => a.seat - b.seat);
    
    // Trouver l'index du hero dans la liste triée
    const heroSortedIndex = sortedPlayers.findIndex(player => player.isHero);
    
    // Créer un nouveau tableau en commençant par le hero et en suivant l'ordre des sièges
    const reorderedPlayers: any[] = [];
    
    // Ajouter le hero en premier
    reorderedPlayers.push(sortedPlayers[heroSortedIndex]);
    
    // Ajouter les autres joueurs dans l'ordre des sièges, en commençant après le hero
    for (let i = 1; i < sortedPlayers.length; i++) {
      const index = (heroSortedIndex + i) % sortedPlayers.length;
      if (index !== heroSortedIndex) {
        reorderedPlayers.push(sortedPlayers[index]);
      }
    }
    
    return reorderedPlayers;
  }
}

// Fonction d'export pour la compatibilité
export const parseHandHistory = (historyText: string) => {
  const parser = new HandHistoryParser();
  return parser.parse(historyText);
};
