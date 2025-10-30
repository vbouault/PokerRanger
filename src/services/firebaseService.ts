import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  writeBatch,
  onSnapshot,
  Unsubscribe,
  Timestamp
} from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { db, auth, isFirebaseConfigured } from './firebase';
import { CollectionReference, DocumentReference } from 'firebase/firestore';
import { Folder, Range, Action, RangeHand } from '../types/range';
import { SavedReplay } from '../types/poker';

export class FirebaseService {
  private userId: string | null = null;
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    // Vérifier si Firebase est configuré
    if (!isFirebaseConfigured || !db || !auth) {
      throw new Error('Firebase non configuré. Consultez FIREBASE_SETUP.md pour la configuration.');
    }

    // Si déjà initialisé, retourner immédiatement
    if (this.initialized) return;
    
    // Si initialisation en cours, attendre qu'elle se termine
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve) => {
      // Écouter les changements d'authentification
      onAuthStateChanged(auth!, (user) => {
        if (user) {
          this.userId = user.uid;
          this.initialized = true;
          console.log('🔐 Utilisateur authentifié (Firebase):', user.uid);
          resolve();
        } else {
          // Connexion anonyme automatique si pas d'utilisateur
          signInAnonymously(auth!)
            .then((userCredential) => {
              this.userId = userCredential.user.uid;
              this.initialized = true;
              console.log('🔐 Connexion anonyme réussie (Firebase):', userCredential.user.uid);
              resolve();
            })
            .catch((error) => {
              console.error('❌ Erreur lors de la connexion anonyme:', error);
              // On résout quand même pour ne pas bloquer l'app
              resolve();
            });
        }
      });
    });

    return this.initPromise;
  }

  private getUserPath(): string {
    if (!this.userId) throw new Error('Utilisateur non authentifié');
    return `users/${this.userId}`;
  }

  // ================== MÉTHODES POUR LES FOLDERS ==================

  async getAllFolders(): Promise<Folder[]> {
    if (!this.initialized) await this.initialize();
    
    const foldersRef = collection(db!, `${this.getUserPath()}/folders`);
    const q = query(foldersRef, orderBy('position'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(docSnap => ({
      id: this.hashToNumber(docSnap.id),
      name: docSnap.data().name,
      parentId: docSnap.data().parentId,
      position: docSnap.data().position,
      createdAt: docSnap.data().createdAt,
      folders: [],
      ranges: []
    }));
  }

  async createFolder(name: string, parentId?: number): Promise<number> {
    if (!this.initialized) await this.initialize();
    
    const foldersRef = collection(db!, `${this.getUserPath()}/folders`);
    
    // Compter les siblings pour déterminer la position
    const q = query(foldersRef, where('parentId', '==', parentId || null));
    const snapshot = await getDocs(q);
    
    const docRef = await addDoc(foldersRef, {
      name,
      parentId: parentId || null,
      position: snapshot.size,
      createdAt: new Date().toISOString()
    });
    // Ajouter un identifiant numérique pour retrouver facilement le document
    const numId = this.hashToNumber(docRef.id);
    await updateDoc(docRef, { numId });
    return numId;
  }

  async updateFolder(id: number, name: string): Promise<void> {
    if (!this.initialized) await this.initialize();
    const ref = await this.getDocRefByNumId('folders', id);
    if (!ref) throw new Error('Dossier non trouvé');
    await updateDoc(ref, { name });
  }

  async deleteFolder(id: number): Promise<void> {
    if (!this.initialized) await this.initialize();
    
    // Récupérer récursivement tous les sous-dossiers et ranges
    await this.deleteFolderRecursive(id);
  }

  private async deleteFolderRecursive(folderId: number): Promise<void> {
    const batch = writeBatch(db!);
    
    // Supprimer les sous-dossiers
    const subFoldersRef = collection(db!, `${this.getUserPath()}/folders`);
    const subFoldersQuery = query(subFoldersRef, where('parentId', '==', folderId));
    const subFoldersSnapshot = await getDocs(subFoldersQuery);
    
    for (const folderDoc of subFoldersSnapshot.docs) {
      const childNumId = folderDoc.data().numId ?? this.hashToNumber(folderDoc.id);
      await this.deleteFolderRecursive(childNumId);
    }
    
    // Supprimer les ranges dans ce dossier
    const rangesRef = collection(db!, `${this.getUserPath()}/ranges`);
    const rangesQuery = query(rangesRef, where('folderId', '==', folderId));
    const rangesSnapshot = await getDocs(rangesQuery);
    
    for (const rangeDoc of rangesSnapshot.docs) {
      const rangeNumId = rangeDoc.data().numId ?? this.hashToNumber(rangeDoc.id);
      await this.deleteRangeData(rangeNumId);
    }
    
    // Supprimer le dossier lui-même
    const folderRef = await this.getDocRefByNumId('folders', folderId);
    if (folderRef) batch.delete(folderRef);
    
    await batch.commit();
  }

  async moveFolderToParent(folderId: number, newParentId: number | null): Promise<void> {
    if (!this.initialized) await this.initialize();
    const ref = await this.getDocRefByNumId('folders', folderId);
    if (!ref) throw new Error('Dossier non trouvé');
    await updateDoc(ref, { parentId: newParentId });
  }

  // ================== MÉTHODES POUR LES RANGES ==================

  async getAllRanges(): Promise<Range[]> {
    if (!this.initialized) await this.initialize();
    
    const rangesRef = collection(db!, `${this.getUserPath()}/ranges`);
    const q = query(rangesRef, orderBy('position'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(docSnap => ({
      id: this.hashToNumber(docSnap.id),
      name: docSnap.data().name,
      folderId: docSnap.data().folderId,
      position: docSnap.data().position,
      createdAt: docSnap.data().createdAt
    }));
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

    // Trier par position
    const sortByPosition = (items: any[]) => items.sort((a, b) => a.position - b.position);
    
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
    if (!this.initialized) await this.initialize();
    
    const rangesRef = collection(db!, `${this.getUserPath()}/ranges`);
    
    // Compter les siblings pour déterminer la position
    const q = query(rangesRef, where('folderId', '==', folderId || null));
    const snapshot = await getDocs(q);
    
    const docRef = await addDoc(rangesRef, {
      name,
      folderId: folderId || null,
      position: snapshot.size,
      createdAt: new Date().toISOString()
    });
    const numId = this.hashToNumber(docRef.id);
    await updateDoc(docRef, { numId });
    return numId;
  }

  async updateRange(id: number, name: string): Promise<void> {
    if (!this.initialized) await this.initialize();
    const ref = await this.getDocRefByNumId('ranges', id);
    if (!ref) throw new Error('Range non trouvée');
    await updateDoc(ref, { name });
  }

  async deleteRange(id: number): Promise<void> {
    if (!this.initialized) await this.initialize();
    await this.deleteRangeData(id);
  }

  private async deleteRangeData(rangeId: number): Promise<void> {
    const batch = writeBatch(db!);
    
    // Supprimer les actions
    const actionsRef = collection(db!, `${this.getUserPath()}/actions`);
    const actionsQuery = query(actionsRef, where('rangeId', '==', rangeId));
    const actionsSnapshot = await getDocs(actionsQuery);
    
    actionsSnapshot.docs.forEach(actionDoc => {
      batch.delete(actionDoc.ref);
    });
    
    // Supprimer les mains
    const rangeHandsRef = collection(db!, `${this.getUserPath()}/rangeHands`);
    const rangeHandsQuery = query(rangeHandsRef, where('rangeId', '==', rangeId));
    const rangeHandsSnapshot = await getDocs(rangeHandsQuery);
    
    rangeHandsSnapshot.docs.forEach(handDoc => {
      batch.delete(handDoc.ref);
    });
    
    // Supprimer la range elle-même
    const rangeRef = await this.getDocRefByNumId('ranges', rangeId);
    if (rangeRef) batch.delete(rangeRef);
    
    await batch.commit();
  }

  async moveRangeToFolder(rangeId: number, newFolderId: number | null): Promise<void> {
    if (!this.initialized) await this.initialize();
    const ref = await this.getDocRefByNumId('ranges', rangeId);
    if (!ref) throw new Error('Range non trouvée');
    await updateDoc(ref, { folderId: newFolderId });
  }

  async duplicateRange(rangeId: number, newName?: string): Promise<number> {
    if (!this.initialized) await this.initialize();
    
    // Récupérer la range originale
    const rangeRef = doc(db!, `${this.getUserPath()}/ranges/${rangeId}`);
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
    for (const hand of hands) {
      const newActionId = actionMapping.get(hand.actionId);
      if (newActionId) {
        await this.setHandAction(newRangeId, hand.hand, newActionId);
      }
    }
    
    return newRangeId;
  }

  async duplicateFolder(folderId: number, newName?: string, targetParentId?: number): Promise<number> {
    if (!this.initialized) await this.initialize();
    
    // Récupérer le dossier original
    const folderRef = doc(db!, `${this.getUserPath()}/folders/${folderId}`);
    const folderSnap = await getDoc(folderRef);
    
    if (!folderSnap.exists()) {
      throw new Error('Dossier non trouvé');
    }
    
    const originalFolder = folderSnap.data();
    
    // Créer le nouveau dossier
    const newFolderName = newName || `${originalFolder.name} (copie)`;
    const parentId = targetParentId !== undefined ? targetParentId : originalFolder.parentId;
    const newFolderId = await this.createFolder(newFolderName, parentId);
    
    // Récupérer la hiérarchie
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
      // Mettre à jour le folderId
      const rangeRef = doc(db!, `${this.getUserPath()}/ranges/${newRangeId}`);
      await updateDoc(rangeRef, { folderId: newFolderId });
    }
    
    return newFolderId;
  }

  async reorderRange(rangeId: number, targetRangeId: number, insertBefore: boolean): Promise<void> {
    if (!this.initialized) await this.initialize();
    // Récupérer la range à déplacer et la cible
    const movingRef = await this.getDocRefByNumId('ranges', rangeId);
    const targetRef = await this.getDocRefByNumId('ranges', targetRangeId);
    if (!movingRef || !targetRef) throw new Error('Range non trouvée');
    const [movingSnap, targetSnap] = await Promise.all([getDoc(movingRef), getDoc(targetRef)]);
    if (!movingSnap.exists() || !targetSnap.exists()) throw new Error('Range non trouvée');

    const targetFolderId = targetSnap.data().folderId ?? null;
    // Récupérer toutes les ranges du dossier cible
    const rangesRef = collection(db!, `${this.getUserPath()}/ranges`);
    const qAll = query(rangesRef, where('folderId', '==', targetFolderId), orderBy('position'));
    const listSnap = await getDocs(qAll);
    const items = listSnap.docs.map(d => ({ id: d.id, numId: d.data().numId ?? this.hashToNumber(d.id), ...d.data() } as any));

    // Retirer la range en mouvement si présente
    const withoutMoving = items.filter(r => r.numId !== rangeId);
    const targetIndex = withoutMoving.findIndex(r => r.numId === targetRangeId);
    const insertIndex = insertBefore ? targetIndex : targetIndex + 1;

    const movingData = { id: movingSnap.id, ...movingSnap.data(), folderId: targetFolderId } as any;
    withoutMoving.splice(insertIndex, 0, movingData);

    // Mettre à jour positions
    const batch = writeBatch(db!);
    withoutMoving.forEach((r, index) => {
      const ref = doc(db!, `${this.getUserPath()}/ranges/${r.id}`);
      batch.update(ref, { position: index, folderId: targetFolderId });
    });
    await batch.commit();
  }

  async reorderFolder(folderId: number, targetFolderId: number, insertBefore: boolean): Promise<void> {
    if (!this.initialized) await this.initialize();
    // Récupérer le dossier à déplacer et la cible
    const movingRef = await this.getDocRefByNumId('folders', folderId);
    const targetRef = await this.getDocRefByNumId('folders', targetFolderId);
    if (!movingRef || !targetRef) throw new Error('Dossier non trouvé');
    const [movingSnap, targetSnap] = await Promise.all([getDoc(movingRef), getDoc(targetRef)]);
    if (!movingSnap.exists() || !targetSnap.exists()) throw new Error('Dossier non trouvé');

    const targetParentId = targetSnap.data().parentId ?? null;
    const foldersRef = collection(db!, `${this.getUserPath()}/folders`);
    const qAll = query(foldersRef, where('parentId', '==', targetParentId), orderBy('position'));
    const listSnap = await getDocs(qAll);
    const items = listSnap.docs.map(d => ({ id: d.id, numId: d.data().numId ?? this.hashToNumber(d.id), ...d.data() } as any));

    const withoutMoving = items.filter(f => f.numId !== folderId);
    const targetIndex = withoutMoving.findIndex(f => f.numId === targetFolderId);
    const insertIndex = insertBefore ? targetIndex : targetIndex + 1;

    const movingData = { id: movingSnap.id, ...movingSnap.data(), parentId: targetParentId } as any;
    withoutMoving.splice(insertIndex, 0, movingData);

    const batch = writeBatch(db!);
    withoutMoving.forEach((f, index) => {
      const ref = doc(db!, `${this.getUserPath()}/folders/${f.id}`);
      batch.update(ref, { position: index, parentId: targetParentId });
    });
    await batch.commit();
  }

  // ================== MÉTHODES POUR LES ACTIONS ==================

  async getActionsForRange(rangeId: number): Promise<Action[]> {
    if (!this.initialized) await this.initialize();
    
    const actionsRef = collection(db!, `${this.getUserPath()}/actions`);
    const q = query(actionsRef, where('rangeId', '==', rangeId), orderBy('position'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(docSnap => ({
      id: parseInt(docSnap.id),
      rangeId: docSnap.data().rangeId,
      name: docSnap.data().name,
      color: docSnap.data().color,
      position: docSnap.data().position
    }));
  }

  async createAction(rangeId: number, name: string, color: string): Promise<number> {
    if (!this.initialized) await this.initialize();
    
    const actionsRef = collection(db!, `${this.getUserPath()}/actions`);
    
    const docRef = await addDoc(actionsRef, {
      rangeId,
      name,
      color,
      position: 0
    });
    const numId = this.hashToNumber(docRef.id);
    await updateDoc(docRef, { numId });
    return numId;
  }

  async updateAction(id: number, name: string, color: string): Promise<void> {
    if (!this.initialized) await this.initialize();
    
    const actionRef = doc(db!, `${this.getUserPath()}/actions/${id}`);
    await updateDoc(actionRef, { name, color });
  }

  async deleteAction(id: number): Promise<void> {
    if (!this.initialized) await this.initialize();
    
    const batch = writeBatch(db!);
    
    // Supprimer les mains associées
    const rangeHandsRef = collection(db!, `${this.getUserPath()}/rangeHands`);
    const rangeHandsQuery = query(rangeHandsRef, where('actionId', '==', id));
    const rangeHandsSnapshot = await getDocs(rangeHandsQuery);
    
    rangeHandsSnapshot.docs.forEach(handDoc => {
      batch.delete(handDoc.ref);
    });
    
    // Supprimer l'action
    const actionRef = doc(db!, `${this.getUserPath()}/actions/${id}`);
    batch.delete(actionRef);
    
    await batch.commit();
  }

  // ================== MÉTHODES POUR LES MAINS ==================

  async getRangeHands(rangeId: number): Promise<RangeHand[]> {
    if (!this.initialized) await this.initialize();
    
    const rangeHandsRef = collection(db!, `${this.getUserPath()}/rangeHands`);
    const q = query(rangeHandsRef, where('rangeId', '==', rangeId));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(docSnap => ({
      rangeId: docSnap.data().rangeId,
      actionId: docSnap.data().actionId,
      hand: docSnap.data().hand
    }));
  }

  async setHandAction(rangeId: number, hand: string, actionId: number): Promise<void> {
    if (!this.initialized) await this.initialize();
    
    const rangeHandsRef = collection(db!, `${this.getUserPath()}/rangeHands`);
    
    // Chercher si la main existe déjà
    const q = query(rangeHandsRef, 
      where('rangeId', '==', rangeId),
      where('hand', '==', hand)
    );
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      // Créer une nouvelle main
      await addDoc(rangeHandsRef, {
        rangeId,
        actionId,
        hand
      });
    } else {
      // Mettre à jour la main existante
      const handDoc = snapshot.docs[0];
      await updateDoc(handDoc.ref, { actionId });
    }
  }

  async removeHandAction(rangeId: number, hand: string): Promise<void> {
    if (!this.initialized) await this.initialize();
    
    const rangeHandsRef = collection(db!, `${this.getUserPath()}/rangeHands`);
    const q = query(rangeHandsRef, 
      where('rangeId', '==', rangeId),
      where('hand', '==', hand)
    );
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const batch = writeBatch(db!);
      snapshot.docs.forEach(docSnap => {
        batch.delete(docSnap.ref);
      });
      await batch.commit();
    }
  }

  // ================== MÉTHODES POUR LES REPLAYS ==================

  async getAllReplays(): Promise<SavedReplay[]> {
    if (!this.initialized) await this.initialize();
    
    const replaysRef = collection(db!, `${this.getUserPath()}/replays`);
    const q = query(replaysRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(docSnap => ({
      id: parseInt(docSnap.id),
      label: docSnap.data().label,
      hands: docSnap.data().hands,
      createdAt: docSnap.data().createdAt,
      handsCount: docSnap.data().handsCount,
      stakes: docSnap.data().stakes
    }));
  }

  async getReplay(id: number): Promise<SavedReplay | null> {
    if (!this.initialized) await this.initialize();
    
    const replayRef = doc(db!, `${this.getUserPath()}/replays/${id}`);
    const replaySnap = await getDoc(replayRef);
    
    if (!replaySnap.exists()) {
      return null;
    }
    
    return {
      id: parseInt(replaySnap.id),
      ...replaySnap.data()
    } as SavedReplay;
  }

  async createReplay(replay: Omit<SavedReplay, 'id'>): Promise<number> {
    if (!this.initialized) await this.initialize();
    
    const replaysRef = collection(db!, `${this.getUserPath()}/replays`);
    
    // Nettoyer les valeurs undefined avant d'envoyer à Firestore
    const cleanedReplay = this.cleanUndefinedValues({
      ...replay,
      createdAt: new Date().toISOString()
    });
    
    const docRef = await addDoc(replaysRef, cleanedReplay);
    const numId = this.hashToNumber(docRef.id);
    await updateDoc(docRef, { numId });
    return numId;
  }

  async updateReplay(id: number, label: string): Promise<void> {
    if (!this.initialized) await this.initialize();
    
    const ref = await this.getDocRefByNumId('replays', id);
    if (!ref) throw new Error('Replay non trouvé');
    await updateDoc(ref, { label });
  }

  async deleteReplay(id: number): Promise<void> {
    if (!this.initialized) await this.initialize();
    
    const ref = await this.getDocRefByNumId('replays', id);
    if (!ref) throw new Error('Replay non trouvé');
    await deleteDoc(ref);
  }

  // ================== UTILITAIRES ==================

  /**
   * Nettoyer les valeurs undefined d'un objet (Firestore ne les accepte pas)
   */
  private cleanUndefinedValues<T extends Record<string, any>>(obj: T): Partial<T> {
    const cleaned: any = {};
    for (const key in obj) {
      if (obj[key] !== undefined) {
        cleaned[key] = obj[key];
      }
    }
    return cleaned;
  }

  // Convertir un hash Firebase en nombre (pour compatibilité avec l'ancien système)
  private hashToNumber(hash: string): number {
    let result = 0;
    for (let i = 0; i < hash.length; i++) {
      result = ((result << 5) - result) + hash.charCodeAt(i);
      result = result & result; // Convert to 32bit integer
    }
    return Math.abs(result);
  }

  // Vérifier si l'utilisateur a des données dans Firebase
  async hasData(): Promise<boolean> {
    if (!this.initialized) await this.initialize();
    
    try {
      const foldersRef = collection(db!, `${this.getUserPath()}/folders`);
      const snapshot = await getDocs(foldersRef);
      return !snapshot.empty;
    } catch (error) {
      return false;
    }
  }

  // Écouter les changements en temps réel (pour les fonctionnalités futures)
  onHierarchyChange(callback: (hierarchy: Folder[]) => void): Unsubscribe {
    const foldersRef = collection(db!, `${this.getUserPath()}/folders`);
    const rangesRef = collection(db!, `${this.getUserPath()}/ranges`);
    
    // Note: Pour une vraie implémentation temps réel, il faudrait combiner les deux listeners
    return onSnapshot(foldersRef, async () => {
      const hierarchy = await this.getHierarchy();
      callback(hierarchy);
    });
  }

  close(): void {
    // Firebase gère automatiquement la fermeture des connexions
    this.initialized = false;
  }

  private async getDocRefByNumId(
    collectionName: 'folders' | 'ranges' | 'actions' | 'replays' | 'rangeHands',
    numId: number
  ): Promise<DocumentReference | null> {
    const colRef = collection(db!, `${this.getUserPath()}/${collectionName}`);
    // 1) Tentative par champ numId
    const qRef = query(colRef, where('numId', '==', numId));
    const byNumId = await getDocs(qRef);
    if (!byNumId.empty) return byNumId.docs[0].ref;

    // 2) Fallback: scanner et comparer le hash de l'id Firestore (pour anciens docs sans numId)
    const all = await getDocs(colRef);
    const match = all.docs.find(d => this.hashToNumber(d.id) === numId);
    return match ? match.ref : null;
  }
}

// Instance singleton
export const firebaseService = new FirebaseService();

