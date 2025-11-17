import { Folder, Range, Action, RangeHand, DEFAULT_COLORS } from '../types/range';
import { SavedReplay } from '../types/poker';

export class IndexedDBService {
  private dbName = 'RangerDB';
  private version = 4; // Incrémenté pour ajouter le store recentColors
  private db: IDBDatabase | null = null;

  async initialize(): Promise<void> {
    try {
      this.db = await this.openDatabase();
      
      // Migrer les couleurs par défaut vers IndexedDB si aucune couleur récente n'existe
      await this.migrateDefaultColors();
      
      console.log('Base de données IndexedDB initialisée avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de la base de données:', error);
      throw error;
    }
  }

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const oldVersion = event.oldVersion;
        
        // Créer le store pour les dossiers
        if (!db.objectStoreNames.contains('folders')) {
          const foldersStore = db.createObjectStore('folders', { keyPath: 'id', autoIncrement: true });
          foldersStore.createIndex('parentId', 'parentId', { unique: false });
        }

        // Créer le store pour les ranges
        if (!db.objectStoreNames.contains('ranges')) {
          const rangesStore = db.createObjectStore('ranges', { keyPath: 'id', autoIncrement: true });
          rangesStore.createIndex('folderId', 'folderId', { unique: false });
        }

        // Créer le store pour les actions
        if (!db.objectStoreNames.contains('actions')) {
          const actionsStore = db.createObjectStore('actions', { keyPath: 'id', autoIncrement: true });
          actionsStore.createIndex('rangeId', 'rangeId', { unique: false });
        }

        // Créer le store pour les mains des ranges
        if (!db.objectStoreNames.contains('rangeHands')) {
          const rangeHandsStore = db.createObjectStore('rangeHands', { keyPath: ['rangeId', 'hand'] });
          rangeHandsStore.createIndex('rangeId', 'rangeId', { unique: false });
        }

        // Créer le store pour les replays
        if (!db.objectStoreNames.contains('replays')) {
          const replaysStore = db.createObjectStore('replays', { keyPath: 'id', autoIncrement: true });
          replaysStore.createIndex('createdAt', 'createdAt', { unique: false });
          replaysStore.createIndex('label', 'label', { unique: false });
        }

