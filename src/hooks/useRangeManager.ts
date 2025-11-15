import { useState, useEffect, useCallback } from 'react';
import { databaseService } from '../services/firestore';
import { Folder, Range, Action, RangeHand, PokerHand, RangeStats } from '../types/range';

export const useRangeManager = () => {
  const [hierarchy, setHierarchy] = useState<Folder[]>([]);
  const [currentRange, setCurrentRange] = useState<Range | null>(null);
  const [actions, setActions] = useState<Action[]>([]);
  const [rangeHands, setRangeHands] = useState<RangeHand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Cache local pour éviter les appels multiples
  const rangeDataCache = useState<Map<number, { actions: Action[], hands: RangeHand[] }>>(
    () => new Map()
  )[0];

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

  // Charger les données d'un range spécifique (avec cache)
  const loadRangeData = useCallback(async (rangeId: number, forceRefresh = false) => {
    try {
      // Vérifier le cache d'abord
      if (!forceRefresh && rangeDataCache.has(rangeId)) {
        const cached = rangeDataCache.get(rangeId)!;
        setActions(cached.actions);
        setRangeHands(cached.hands);
        return;
      }
      
      // Charger depuis Firestore si pas en cache
      const [rangeActions, hands] = await Promise.all([
        databaseService.getActionsForRange(rangeId),
        databaseService.getRangeHands(rangeId)
      ]);
      
      // Mettre en cache
      rangeDataCache.set(rangeId, { actions: rangeActions, hands });
      
      setActions(rangeActions);
      setRangeHands(hands);
    } catch (err) {
      setError('Erreur lors du chargement des données du range');
      console.error(err);
    }
  }, [rangeDataCache]);

  // Sélectionner un range (évite les rechargements inutiles)
  const selectRange = useCallback((range: Range) => {
    // Ne rien faire si on sélectionne la même range
    if (currentRange?.id === range.id) {
      return;
    }
    
    setCurrentRange(range);
    loadRangeData(range.id);
  }, [currentRange, loadRangeData]);

  // Créer un nouveau dossier (avec mise à jour optimiste)
  const createFolder = useCallback(async (name: string, parentId?: number) => {
    try {
      const newFolderId = await databaseService.createFolder(name, parentId);
      
      // Mise à jour optimiste locale au lieu de recharger toute la hiérarchie
      const newFolder: Folder = {
        id: newFolderId,
        name,
        parentId,
        position: Date.now(),
        createdAt: new Date().toISOString(),
        folders: [],
        ranges: []
      };
      
      setHierarchy(prev => {
        const updated = [...prev];
        if (parentId) {
          // Ajouter au dossier parent
          const addToFolder = (folders: Folder[]): Folder[] => {
            return folders.map(folder => {
              if (folder.id === parentId) {
                return { ...folder, folders: [...(folder.folders || []), newFolder] };
              }
              if (folder.folders && folder.folders.length > 0) {
                return { ...folder, folders: addToFolder(folder.folders) };
              }
              return folder;
            });
          };
          return addToFolder(updated);
        } else {
          // Ajouter à la racine
          return [...updated, newFolder];
        }
      });
      
      return newFolderId;
    } catch (err) {
      setError('Erreur lors de la création du dossier');
      console.error(err);
      await loadHierarchy(); // Recharger seulement en cas d'erreur
      return null;
    }
  }, [loadHierarchy]);

  // Mettre à jour un dossier (avec mise à jour optimiste)
  const updateFolder = useCallback(async (id: number, name: string) => {
    try {
      // Mise à jour optimiste locale
      setHierarchy(prev => {
        const updateFolderName = (folders: Folder[]): Folder[] => {
          return folders.map(folder => {
            if (folder.id === id) {
              return { ...folder, name };
            }
            if (folder.folders && folder.folders.length > 0) {
              return { ...folder, folders: updateFolderName(folder.folders) };
            }
            return folder;
          });
        };
        return updateFolderName(prev);
      });
      
      await databaseService.updateFolder(id, name);
    } catch (err) {
      setError('Erreur lors de la mise à jour du dossier');
      console.error(err);
      await loadHierarchy(); // Recharger seulement en cas d'erreur
    }
  }, [loadHierarchy]);

  // Supprimer un dossier (avec mise à jour optimiste)
  const deleteFolder = useCallback(async (id: number) => {
    try {
      // Mise à jour optimiste locale
      setHierarchy(prev => {
        const removeFolderById = (folders: Folder[]): Folder[] => {
          return folders
            .filter(folder => folder.id !== id)
            .map(folder => ({
              ...folder,
              folders: folder.folders ? removeFolderById(folder.folders) : []
            }));
        };
        return removeFolderById(prev);
      });
      
      await databaseService.deleteFolder(id);
    } catch (err) {
      setError('Erreur lors de la suppression du dossier');
      console.error(err);
      await loadHierarchy(); // Recharger seulement en cas d'erreur
    }
  }, [loadHierarchy]);

  // Créer une nouvelle range (avec mise à jour optimiste)
  const createRange = useCallback(async (name: string, folderId?: number) => {
    try {
      const newRangeId = await databaseService.createRange(name, folderId);
      
      // Mise à jour optimiste locale
      const newRange: Range = {
        id: newRangeId,
        name,
        folderId,
        position: Date.now(),
        createdAt: new Date().toISOString()
      };
      
      setHierarchy(prev => {
        const updated = [...prev];
        if (folderId) {
          // Ajouter au dossier parent
          const addRangeToFolder = (folders: Folder[]): Folder[] => {
            return folders.map(folder => {
              if (folder.id === folderId) {
                return { ...folder, ranges: [...(folder.ranges || []), newRange] };
              }
              if (folder.folders && folder.folders.length > 0) {
                return { ...folder, folders: addRangeToFolder(folder.folders) };
              }
              return folder;
            });
          };
          return addRangeToFolder(updated);
        }
        return updated;
      });
      
      return newRangeId;
    } catch (err) {
      setError('Erreur lors de la création de la range');
      console.error(err);
      await loadHierarchy(); // Recharger seulement en cas d'erreur
      return null;
    }
  }, [loadHierarchy]);

  // Mettre à jour une range (avec mise à jour optimiste)
  const updateRange = useCallback(async (id: number, name: string) => {
    try {
      // Mise à jour optimiste locale
      setHierarchy(prev => {
        const updateRangeName = (folders: Folder[]): Folder[] => {
          return folders.map(folder => {
            const updatedRanges = folder.ranges?.map(range => 
              range.id === id ? { ...range, name } : range
            );
            return {
              ...folder,
              ranges: updatedRanges,
              folders: folder.folders ? updateRangeName(folder.folders) : []
            };
          });
        };
        return updateRangeName(prev);
      });
      
      // Mettre à jour aussi currentRange si c'est celle en cours
      if (currentRange && currentRange.id === id) {
        setCurrentRange({ ...currentRange, name });
      }
      
      await databaseService.updateRange(id, name);
    } catch (err) {
      setError('Erreur lors de la mise à jour de la range');
      console.error(err);
      await loadHierarchy(); // Recharger seulement en cas d'erreur
    }
  }, [loadHierarchy, currentRange]);

  // Supprimer une range (avec mise à jour optimiste)
  const deleteRange = useCallback(async (id: number) => {
    try {
      // Mise à jour optimiste locale
      setHierarchy(prev => {
        const removeRangeById = (folders: Folder[]): Folder[] => {
          return folders.map(folder => ({
            ...folder,
            ranges: folder.ranges?.filter(range => range.id !== id),
            folders: folder.folders ? removeRangeById(folder.folders) : []
          }));
        };
        return removeRangeById(prev);
      });
      
      // Si c'était la range actuelle, la désélectionner
      if (currentRange?.id === id) {
        setCurrentRange(null);
        setActions([]);
        setRangeHands([]);
      }
      
      await databaseService.deleteRange(id);
    } catch (err) {
      setError('Erreur lors de la suppression de la range');
      console.error(err);
      await loadHierarchy(); // Recharger seulement en cas d'erreur
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

  // Déplacer un dossier vers un nouveau parent
  const moveFolderToParent = useCallback(async (folderId: number, newParentId: number | null) => {
    try {
      await databaseService.moveFolderToParent(folderId, newParentId);
      await loadHierarchy(); // Recharger la hiérarchie
    } catch (err) {
      setError('Erreur lors du déplacement du dossier');
      console.error(err);
    }
  }, [loadHierarchy]);

  // Déplacer une range vers un nouveau dossier
  const moveRangeToFolder = useCallback(async (rangeId: number, newFolderId: number | null) => {
    try {
      await databaseService.moveRangeToFolder(rangeId, newFolderId);
      await loadHierarchy(); // Recharger la hiérarchie
    } catch (err) {
      setError('Erreur lors du déplacement de la range');
      console.error(err);
    }
  }, [loadHierarchy]);

  // Réorganiser une range (changer sa position)
  const reorderRange = useCallback(async (rangeId: number, targetRangeId: number, insertBefore: boolean) => {
    try {
      await databaseService.reorderRange(rangeId, targetRangeId, insertBefore);
      await loadHierarchy(); // Recharger la hiérarchie
    } catch (err) {
      setError('Erreur lors de la réorganisation de la range');
      console.error(err);
    }
  }, [loadHierarchy]);

  // Réorganiser un dossier (changer sa position)
  const reorderFolder = useCallback(async (folderId: number, targetFolderId: number, insertBefore: boolean) => {
    try {
      await databaseService.reorderFolder(folderId, targetFolderId, insertBefore);
      await loadHierarchy(); // Recharger la hiérarchie
    } catch (err) {
      setError('Erreur lors de la réorganisation du dossier');
      console.error(err);
    }
  }, [loadHierarchy]);

  // Créer une nouvelle action
  const createAction = useCallback(async (rangeId: number, name: string, color: string) => {
    try {
      const newActionId = await databaseService.createAction(rangeId, name, color);
      if (currentRange?.id === rangeId) {
        // Invalider le cache et recharger
        rangeDataCache.delete(rangeId);
        await loadRangeData(rangeId, true);
      }
      return newActionId;
    } catch (err) {
      setError('Erreur lors de la création de l\'action');
      console.error(err);
      return null;
    }
  }, [currentRange, loadRangeData, rangeDataCache]);

  // Mettre à jour une action
  const updateAction = useCallback(async (id: number, name: string, color: string) => {
    try {
      // Mise à jour optimiste locale
      setActions(prev => prev.map(action => 
        action.id === id ? { ...action, name, color } : action
      ));
      
      await databaseService.updateAction(id, name, color);
      
      // Invalider le cache
      if (currentRange) {
        rangeDataCache.delete(currentRange.id);
      }
    } catch (err) {
      setError('Erreur lors de la mise à jour de l\'action');
      console.error(err);
      // Recharger en cas d'erreur
      if (currentRange) {
        await loadRangeData(currentRange.id, true);
      }
    }
  }, [currentRange, loadRangeData, rangeDataCache]);

  // Supprimer une action
  const deleteAction = useCallback(async (id: number) => {
    try {
      // Mise à jour optimiste locale
      setActions(prev => prev.filter(action => action.id !== id));
      setRangeHands(prev => prev.filter(hand => hand.actionId !== id));
      
      await databaseService.deleteAction(id);
      
      // Invalider le cache
      if (currentRange) {
        rangeDataCache.delete(currentRange.id);
      }
    } catch (err) {
      setError('Erreur lors de la suppression de l\'action');
      console.error(err);
      // Recharger en cas d'erreur
      if (currentRange) {
        await loadRangeData(currentRange.id, true);
      }
    }
  }, [currentRange, loadRangeData, rangeDataCache]);

  // Assigner une main à une action (avec mise à jour optimiste)
  const assignHandToAction = useCallback(async (hand: PokerHand, actionId: number) => {
    if (!currentRange) return;
    
    try {
      // Mise à jour optimiste locale
      setRangeHands(prev => {
        const existing = prev.find(h => h.hand === hand);
        if (existing) {
          return prev.map(h => h.hand === hand ? { ...h, actionId } : h);
        }
        return [...prev, { rangeId: currentRange.id, hand, actionId }];
      });
      
      await databaseService.setHandAction(currentRange.id, hand, actionId);
      
      // Invalider le cache
      rangeDataCache.delete(currentRange.id);
    } catch (err) {
      setError('Erreur lors de l\'assignation de la main');
      console.error(err);
      // Recharger en cas d'erreur
      await loadRangeData(currentRange.id, true);
    }
  }, [currentRange, loadRangeData, rangeDataCache]);

  // Retirer une main d'une action (avec mise à jour optimiste)
  const removeHandFromAction = useCallback(async (hand: PokerHand) => {
    if (!currentRange) return;
    
    try {
      // Mise à jour optimiste locale
      setRangeHands(prev => prev.filter(h => h.hand !== hand));
      
      await databaseService.removeHandAction(currentRange.id, hand);
      
      // Invalider le cache
      rangeDataCache.delete(currentRange.id);
    } catch (err) {
      setError('Erreur lors de la suppression de la main');
      console.error(err);
      // Recharger en cas d'erreur
      await loadRangeData(currentRange.id, true);
    }
  }, [currentRange, loadRangeData, rangeDataCache]);

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
    moveFolderToParent,
    reorderFolder,
    
    // Actions - Ranges
    selectRange,
    createRange,
    updateRange,
    deleteRange,
    duplicateRange,
    moveRangeToFolder,
    reorderRange,
    
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
