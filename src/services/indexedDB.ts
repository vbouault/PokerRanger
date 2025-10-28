import { Folder, Range, Action, RangeHand } from '../types/range';
import { SavedReplay } from '../types/poker';

export class IndexedDBService {
  private dbName = 'RangerDB';
  private version = 3; // Incrémenté pour ajouter le store replays
  private db: IDBDatabase | null = null;

  async initialize(): Promise<void> {
    try {
      this.db = await this.openDatabase();
      
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
      
      const folder = {
        name,
        parentId: parentId || null,
        position: 0,
        createdAt: new Date().toISOString()
      };

      const request = store.add(folder);
      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
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

    return roots;
  }

  async createRange(name: string, folderId?: number): Promise<number> {
    if (!this.db) throw new Error('Base de données non initialisée');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['ranges'], 'readwrite');
      const store = transaction.objectStore('ranges');
      
      const range = {
        name,
        folderId: folderId || null,
        position: 0,
        createdAt: new Date().toISOString()
      };

      const request = store.add(range);
      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
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
}

// Instance singleton
export const databaseService = new IndexedDBService();