        // Créer le store pour les couleurs récentes (version 4)
        if (oldVersion < 4 && !db.objectStoreNames.contains('recentColors')) {
          const recentColorsStore = db.createObjectStore('recentColors', { keyPath: 'color' });
          recentColorsStore.createIndex('lastUsed', 'lastUsed', { unique: false });
        }
      };
    });
  }

  // Méthodes pour les folders
  async getAllFolders(): Promise<Folder[]> {
    if (!this.db) throw new Error('Base de données non initialisée');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['folders'], 'readonly');
      const store = transaction.objectStore('folders');
      const request = store.getAll();

      request.onsuccess = () => {
        const folders = request.result.map((f: any) => ({
          id: f.id,
          name: f.name,
          parentId: f.parentId,
          position: f.position,
          createdAt: f.createdAt || new Date().toISOString(),
          folders: [],
          ranges: []
        }));
        resolve(folders);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async createFolder(name: string, parentId?: number): Promise<number> {
    if (!this.db) throw new Error('Base de données non initialisée');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['folders'], 'readwrite');
      const store = transaction.objectStore('folders');
      
      // D'abord, récupérer tous les folders du même parent pour déterminer la position
      const getAllRequest = store.getAll();
      getAllRequest.onsuccess = () => {
        const allFolders = getAllRequest.result;
        const siblingsCount = allFolders.filter((f: any) => f.parentId === (parentId || null)).length;
        
        const folder = {
          name,
          parentId: parentId || null,
          position: siblingsCount, // Position à la fin
          createdAt: new Date().toISOString()
        };

        const request = store.add(folder);
        request.onsuccess = () => resolve(request.result as number);
        request.onerror = () => reject(request.error);
      };
      getAllRequest.onerror = () => reject(getAllRequest.error);
    });
  }

  async updateFolder(id: number, name: string): Promise<void> {
    if (!this.db) throw new Error('Base de données non initialisée');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['folders'], 'readwrite');
      const store = transaction.objectStore('folders');
      
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const folder = getRequest.result;
        if (folder) {
          folder.name = name;
          const putRequest = store.put(folder);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          reject(new Error('Dossier non trouvé'));
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async deleteFolder(id: number): Promise<void> {
    if (!this.db) throw new Error('Base de données non initialisée');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['folders', 'ranges', 'actions', 'rangeHands'], 'readwrite');
      
      // Supprimer récursivement tous les sous-dossiers et ranges
      this.deleteFolderRecursive(transaction, id);
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  private deleteFolderRecursive(transaction: IDBTransaction, folderId: number): void {
    const foldersStore = transaction.objectStore('folders');
    const rangesStore = transaction.objectStore('ranges');
    
    // Supprimer les sous-dossiers
    const folderIndex = foldersStore.index('parentId');
    const folderRequest = folderIndex.getAll(folderId);
    
    folderRequest.onsuccess = () => {
      folderRequest.result.forEach(subfolder => {
        this.deleteFolderRecursive(transaction, subfolder.id);
      });
    };
    
    // Supprimer les ranges dans ce dossier
    const rangeIndex = rangesStore.index('folderId');
    const rangeRequest = rangeIndex.getAll(folderId);
    
    rangeRequest.onsuccess = () => {
      rangeRequest.result.forEach(range => {
        this.deleteRangeData(transaction, range.id);
      });
    };
    
    // Supprimer le dossier lui-même
    foldersStore.delete(folderId);
  }

  private deleteRangeData(transaction: IDBTransaction, rangeId: number): void {
    const rangesStore = transaction.objectStore('ranges');
    const actionsStore = transaction.objectStore('actions');
    const rangeHandsStore = transaction.objectStore('rangeHands');
    
    // Supprimer les actions
    const actionsIndex = actionsStore.index('rangeId');
    const actionsRequest = actionsIndex.getAll(rangeId);
    actionsRequest.onsuccess = () => {
      actionsRequest.result.forEach(action => {
        actionsStore.delete(action.id);
      });
    };
    
    // Supprimer les mains
    const rangeHandsIndex = rangeHandsStore.index('rangeId');
    const rangeHandsRequest = rangeHandsIndex.getAll(rangeId);
    rangeHandsRequest.onsuccess = () => {
      rangeHandsRequest.result.forEach(rangeHand => {
        rangeHandsStore.delete([rangeHand.rangeId, rangeHand.hand]);
      });
    };
    
    // Supprimer la range
    rangesStore.delete(rangeId);
  }

  // Méthodes pour les ranges
  async getAllRanges(): Promise<Range[]> {
    if (!this.db) throw new Error('Base de données non initialisée');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['ranges'], 'readonly');
      const store = transaction.objectStore('ranges');
      const request = store.getAll();

      request.onsuccess = () => {
        const ranges = request.result.map((r: any) => ({
          id: r.id,
          name: r.name,
          folderId: r.folderId,
          position: r.position,
          createdAt: r.createdAt || new Date().toISOString()
        }));
        resolve(ranges);
      };

      request.onerror = () => reject(request.error);
    });
  }

  // Construire la hiérarchie complète avec folders et ranges
  async getHierarchy(): Promise<Folder[]> {
    const folders = await this.getAllFolders();
    const ranges = await this.getAllRanges();
    
    return this.buildHierarchy(folders, ranges);
  }

  private buildHierarchy(folders: Folder[], ranges: Range[]): Folder[] {
    const folderMap = new Map<number, Folder>();
    const roots: Folder[] = [];

    // Créer la map des folders
    folders.forEach(folder => {
      folderMap.set(folder.id, { ...folder, folders: [], ranges: [] });
    });

    // Attacher les ranges aux folders
    ranges.forEach(range => {
      if (range.folderId) {
        const folder = folderMap.get(range.folderId);
        if (folder) {
          folder.ranges!.push(range);
        }
      } else {
        // Range à la racine - on crée un pseudo-folder pour la rendre visible
        // Ou on peut gérer les ranges racines différemment
      }
    });

    // Construire la hiérarchie de folders
    folders.forEach(folder => {
      const folderWithChildren = folderMap.get(folder.id)!;
      if (folder.parentId) {
        const parent = folderMap.get(folder.parentId);
        if (parent) {
          parent.folders!.push(folderWithChildren);
        }
      } else {
        roots.push(folderWithChildren);
      }
    });

    // Trier tous les éléments par position
    const sortByPosition = (items: any[]) => {
      return items.sort((a, b) => a.position - b.position);
    };

    // Trier les roots
    sortByPosition(roots);

    // Trier récursivement les sous-dossiers et ranges
    const sortFolderContents = (folder: Folder) => {
      if (folder.folders && folder.folders.length > 0) {
        sortByPosition(folder.folders);
        folder.folders.forEach(sortFolderContents);
      }
      if (folder.ranges && folder.ranges.length > 0) {
        sortByPosition(folder.ranges);
      }
    };

    roots.forEach(sortFolderContents);

    return roots;
  }

  async createRange(name: string, folderId?: number): Promise<number> {
    if (!this.db) throw new Error('Base de données non initialisée');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['ranges'], 'readwrite');
      const store = transaction.objectStore('ranges');
      
      // D'abord, récupérer toutes les ranges du même dossier pour déterminer la position
      const getAllRequest = store.getAll();
      getAllRequest.onsuccess = () => {
        const allRanges = getAllRequest.result;
        const siblingsCount = allRanges.filter((r: any) => r.folderId === (folderId || null)).length;
        
        const range = {
          name,
          folderId: folderId || null,
          position: siblingsCount, // Position à la fin
          createdAt: new Date().toISOString()
        };

        const request = store.add(range);
        request.onsuccess = () => resolve(request.result as number);
        request.onerror = () => reject(request.error);
      };
      getAllRequest.onerror = () => reject(getAllRequest.error);
    });
  }

  async updateRange(id: number, name: string): Promise<void> {
    if (!this.db) throw new Error('Base de données non initialisée');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['ranges'], 'readwrite');
      const store = transaction.objectStore('ranges');
      
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const range = getRequest.result;
        if (range) {
          range.name = name;
          const putRequest = store.put(range);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          reject(new Error('Range non trouvée'));
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async deleteRange(id: number): Promise<void> {
    if (!this.db) throw new Error('Base de données non initialisée');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['ranges', 'actions', 'rangeHands'], 'readwrite');
      
      this.deleteRangeData(transaction, id);
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Méthodes pour les actions
  async getActionsForRange(rangeId: number): Promise<Action[]> {
    if (!this.db) throw new Error('Base de données non initialisée');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['actions'], 'readonly');
      const store = transaction.objectStore('actions');
      const index = store.index('rangeId');
      const request = index.getAll(rangeId);

      request.onsuccess = () => {
        const actions = request.result.map((a: any) => ({
          id: a.id,
          rangeId: a.rangeId,
          name: a.name,
          color: a.color,
          position: a.position
        }));
        resolve(actions);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async createAction(rangeId: number, name: string, color: string): Promise<number> {
    if (!this.db) throw new Error('Base de données non initialisée');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['actions'], 'readwrite');
      const store = transaction.objectStore('actions');
      
      const action = {
        rangeId,
        name,
        color,
        position: 0
      };

      const request = store.add(action);
      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  async updateAction(id: number, name: string, color: string): Promise<void> {
    if (!this.db) throw new Error('Base de données non initialisée');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['actions'], 'readwrite');
      const store = transaction.objectStore('actions');
      
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const action = getRequest.result;
        if (action) {
          action.name = name;
          action.color = color;
          const putRequest = store.put(action);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          reject(new Error('Action non trouvée'));
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async deleteAction(id: number): Promise<void> {
    if (!this.db) throw new Error('Base de données non initialisée');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['actions', 'rangeHands'], 'readwrite');
      
      // Supprimer les mains associées
      const rangeHandsStore = transaction.objectStore('rangeHands');
      const rangeHandsRequest = rangeHandsStore.openCursor();
      
      rangeHandsRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          if (cursor.value.actionId === id) {
            cursor.delete();
          }
          cursor.continue();
        }
      };

      // Supprimer l'action
      const actionsStore = transaction.objectStore('actions');
      const deleteRequest = actionsStore.delete(id);
      
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    });
  }

  // Méthodes pour les mains
  async getRangeHands(rangeId: number): Promise<RangeHand[]> {
    if (!this.db) throw new Error('Base de données non initialisée');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['rangeHands'], 'readonly');
      const store = transaction.objectStore('rangeHands');
      const index = store.index('rangeId');
      const request = index.getAll(rangeId);

      request.onsuccess = () => {
        const hands = request.result.map((rh: any) => ({
          rangeId: rh.rangeId,
          actionId: rh.actionId,
          hand: rh.hand
        }));
        resolve(hands);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async setHandAction(rangeId: number, hand: string, actionId: number): Promise<void> {
    if (!this.db) throw new Error('Base de données non initialisée');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['rangeHands'], 'readwrite');
      const store = transaction.objectStore('rangeHands');
      
      const rangeHand = {
        rangeId,
        actionId,
        hand
      };

      const request = store.put(rangeHand);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async removeHandAction(rangeId: number, hand: string): Promise<void> {
    if (!this.db) throw new Error('Base de données non initialisée');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['rangeHands'], 'readwrite');
      const store = transaction.objectStore('rangeHands');
      
      const request = store.delete([rangeId, hand]);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Copier une range avec toutes ses actions et mains
  async duplicateRange(rangeId: number, newName?: string): Promise<number> {
    if (!this.db) throw new Error('Base de données non initialisée');

    return new Promise(async (resolve, reject) => {
      try {
        // Récupérer la range originale
        const transaction = this.db!.transaction(['ranges'], 'readonly');
        const rangesStore = transaction.objectStore('ranges');
        const rangeRequest = rangesStore.get(rangeId);

        rangeRequest.onsuccess = async () => {
          const originalRange = rangeRequest.result;
          if (!originalRange) {
            reject(new Error('Range non trouvée'));
            return;
          }

          // Créer la nouvelle range avec le nom modifié
          const newRangeName = newName || `${originalRange.name} (copie)`;
          const newRangeId = await this.createRange(newRangeName, originalRange.folderId);

          // Copier les actions
          const actions = await this.getActionsForRange(rangeId);
          const actionMapping = new Map<number, number>(); // oldId -> newId

          for (const action of actions) {
            const newActionId = await this.createAction(newRangeId, action.name, action.color);
            actionMapping.set(action.id, newActionId);
          }

          // Copier les mains
          const hands = await this.getRangeHands(rangeId);
          for (const hand of hands) {
            const newActionId = actionMapping.get(hand.actionId);
            if (newActionId) {
              await this.setHandAction(newRangeId, hand.hand, newActionId);
            }
          }

          resolve(newRangeId);
        };

        rangeRequest.onerror = () => reject(rangeRequest.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  // Copier un dossier récursivement avec tout son contenu
  async duplicateFolder(folderId: number, newName?: string, targetParentId?: number): Promise<number> {
    if (!this.db) throw new Error('Base de données non initialisée');

    return new Promise(async (resolve, reject) => {
      try {
        // Récupérer le dossier original
        const transaction = this.db!.transaction(['folders'], 'readonly');
        const foldersStore = transaction.objectStore('folders');
        const folderRequest = foldersStore.get(folderId);

        folderRequest.onsuccess = async () => {
          const originalFolder = folderRequest.result;
          if (!originalFolder) {
            reject(new Error('Dossier non trouvé'));
            return;
          }

          // Créer le nouveau dossier
          const newFolderName = newName || `${originalFolder.name} (copie)`;
          const parentId = targetParentId !== undefined ? targetParentId : originalFolder.parentId;
          const newFolderId = await this.createFolder(newFolderName, parentId);

          // Récupérer la hiérarchie pour copier récursivement
          const allFolders = await this.getAllFolders();
          const allRanges = await this.getAllRanges();

          // Copier les sous-dossiers
          const subFolders = allFolders.filter(f => f.parentId === folderId);
          for (const subFolder of subFolders) {
            await this.duplicateFolder(subFolder.id, subFolder.name, newFolderId);
          }

          // Copier les ranges
          const folderRanges = allRanges.filter(r => r.folderId === folderId);
          for (const range of folderRanges) {
            const newRangeId = await this.duplicateRange(range.id, range.name);
            // Mettre à jour le folderId de la range copiée
            await this.updateRangeFolderId(newRangeId, newFolderId);
          }

          resolve(newFolderId);
        };

        folderRequest.onerror = () => reject(folderRequest.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  // Méthode utilitaire pour mettre à jour le folderId d'une range
  private async updateRangeFolderId(rangeId: number, folderId: number): Promise<void> {
    if (!this.db) throw new Error('Base de données non initialisée');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['ranges'], 'readwrite');
      const store = transaction.objectStore('ranges');
      
      const getRequest = store.get(rangeId);
      getRequest.onsuccess = () => {
        const range = getRequest.result;
        if (range) {
          range.folderId = folderId;
          const putRequest = store.put(range);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          reject(new Error('Range non trouvée'));
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // Déplacer un dossier vers un nouveau parent
  async moveFolderToParent(folderId: number, newParentId: number | null): Promise<void> {
    if (!this.db) throw new Error('Base de données non initialisée');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['folders'], 'readwrite');
      const store = transaction.objectStore('folders');
      
      const getRequest = store.get(folderId);
      getRequest.onsuccess = () => {
        const folder = getRequest.result;
        if (folder) {
          folder.parentId = newParentId;
          const putRequest = store.put(folder);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          reject(new Error('Dossier non trouvé'));
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // Déplacer une range vers un nouveau dossier
  async moveRangeToFolder(rangeId: number, newFolderId: number | null): Promise<void> {
    if (!this.db) throw new Error('Base de données non initialisée');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['ranges'], 'readwrite');
      const store = transaction.objectStore('ranges');
      
      const getRequest = store.get(rangeId);
      getRequest.onsuccess = () => {
        const range = getRequest.result;
        if (range) {
          range.folderId = newFolderId;
          const putRequest = store.put(range);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          reject(new Error('Range non trouvée'));
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // Réorganiser une range à une position spécifique (avant ou après une autre range)
  async reorderRange(rangeId: number, targetRangeId: number, insertBefore: boolean): Promise<void> {
    if (!this.db) throw new Error('Base de données non initialisée');

    return new Promise(async (resolve, reject) => {
      try {
        const transaction = this.db!.transaction(['ranges'], 'readwrite');
        const store = transaction.objectStore('ranges');
        
        // Récupérer la range à déplacer et la cible
        const rangeRequest = store.get(rangeId);
        const targetRequest = store.get(targetRangeId);
        
        rangeRequest.onsuccess = () => {
          targetRequest.onsuccess = async () => {
            const range = rangeRequest.result;
            const targetRange = targetRequest.result;
            
            if (!range || !targetRange) {
              reject(new Error('Range non trouvée'));
              return;
            }

            // Récupérer toutes les ranges du même dossier
            const allRangesRequest = store.getAll();
            allRangesRequest.onsuccess = () => {
              const allRanges = allRangesRequest.result.filter(
                r => r.folderId === targetRange.folderId && r.id !== rangeId
              );
              
              // Trier par position
              allRanges.sort((a, b) => a.position - b.position);
              
              // Trouver l'index de la cible
              const targetIndex = allRanges.findIndex(r => r.id === targetRangeId);
              const insertIndex = insertBefore ? targetIndex : targetIndex + 1;
              
              // Insérer la range à la nouvelle position
              allRanges.splice(insertIndex, 0, range);
              
              // Mettre à jour les positions
              const updateTransaction = this.db!.transaction(['ranges'], 'readwrite');
              const updateStore = updateTransaction.objectStore('ranges');
              
              allRanges.forEach((r, index) => {
                r.position = index;
                r.folderId = targetRange.folderId; // S'assurer que le folderId est correct
                updateStore.put(r);
              });
              
              updateTransaction.oncomplete = () => resolve();
              updateTransaction.onerror = () => reject(updateTransaction.error);
            };
            allRangesRequest.onerror = () => reject(allRangesRequest.error);
          };
          targetRequest.onerror = () => reject(targetRequest.error);
        };
        rangeRequest.onerror = () => reject(rangeRequest.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  // Réorganiser un dossier à une position spécifique (avant ou après un autre dossier)
  async reorderFolder(folderId: number, targetFolderId: number, insertBefore: boolean): Promise<void> {
    if (!this.db) throw new Error('Base de données non initialisée');

    return new Promise(async (resolve, reject) => {
      try {
        const transaction = this.db!.transaction(['folders'], 'readwrite');
        const store = transaction.objectStore('folders');
        
        // Récupérer le dossier à déplacer et la cible
        const folderRequest = store.get(folderId);
        const targetRequest = store.get(targetFolderId);
        
        folderRequest.onsuccess = () => {
          targetRequest.onsuccess = async () => {
            const folder = folderRequest.result;
            const targetFolder = targetRequest.result;
            
            if (!folder || !targetFolder) {
              reject(new Error('Dossier non trouvé'));
              return;
            }

            // Récupérer tous les dossiers du même parent
            const allFoldersRequest = store.getAll();
            allFoldersRequest.onsuccess = () => {
              const allFolders = allFoldersRequest.result.filter(
                f => f.parentId === targetFolder.parentId && f.id !== folderId
              );
              
              // Trier par position
              allFolders.sort((a, b) => a.position - b.position);
              
              // Trouver l'index de la cible
              const targetIndex = allFolders.findIndex(f => f.id === targetFolderId);
              const insertIndex = insertBefore ? targetIndex : targetIndex + 1;
              
              // Insérer le dossier à la nouvelle position
              allFolders.splice(insertIndex, 0, folder);
              
              // Mettre à jour les positions
              const updateTransaction = this.db!.transaction(['folders'], 'readwrite');
              const updateStore = updateTransaction.objectStore('folders');
              
              allFolders.forEach((f, index) => {
                f.position = index;
                f.parentId = targetFolder.parentId; // S'assurer que le parentId est correct
                updateStore.put(f);
              });
              
              updateTransaction.oncomplete = () => resolve();
              updateTransaction.onerror = () => reject(updateTransaction.error);
            };
            allFoldersRequest.onerror = () => reject(allFoldersRequest.error);
          };
          targetRequest.onerror = () => reject(targetRequest.error);
        };
        folderRequest.onerror = () => reject(folderRequest.error);
      } catch (err) {
        reject(err);
      }
    });
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  // ================== Méthodes pour les replays ==================

  async getAllReplays(): Promise<SavedReplay[]> {
    if (!this.db) throw new Error('Base de données non initialisée');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['replays'], 'readonly');
      const store = transaction.objectStore('replays');
      const index = store.index('createdAt');
      // Trier par date décroissante (plus récent en premier)
      const request = index.openCursor(null, 'prev');
      
      const replays: SavedReplay[] = [];
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          replays.push(cursor.value);
          cursor.continue();
        } else {
          resolve(replays);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async getReplay(id: number): Promise<SavedReplay | null> {
    if (!this.db) throw new Error('Base de données non initialisée');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['replays'], 'readonly');
      const store = transaction.objectStore('replays');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async createReplay(replay: Omit<SavedReplay, 'id'>): Promise<number> {
    if (!this.db) throw new Error('Base de données non initialisée');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['replays'], 'readwrite');
      const store = transaction.objectStore('replays');
      
      const replayToSave = {
        ...replay,
        createdAt: new Date().toISOString()
      };

      const request = store.add(replayToSave);
      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  async updateReplay(id: number, label: string): Promise<void> {
    if (!this.db) throw new Error('Base de données non initialisée');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['replays'], 'readwrite');
      const store = transaction.objectStore('replays');
      
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const replay = getRequest.result;
        if (replay) {
          replay.label = label;
          const putRequest = store.put(replay);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          reject(new Error('Replay non trouvé'));
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async deleteReplay(id: number): Promise<void> {
    if (!this.db) throw new Error('Base de données non initialisée');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['replays'], 'readwrite');
      const store = transaction.objectStore('replays');
      
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ================== Méthodes pour l'export/import ==================

  /**
   * Exporte toutes les données de la base de données en JSON
   */
  async exportDatabase(): Promise<string> {
    if (!this.db) throw new Error('Base de données non initialisée');

    const exportData: {
      version: number;
      exportDate: string;
      folders: any[];
      ranges: any[];
      actions: any[];
      rangeHands: any[];
      replays: any[];
    } = {
      version: this.version,
      exportDate: new Date().toISOString(),
      folders: [],
      ranges: [],
      actions: [],
      rangeHands: [],
      replays: []
    };

    // Exporter tous les stores
    const folders = await this.getAllFolders();
    exportData.folders = folders;

    const ranges = await this.getAllRanges();
    exportData.ranges = ranges;

    // Exporter toutes les actions
    const allActions = await new Promise<any[]>((resolve, reject) => {
      const transaction = this.db!.transaction(['actions'], 'readonly');
      const store = transaction.objectStore('actions');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    exportData.actions = allActions;

    // Exporter toutes les mains
    const allRangeHands = await new Promise<any[]>((resolve, reject) => {
      const transaction = this.db!.transaction(['rangeHands'], 'readonly');
      const store = transaction.objectStore('rangeHands');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    exportData.rangeHands = allRangeHands;

    // Exporter tous les replays
    const replays = await this.getAllReplays();
    exportData.replays = replays;

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Importe des données JSON dans la base de données
   * @param jsonData - Les données JSON à importer
   * @param clearExisting - Si true, supprime toutes les données existantes avant l'import
   */
  async importDatabase(jsonData: string, clearExisting: boolean = false): Promise<void> {
    if (!this.db) throw new Error('Base de données non initialisée');

    let importData: {
      version?: number;
      exportDate?: string;
      folders: any[];
      ranges: any[];
      actions: any[];
      rangeHands: any[];
      replays: any[];
    };

    try {
      importData = JSON.parse(jsonData);
    } catch (error) {
      throw new Error('Format JSON invalide');
    }

    // Vérifier que les données nécessaires sont présentes
    if (!importData.folders || !importData.ranges || !importData.actions || 
        !importData.rangeHands || !importData.replays) {
      throw new Error('Format de données invalide');
    }

    return new Promise(async (resolve, reject) => {
      try {
        // Si clearExisting est true, supprimer toutes les données existantes
        if (clearExisting) {
          await this.clearAllData();
        }

        // Créer un mapping des anciens IDs vers les nouveaux IDs pour les folders
        const folderIdMapping = new Map<number, number>();

        // Importer les folders (en préservant la hiérarchie)
        const sortedFolders = [...importData.folders].sort((a, b) => {
          // Importer d'abord les folders sans parent, puis leurs enfants
          if (a.parentId === null && b.parentId !== null) return -1;
          if (a.parentId !== null && b.parentId === null) return 1;
          return 0;
        });

        for (const folder of sortedFolders) {
          const oldId = folder.id;
          const parentId = folder.parentId ? folderIdMapping.get(folder.parentId) : undefined;
          const newId = await this.createFolder(folder.name, parentId);
          
          // Mettre à jour le folderIdMapping
          folderIdMapping.set(oldId, newId);

          // Mettre à jour la position si nécessaire
          if (folder.position !== undefined) {
            await this.updateFolderPosition(newId, folder.position);
          }
        }

        // Créer un mapping des anciens IDs vers les nouveaux IDs pour les ranges
        const rangeIdMapping = new Map<number, number>();

        // Importer les ranges
        for (const range of importData.ranges) {
          const oldId = range.id;
          const folderId = range.folderId ? folderIdMapping.get(range.folderId) : undefined;
          const newId = await this.createRange(range.name, folderId);
          rangeIdMapping.set(oldId, newId);

          // Mettre à jour la position si nécessaire
          if (range.position !== undefined) {
            await this.updateRangePosition(newId, range.position);
          }
        }

        // Créer un mapping des anciens IDs vers les nouveaux IDs pour les actions
        const actionIdMapping = new Map<number, number>();

        // Importer les actions
        for (const action of importData.actions) {
          const oldRangeId = rangeIdMapping.get(action.rangeId);
          if (oldRangeId) {
            const oldId = action.id;
            const newId = await this.createAction(oldRangeId, action.name, action.color);
            actionIdMapping.set(oldId, newId);
          }
        }

        // Importer les mains
        for (const rangeHand of importData.rangeHands) {
          const newRangeId = rangeIdMapping.get(rangeHand.rangeId);
          const newActionId = actionIdMapping.get(rangeHand.actionId);
          if (newRangeId && newActionId) {
            await this.setHandAction(newRangeId, rangeHand.hand, newActionId);
          }
        }

        // Importer les replays
        for (const replay of importData.replays) {
          await this.createReplay({
            label: replay.label,
            hands: replay.hands,
            createdAt: replay.createdAt,
            handsCount: replay.handsCount || replay.hands?.length || 0,
            stakes: replay.stakes
          });
        }

        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Supprime toutes les données de la base de données
   */
  private async clearAllData(): Promise<void> {
    if (!this.db) throw new Error('Base de données non initialisée');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(
        ['folders', 'ranges', 'actions', 'rangeHands', 'replays'],
        'readwrite'
      );

      // Supprimer tous les replays
      const replaysStore = transaction.objectStore('replays');
      replaysStore.clear();

      // Supprimer toutes les mains
      const rangeHandsStore = transaction.objectStore('rangeHands');
      rangeHandsStore.clear();

      // Supprimer toutes les actions
      const actionsStore = transaction.objectStore('actions');
      actionsStore.clear();

      // Supprimer toutes les ranges
      const rangesStore = transaction.objectStore('ranges');
      rangesStore.clear();

      // Supprimer tous les folders
      const foldersStore = transaction.objectStore('folders');
      foldersStore.clear();

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Met à jour la position d'un folder
   */
  private async updateFolderPosition(folderId: number, position: number): Promise<void> {
    if (!this.db) throw new Error('Base de données non initialisée');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['folders'], 'readwrite');
      const store = transaction.objectStore('folders');
      
      const getRequest = store.get(folderId);
      getRequest.onsuccess = () => {
        const folder = getRequest.result;
        if (folder) {
          folder.position = position;
          const putRequest = store.put(folder);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve(); // Si le folder n'existe pas, on ignore
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * Met à jour la position d'une range
   */
  private async updateRangePosition(rangeId: number, position: number): Promise<void> {
    if (!this.db) throw new Error('Base de données non initialisée');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['ranges'], 'readwrite');
      const store = transaction.objectStore('ranges');
      
      const getRequest = store.get(rangeId);
      getRequest.onsuccess = () => {
        const range = getRequest.result;
        if (range) {
          range.position = position;
          const putRequest = store.put(range);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          resolve(); // Si la range n'existe pas, on ignore
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // ================== Méthodes pour les couleurs récentes ==================

  /**
   * Récupère les couleurs récentes (limité à MAX_RECENT_COLORS)
   */
  async getRecentColors(maxColors: number = 10): Promise<string[]> {
    if (!this.db) throw new Error('Base de données non initialisée');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['recentColors'], 'readonly');
      const store = transaction.objectStore('recentColors');
      const index = store.index('lastUsed');
      
      // Trier par date décroissante (plus récent en premier)
      const request = index.openCursor(null, 'prev');
      const colors: string[] = [];
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor && colors.length < maxColors) {
          colors.push(cursor.value.color);
          cursor.continue();
        } else {
          resolve(colors);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Ajoute ou met à jour une couleur récente
   */
  async addRecentColor(color: string): Promise<void> {
    if (!this.db) throw new Error('Base de données non initialisée');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['recentColors'], 'readwrite');
      const store = transaction.objectStore('recentColors');
      
      const colorData = {
        color,
        lastUsed: new Date().toISOString()
      };

      const request = store.put(colorData);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Supprime les couleurs récentes au-delà de la limite
   */
  async cleanupRecentColors(maxColors: number = 10): Promise<void> {
    if (!this.db) throw new Error('Base de données non initialisée');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['recentColors'], 'readwrite');
      const store = transaction.objectStore('recentColors');
      const index = store.index('lastUsed');
      
      // Trier par date décroissante
      const request = index.openCursor(null, 'prev');
      const colors: Array<{ color: string; lastUsed: string }> = [];
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          colors.push(cursor.value);
          cursor.continue();
        } else {
          // Supprimer les couleurs au-delà de la limite
          if (colors.length > maxColors) {
            const colorsToDelete = colors.slice(maxColors);
            colorsToDelete.forEach(colorData => {
              store.delete(colorData.color);
            });
          }
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Supprime une couleur récente spécifique
   */
  async removeRecentColor(color: string): Promise<void> {
    if (!this.db) throw new Error('Base de données non initialisée');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['recentColors'], 'readwrite');
      const store = transaction.objectStore('recentColors');
      
      const request = store.delete(color);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Migre les couleurs par défaut vers IndexedDB comme couleurs récentes initiales
   */
  async migrateDefaultColors(): Promise<void> {
    if (!this.db) throw new Error('Base de données non initialisée');

    try {
      // Vérifier si des couleurs récentes existent déjà
      const existingColors = await this.getRecentColors(1);
      if (existingColors.length > 0) {
        // Des couleurs existent déjà, pas besoin de migrer
        return;
      }

      // Migrer les couleurs par défaut vers IndexedDB
      const now = new Date();
      for (let i = 0; i < DEFAULT_COLORS.length; i++) {
        const color = DEFAULT_COLORS[i];
        // Utiliser une date décroissante pour préserver l'ordre
        const date = new Date(now.getTime() - i * 1000).toISOString();
        const colorData = {
          color,
          lastUsed: date
        };
        
        await new Promise<void>((resolve, reject) => {
          const transaction = this.db!.transaction(['recentColors'], 'readwrite');
          const store = transaction.objectStore('recentColors');
          const request = store.put(colorData);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }
    } catch (error) {
      console.error('Erreur lors de la migration des couleurs par défaut:', error);
    }
  }
}

// Instance singleton
export const databaseService = new IndexedDBService();
