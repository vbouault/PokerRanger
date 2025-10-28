/**
 * Utilitaires pour le formatage des montants en Big Blinds
 */

/**
 * Formate un montant en Big Blinds ou en montant normal
 * @param amount - Le montant à formater
 * @param showInBB - Si true, affiche en BB, sinon en montant normal
 * @param bigBlind - La valeur de la big blind
 * @returns Le montant formaté
 */
export const formatAmount = (amount: number, showInBB: boolean, bigBlind: number): string => {
  if (showInBB && bigBlind > 0) {
    const bbValue = amount / bigBlind;
    return Math.round(bbValue * 10) / 10 + 'BB';
  }
  return amount.toLocaleString('fr-FR');
};

/**
 * Formate les jetons d'un joueur en Big Blinds ou en montant normal
 * @param chips - Les jetons du joueur
 * @param showInBB - Si true, affiche en BB, sinon en montant normal
 * @param bigBlind - La valeur de la big blind
 * @returns Les jetons formatés
 */
export const formatChips = (chips: number, showInBB: boolean, bigBlind: number): string => {
  return formatAmount(chips, showInBB, bigBlind);
};
