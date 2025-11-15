import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc,
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  writeBatch,
  increment,
  onSnapshot,
  Unsubscribe,
  getDocsFromCache,
  getDocFromCache
} from 'firebase/firestore';
import { db, initializeAuth } from '../config/firebase';
import { Folder, Range, Action, RangeHand } from '../types/range';
import { SavedReplay } from '../types/poker';

export class FirestoreService {
  private initialized = false;
  private countersInitialized = false;

  async initialize(): Promise<void> {
    try {
      // Initialiser l'authentification anonyme
      await initializeAuth();
      
      // Initialiser les compteurs si nécessaire
      await this.initializeCounters();
      
      this.initialized = true;
      console.log('Firestore initialisé avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'initialisation de Firestore:', error);
      throw error;
    }
  }

  // Initialiser les compteurs pour les IDs auto-incrémentés
  private async initializeCounters(): Promise<void> {
    if (this.countersInitialized) return;

    const counters = ['folders', 'ranges', 'actions', 'replays'];
    
    for (const counter of counters) {
      const counterRef = doc(db, '_counters', counter);
      const counterSnap = await getDoc(counterRef);
      
      if (!counterSnap.exists()) {
        await setDoc(counterRef, { value: 0 });
      }
    }
    
    this.countersInitialized = true;
  }

  // Obtenir le prochain ID pour une collection (optimisé avec increment)
  private async getNextId(collectionName: string): Promise<number> {
    const counterRef = doc(db, '_counters', collectionName);
    
    try {
      // Utiliser increment() pour faire une seule requête atomique
      await updateDoc(counterRef, { value: increment(1) });
      const counterSnap = await getDoc(counterRef);
      return counterSnap.data()!.value;
    } catch (error) {
      // Si le compteur n'existe pas encore, le créer
      await setDoc(counterRef, { value: 1 });
      return 1;
    }
  }

  // ================== Méthodes pour les folders ==================

  async getAllFolders(): Promise<Folder[]> {
    if (!this.initialized) throw new Error('Service non initialisé');

    const foldersRef = collection(db, 'folders');
    const q = query(foldersRef, orderBy('position', 'asc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: data.id,
        name: data.name,
        parentId: data.parentId || undefined,
        position: data.position,
        createdAt: data.createdAt,
        folders: [],
        ranges: []
      };
    });
  }

  async createFolder(name: string, parentId?: number): Promise<number> {
    if (!this.initialized) throw new Error('Service non initialisé');

    // Obtenir le prochain ID
    const id = await this.getNextId('folders');

    // Utiliser le timestamp pour la position (évite une requête getDocs)
    const position = Date.now();

    const folderData = {
      id,
      name,
      parentId: parentId || null,
      position,
      createdAt: new Date().toISOString()
    };

    // Utiliser l'ID numérique comme clé du document
    const folderRef = doc(db, 'folders', id.toString());
    await setDoc(folderRef, folderData);
    
    return id;
  }

  async updateFolder(id: number, name: string): Promise<void> {
    if (!this.initialized) throw new Error('Service non initialisé');

    const folderRef = doc(db, 'folders', id.toString());
    await updateDoc(folderRef, { name });
  }

  async deleteFolder(id: number): Promise<void> {
    if (!this.initialized) throw new Error('Service non initialisé');

    // Utiliser batch pour supprimer tous les éléments liés
    const batch = writeBatch(db);

    // Supprimer récursivement
    await this.deleteFolderRecursive(batch, id);

    await batch.commit();
  }

  private async deleteFolderRecursive(batch: any, folderId: number): Promise<void> {
    // Supprimer les sous-dossiers
    const foldersRef = collection(db, 'folders');
    const subFoldersQuery = query(foldersRef, where('parentId', '==', folderId));
    const subFoldersSnapshot = await getDocs(subFoldersQuery);
    
    for (const folderDoc of subFoldersSnapshot.docs) {
      const folderData = folderDoc.data();
      await this.deleteFolderRecursive(batch, folderData.id);
    }

    // Supprimer les ranges dans ce dossier
    const rangesRef = collection(db, 'ranges');
    const rangesQuery = query(rangesRef, where('folderId', '==', folderId));
    const rangesSnapshot = await getDocs(rangesQuery);
    
    for (const rangeDoc of rangesSnapshot.docs) {
      const rangeData = rangeDoc.data();
      await this.deleteRangeData(batch, rangeData.id);
    }

    // Supprimer le dossier lui-même
    const folderRef = doc(db, 'folders', folderId.toString());
    batch.delete(folderRef);
  }

