import { useState, useEffect, useCallback } from 'react';
import { databaseService } from '../services/indexedDB';
import { Folder, Range, Action, RangeHand, PokerHand, RangeStats } from '../types/range';

export const useRangeManager = () => {
  const [hierarchy, setHierarchy] = useState<Folder[]>([]);
  const [currentRange, setCurrentRange] = useState<Range | null>(null);
  const [actions, setActions] = useState<Action[]>([]);
  const [rangeHands, setRangeHands] = useState<RangeHand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialiser la base de données
  useEffect(() => {
    const initDatabase = async () => {
      try {
        setIsLoading(true);
        await databaseService.initialize();
        loadHierarchy();
      } catch (err) {
        setError('Erreur lors de l\'initialisation de la base de données');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    initDatabase();
  }, []);

  // Charger la hiérarchie complète (folders + ranges)
  const loadHierarchy = useCallback(async () => {
    try {
      const fullHierarchy = await databaseService.getHierarchy();
      setHierarchy(fullHierarchy);
    } catch (err) {
      setError('Erreur lors du chargement de la hiérarchie');
      console.error(err);
    }
  }, []);

  // Charger les données d'un range spécifique
  const loadRangeData = useCallback(async (rangeId: number) => {
    try {
      const rangeActions = await databaseService.getActionsForRange(rangeId);
      const hands = await databaseService.getRangeHands(rangeId);
      
      setActions(rangeActions);
      setRangeHands(hands);
    } catch (err) {
      setError('Erreur lors du chargement des données du range');
      console.error(err);
    }
  }, []);

  // Sélectionner un range
  const selectRange = useCallback((range: Range) => {
    setCurrentRange(range);
    loadRangeData(range.id);
  }, [loadRangeData]);

  // Créer un nouveau dossier
  const createFolder = useCallback(async (name: string, parentId?: number) => {
    try {
      const newFolderId = await databaseService.createFolder(name, parentId);
      await loadHierarchy(); // Recharger la hiérarchie
      return newFolderId;
    } catch (err) {
      setError('Erreur lors de la création du dossier');
      console.error(err);
      return null;
    }
  }, [loadHierarchy]);

  // Mettre à jour un dossier
  const updateFolder = useCallback(async (id: number, name: string) => {
    try {
      await databaseService.updateFolder(id, name);
      await loadHierarchy(); // Recharger la hiérarchie
    } catch (err) {
      setError('Erreur lors de la mise à jour du dossier');
      console.error(err);
    }
  }, [loadHierarchy]);

  // Supprimer un dossier
  const deleteFolder = useCallback(async (id: number) => {
    try {
      await databaseService.deleteFolder(id);
      await loadHierarchy(); // Recharger la hiérarchie
    } catch (err) {
      setError('Erreur lors de la suppression du dossier');
      console.error(err);
    }
  }, [loadHierarchy]);

  // Créer une nouvelle range
  const createRange = useCallback(async (name: string, folderId?: number) => {
    try {
      const newRangeId = await databaseService.createRange(name, folderId);
      await loadHierarchy(); // Recharger la hiérarchie
      return newRangeId;
    } catch (err) {
      setError('Erreur lors de la création de la range');
      console.error(err);
      return null;
    }
  }, [loadHierarchy]);

  // Mettre à jour une range
  const updateRange = useCallback(async (id: number, name: string) => {
    try {
      await databaseService.updateRange(id, name);
      await loadHierarchy(); // Recharger la hiérarchie
    } catch (err) {
      setError('Erreur lors de la mise à jour de la range');
      console.error(err);
    }
  }, [loadHierarchy]);

  // Supprimer une range
  const deleteRange = useCallback(async (id: number) => {
    try {
      await databaseService.deleteRange(id);
      await loadHierarchy(); // Recharger la hiérarchie
      
      // Si c'était la range actuelle, la désélectionner
      if (currentRange?.id === id) {
        setCurrentRange(null);
        setActions([]);
        setRangeHands([]);
      }
    } catch (err) {
      setError('Erreur lors de la suppression de la range');
      console.error(err);
    }
  }, [currentRange, loadHierarchy]);

  // Dupliquer une range
  const duplicateRange = useCallback(async (id: number, newName?: string) => {
    try {
      await databaseService.duplicateRange(id, newName);
      await loadHierarchy(); // Recharger la hiérarchie
    } catch (err) {
      setError('Erreur lors de la copie de la range');
      console.error(err);
    }
  }, [loadHierarchy]);

  // Dupliquer un dossier
  const duplicateFolder = useCallback(async (id: number, newName?: string) => {
    try {
      await databaseService.duplicateFolder(id, newName);
      await loadHierarchy(); // Recharger la hiérarchie
    } catch (err) {
      setError('Erreur lors de la copie du dossier');
      console.error(err);
    }
  }, [loadHierarchy]);

  // Créer une nouvelle action
  const createAction = useCallback(async (rangeId: number, name: string, color: string) => {
    try {
      const newActionId = await databaseService.createAction(rangeId, name, color);
      if (currentRange?.id === rangeId) {
        await loadRangeData(rangeId); // Recharger les actions
      }
      return newActionId;
    } catch (err) {
      setError('Erreur lors de la création de l\'action');
      console.error(err);
      return null;
    }
  }, [currentRange, loadRangeData]);

  // Mettre à jour une action
  const updateAction = useCallback(async (id: number, name: string, color: string) => {
    try {
      await databaseService.updateAction(id, name, color);
      if (currentRange) {
        await loadRangeData(currentRange.id); // Recharger les actions
      }
    } catch (err) {
      setError('Erreur lors de la mise à jour de l\'action');
      console.error(err);
    }
  }, [currentRange, loadRangeData]);

  // Supprimer une action
  const deleteAction = useCallback(async (id: number) => {
    try {
      await databaseService.deleteAction(id);
      if (currentRange) {
        await loadRangeData(currentRange.id); // Recharger les actions
      }
    } catch (err) {
      setError('Erreur lors de la suppression de l\'action');
      console.error(err);
    }
  }, [currentRange, loadRangeData]);

  // Assigner une main à une action
  const assignHandToAction = useCallback(async (hand: PokerHand, actionId: number) => {
    if (!currentRange) return;
    
    try {
      await databaseService.setHandAction(currentRange.id, hand, actionId);
      await loadRangeData(currentRange.id); // Recharger les mains
    } catch (err) {
      setError('Erreur lors de l\'assignation de la main');
      console.error(err);
    }
  }, [currentRange, loadRangeData]);

  // Retirer une main d'une action
  const removeHandFromAction = useCallback(async (hand: PokerHand) => {
    if (!currentRange) return;
    
    try {
      await databaseService.removeHandAction(currentRange.id, hand);
      await loadRangeData(currentRange.id); // Recharger les mains
    } catch (err) {
      setError('Erreur lors de la suppression de la main');
      console.error(err);
    }
  }, [currentRange, loadRangeData]);

  // Obtenir les statistiques du range actuel
  const getRangeStats = useCallback((): RangeStats => {
    const totalHands = 169; // Nombre total de mains possibles
    const selectedHands = rangeHands.length;
    const percentage = (selectedHands / totalHands) * 100;

    const actionBreakdown: Record<string, number> = {};
    rangeHands.forEach(rangeHand => {
      const action = actions.find(a => a.id === rangeHand.actionId);
      if (action) {
        actionBreakdown[action.name] = (actionBreakdown[action.name] || 0) + 1;
      }
    });

    return {
      totalHands,
      selectedHands,
      percentage: Math.round(percentage * 10) / 10,
      actionBreakdown
    };
  }, [rangeHands, actions]);

  // Obtenir l'action d'une main spécifique
  const getHandAction = useCallback((hand: PokerHand): Action | null => {
    const rangeHand = rangeHands.find(rh => rh.hand === hand);
    if (!rangeHand) return null;
    
    return actions.find(a => a.id === rangeHand.actionId) || null;
  }, [rangeHands, actions]);

  return {
    // État
    hierarchy,
    currentRange,
    actions,
    rangeHands,
    isLoading,
    error,
    
    // Actions - Folders
    createFolder,
    updateFolder,
    deleteFolder,
    duplicateFolder,
    
    // Actions - Ranges
    selectRange,
    createRange,
    updateRange,
    deleteRange,
    duplicateRange,
    
    // Actions - Actions
    createAction,
    updateAction,
    deleteAction,
    
    // Actions - Mains
    assignHandToAction,
    removeHandFromAction,
    getRangeStats,
    getHandAction,
    
    // Utilitaires
    loadHierarchy
  };
};
