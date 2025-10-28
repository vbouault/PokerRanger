import { Action, ActionType } from '../types/poker';

/**
 * Utilitaires pour travailler avec les actions de poker
 */

/**
 * Obtient le montant d'une action de mise
 */
export const getActionAmount = (action: Action): number => {
  return action.betAmount || 0;
};

/**
 * Vérifie si une action est une mise (bet, call, raise)
 */
export const isBettingAction = (action: Action): boolean => {
  return action.actionType === ActionType.bet || 
         action.actionType === ActionType.call || 
         action.actionType === ActionType.raise;
};

/**
 * Obtient le texte formaté d'une action avec montant
 */
export const getFormattedActionText = (action: Action): string => {
  if (!isBettingAction(action) || !action.betAmount) {
    return action.action;
  }

  const amount = action.betAmount;
  switch (action.actionType) {
    case ActionType.bet:
      return `Mise ${amount}`;
    case ActionType.call:
      return `Suit ${amount}`;
    case ActionType.raise:
      return `Relance à ${amount}`;
    default:
      return action.action;
  }
};

/**
 * Calcule le total des mises d'un joueur pour une street donnée
 */
export const calculatePlayerBetsForStreet = (actions: Action[], playerName: string, street: string): number => {
  return actions
    .filter(action => 
      action.player === playerName && 
      action.street === street && 
      isBettingAction(action)
    )
    .reduce((total, action) => total + getActionAmount(action), 0);
};

/**
 * Trouve la dernière action d'un joueur
 */
export const getLastPlayerAction = (actions: Action[], playerName: string): Action | undefined => {
  return actions
    .filter(action => action.player === playerName)
    .sort((a, b) => b.index - a.index)[0];
};