  private async deleteRangeData(batch: any, rangeId: number): Promise<void> {
    // Supprimer les actions
    const actionsRef = collection(db, 'actions');
    const actionsQuery = query(actionsRef, where('rangeId', '==', rangeId));
    const actionsSnapshot = await getDocs(actionsQuery);
    
    actionsSnapshot.docs.forEach(actionDoc => {
      batch.delete(doc(db, 'actions', actionDoc.id));
    });

    // Supprimer les mains
    const rangeHandsRef = collection(db, 'rangeHands');
    const rangeHandsQuery = query(rangeHandsRef, where('rangeId', '==', rangeId));
    const rangeHandsSnapshot = await getDocs(rangeHandsQuery);
    
    rangeHandsSnapshot.docs.forEach(handDoc => {
      batch.delete(doc(db, 'rangeHands', handDoc.id));
    });

    // Supprimer la range
    const rangeRef = doc(db, 'ranges', rangeId.toString());
    batch.delete(rangeRef);
  }

  // ================== Méthodes pour les ranges ==================

  async getAllRanges(): Promise<Range[]> {
    if (!this.initialized) throw new Error('Service non initialisé');

    const rangesRef = collection(db, 'ranges');
    const q = query(rangesRef, orderBy('position', 'asc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: data.id,
        name: data.name,
        folderId: data.folderId || undefined,
        position: data.position,
        createdAt: data.createdAt
      };
    });
  }

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

    sortByPosition(roots);

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
    if (!this.initialized) throw new Error('Service non initialisé');

    // Obtenir le prochain ID
    const id = await this.getNextId('ranges');

    // Utiliser le timestamp pour la position (évite une requête getDocs)
    const position = Date.now();

    const rangeData = {
      id,
      name,
      folderId: folderId || null,
      position,
      createdAt: new Date().toISOString()
    };

    const rangeRef = doc(db, 'ranges', id.toString());
    await setDoc(rangeRef, rangeData);
    
    return id;
  }

  async updateRange(id: number, name: string): Promise<void> {
    if (!this.initialized) throw new Error('Service non initialisé');

    const rangeRef = doc(db, 'ranges', id.toString());
    await updateDoc(rangeRef, { name });
  }

  async deleteRange(id: number): Promise<void> {
    if (!this.initialized) throw new Error('Service non initialisé');

    const batch = writeBatch(db);
    await this.deleteRangeData(batch, id);
    await batch.commit();
  }

  // ================== Méthodes pour les actions ==================

  async getActionsForRange(rangeId: number): Promise<Action[]> {
    if (!this.initialized) throw new Error('Service non initialisé');

    const actionsRef = collection(db, 'actions');
    const q = query(actionsRef, where('rangeId', '==', rangeId));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: data.id,
        rangeId: data.rangeId,
        name: data.name,
        color: data.color,
        position: data.position
      };
    });
  }

  async createAction(rangeId: number, name: string, color: string): Promise<number> {
    if (!this.initialized) throw new Error('Service non initialisé');

    // Obtenir le prochain ID
    const id = await this.getNextId('actions');

    const actionData = {
      id,
      rangeId,
      name,
      color,
      position: 0
    };

    const actionRef = doc(db, 'actions', id.toString());
    await setDoc(actionRef, actionData);
    
    return id;
  }

  async updateAction(id: number, name: string, color: string): Promise<void> {
    if (!this.initialized) throw new Error('Service non initialisé');

    const actionRef = doc(db, 'actions', id.toString());
    await updateDoc(actionRef, { name, color });
  }

  async deleteAction(id: number): Promise<void> {
    if (!this.initialized) throw new Error('Service non initialisé');

    const batch = writeBatch(db);

    // Supprimer les mains associées
    const rangeHandsRef = collection(db, 'rangeHands');
    const rangeHandsQuery = query(rangeHandsRef, where('actionId', '==', id));
    const rangeHandsSnapshot = await getDocs(rangeHandsQuery);
    
    rangeHandsSnapshot.docs.forEach(handDoc => {
      batch.delete(doc(db, 'rangeHands', handDoc.id));
    });

    // Supprimer l'action
    const actionRef = doc(db, 'actions', id.toString());
    batch.delete(actionRef);

    await batch.commit();
  }

  // ================== Méthodes pour les mains ==================

  async getRangeHands(rangeId: number): Promise<RangeHand[]> {
    if (!this.initialized) throw new Error('Service non initialisé');

    const rangeHandsRef = collection(db, 'rangeHands');
    const q = query(rangeHandsRef, where('rangeId', '==', rangeId));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        rangeId: data.rangeId,
        actionId: data.actionId,
        hand: data.hand
      };
    });
  }

  async setHandAction(rangeId: number, hand: string, actionId: number): Promise<void> {
    if (!this.initialized) throw new Error('Service non initialisé');

    // Utiliser une clé composite pour identifier uniquement la main
    const handId = `${rangeId}_${hand}`;
    
    const rangeHandData = {
      rangeId,
      actionId,
      hand
    };

    const handRef = doc(db, 'rangeHands', handId);
    await setDoc(handRef, rangeHandData);
  }

  async removeHandAction(rangeId: number, hand: string): Promise<void> {
    if (!this.initialized) throw new Error('Service non initialisé');

    const handId = `${rangeId}_${hand}`;
    const handRef = doc(db, 'rangeHands', handId);
    await deleteDoc(handRef);
  }

  // ================== Méthodes de duplication ==================

  async duplicateRange(rangeId: number, newName?: string): Promise<number> {
    if (!this.initialized) throw new Error('Service non initialisé');

    // Récupérer la range originale
    const rangeRef = doc(db, 'ranges', rangeId.toString());
    const rangeSnap = await getDoc(rangeRef);

    if (!rangeSnap.exists()) {
      throw new Error('Range non trouvée');
    }

    const originalRange = rangeSnap.data();

    // Créer la nouvelle range
    const newRangeName = newName || `${originalRange.name} (copie)`;
    const newRangeId = await this.createRange(newRangeName, originalRange.folderId);

    // Copier les actions
    const actions = await this.getActionsForRange(rangeId);
    const actionMapping = new Map<number, number>();

    for (const action of actions) {
      const newActionId = await this.createAction(newRangeId, action.name, action.color);
      actionMapping.set(action.id, newActionId);
    }

    // Copier les mains
    const hands = await this.getRangeHands(rangeId);
    const batch = writeBatch(db);

    for (const hand of hands) {
      const newActionId = actionMapping.get(hand.actionId);
      if (newActionId) {
        const handId = `${newRangeId}_${hand.hand}`;
        const handData = {
          rangeId: newRangeId,
          actionId: newActionId,
          hand: hand.hand
        };
        const handRef = doc(db, 'rangeHands', handId);
        batch.set(handRef, handData);
      }
    }

    await batch.commit();
    return newRangeId;
  }

  async duplicateFolder(folderId: number, newName?: string, targetParentId?: number): Promise<number> {
    if (!this.initialized) throw new Error('Service non initialisé');

    // Récupérer le dossier original
    const folderRef = doc(db, 'folders', folderId.toString());
    const folderSnap = await getDoc(folderRef);

    if (!folderSnap.exists()) {
      throw new Error('Dossier non trouvé');
    }

    const originalFolder = folderSnap.data();

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
      await this.updateRangeFolderId(newRangeId, newFolderId);
    }

    return newFolderId;
  }

  private async updateRangeFolderId(rangeId: number, folderId: number): Promise<void> {
    const rangeRef = doc(db, 'ranges', rangeId.toString());
    await updateDoc(rangeRef, { folderId });
  }

  // ================== Méthodes de déplacement ==================

  async moveFolderToParent(folderId: number, newParentId: number | null): Promise<void> {
    if (!this.initialized) throw new Error('Service non initialisé');

    const folderRef = doc(db, 'folders', folderId.toString());
    await updateDoc(folderRef, { parentId: newParentId });
  }

  async moveRangeToFolder(rangeId: number, newFolderId: number | null): Promise<void> {
    if (!this.initialized) throw new Error('Service non initialisé');

    const rangeRef = doc(db, 'ranges', rangeId.toString());
    await updateDoc(rangeRef, { folderId: newFolderId });
  }

  async reorderRange(rangeId: number, targetRangeId: number, insertBefore: boolean): Promise<void> {
    if (!this.initialized) throw new Error('Service non initialisé');

    // Récupérer la range à déplacer et la cible
    const rangeRef = doc(db, 'ranges', rangeId.toString());
    const targetRef = doc(db, 'ranges', targetRangeId.toString());

    const [rangeSnap, targetSnap] = await Promise.all([
      getDoc(rangeRef),
      getDoc(targetRef)
    ]);

    if (!rangeSnap.exists() || !targetSnap.exists()) {
      throw new Error('Range non trouvée');
    }

    const range = rangeSnap.data();
    const targetRange = targetSnap.data();

    // Récupérer toutes les ranges du même dossier
    const rangesRef = collection(db, 'ranges');
    const q = query(rangesRef, where('folderId', '==', targetRange.folderId));
    const snapshot = await getDocs(q);

    let allRanges = snapshot.docs
      .map(doc => doc.data())
      .filter((r: any) => r.id !== rangeId);

    // Trier par position
    allRanges.sort((a: any, b: any) => a.position - b.position);

    // Trouver l'index de la cible
    const targetIndex = allRanges.findIndex((r: any) => r.id === targetRangeId);
    const insertIndex = insertBefore ? targetIndex : targetIndex + 1;

    // Insérer la range à la nouvelle position
    allRanges.splice(insertIndex, 0, range);

    // Mettre à jour les positions
    const batch = writeBatch(db);
    allRanges.forEach((r: any, index: number) => {
      const docRef = doc(db, 'ranges', r.id.toString());
      batch.update(docRef, { 
        position: index,
        folderId: targetRange.folderId
      });
    });

    await batch.commit();
  }

  async reorderFolder(folderId: number, targetFolderId: number, insertBefore: boolean): Promise<void> {
    if (!this.initialized) throw new Error('Service non initialisé');

    // Récupérer le dossier à déplacer et la cible
    const folderRef = doc(db, 'folders', folderId.toString());
    const targetRef = doc(db, 'folders', targetFolderId.toString());

    const [folderSnap, targetSnap] = await Promise.all([
      getDoc(folderRef),
      getDoc(targetRef)
    ]);

    if (!folderSnap.exists() || !targetSnap.exists()) {
      throw new Error('Dossier non trouvé');
    }

    const folder = folderSnap.data();
    const targetFolder = targetSnap.data();

    // Récupérer tous les dossiers du même parent
    const foldersRef = collection(db, 'folders');
    const q = query(foldersRef, where('parentId', '==', targetFolder.parentId));
    const snapshot = await getDocs(q);

    let allFolders = snapshot.docs
      .map(doc => doc.data())
      .filter((f: any) => f.id !== folderId);

    // Trier par position
    allFolders.sort((a: any, b: any) => a.position - b.position);

    // Trouver l'index de la cible
    const targetIndex = allFolders.findIndex((f: any) => f.id === targetFolderId);
    const insertIndex = insertBefore ? targetIndex : targetIndex + 1;

    // Insérer le dossier à la nouvelle position
    allFolders.splice(insertIndex, 0, folder);

    // Mettre à jour les positions
    const batch = writeBatch(db);
    allFolders.forEach((f: any, index: number) => {
      const docRef = doc(db, 'folders', f.id.toString());
      batch.update(docRef, { 
        position: index,
        parentId: targetFolder.parentId
      });
    });

    await batch.commit();
  }

  // ================== Méthodes pour les replays ==================

  async getAllReplays(): Promise<SavedReplay[]> {
    if (!this.initialized) throw new Error('Service non initialisé');

    const replaysRef = collection(db, 'replays');
    const q = query(replaysRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      return {
        id: data.id,
        ...data
      } as SavedReplay;
    });
  }

  async getReplay(id: number): Promise<SavedReplay | null> {
    if (!this.initialized) throw new Error('Service non initialisé');

    const replayRef = doc(db, 'replays', id.toString());
    const replaySnap = await getDoc(replayRef);

    if (!replaySnap.exists()) {
      return null;
    }

    return replaySnap.data() as SavedReplay;
  }

  async createReplay(replay: Omit<SavedReplay, 'id'>): Promise<number> {
    if (!this.initialized) throw new Error('Service non initialisé');

    // Obtenir le prochain ID
    const id = await this.getNextId('replays');

    const replayData = {
      id,
      ...replay,
      createdAt: new Date().toISOString()
    };

    const replayRef = doc(db, 'replays', id.toString());
    await setDoc(replayRef, replayData);
    
    return id;
  }

  async updateReplay(id: number, label: string): Promise<void> {
    if (!this.initialized) throw new Error('Service non initialisé');

    const replayRef = doc(db, 'replays', id.toString());
    await updateDoc(replayRef, { label });
  }

  async deleteReplay(id: number): Promise<void> {
    if (!this.initialized) throw new Error('Service non initialisé');

    const replayRef = doc(db, 'replays', id.toString());
    await deleteDoc(replayRef);
  }

  close(): void {
    // Firestore n'a pas besoin d'être fermé explicitement
    this.initialized = false;
    this.countersInitialized = false;
  }
}

// Instance singleton
export const databaseService = new FirestoreService();
