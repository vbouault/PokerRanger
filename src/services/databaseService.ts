import { firebaseService } from './firebaseService';
import { Folder, Range, Action, RangeHand } from '../types/range';
import { SavedReplay } from '../types/poker';

/**
 * Service de base de données utilisant Firebase (Firestore)
 * 
 * Configuration requise:
 * - Créer un projet Firebase
 * - Configurer le fichier .env.local avec les clés Firebase
 * - Voir FIREBASE_SETUP.md ou QUICKSTART.md pour les instructions
 */
export class DatabaseService {
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    console.log('🔄 Initialisation de Firebase...');

    this.initPromise = (async () => {
      try {
        await firebaseService.initialize();
        this.initialized = true;
        console.log('✅ Firebase initialisé avec succès');
        console.log('💾 Vos données sont sauvegardées dans le cloud');
      } catch (error) {
        // Réinitialiser pour permettre une nouvelle tentative ultérieure
        this.initPromise = null;
        this.initialized = false;
        console.error('❌ Erreur lors de l\'initialisation de Firebase:', error);
        console.error('💡 Consultez FIREBASE_SETUP.md pour configurer Firebase');
        throw error;
      }
    })();

    return this.initPromise;
  }


  // ================== MÉTHODES POUR LES FOLDERS ==================

  async getAllFolders(): Promise<Folder[]> {
    return firebaseService.getAllFolders();
  }

  async getHierarchy(): Promise<Folder[]> {
    return firebaseService.getHierarchy();
  }

  async createFolder(name: string, parentId?: number): Promise<number> {
    return firebaseService.createFolder(name, parentId);
  }

  async updateFolder(id: number, name: string): Promise<void> {
    return firebaseService.updateFolder(id, name);
  }

  async deleteFolder(id: number): Promise<void> {
    return firebaseService.deleteFolder(id);
  }

  async moveFolderToParent(folderId: number, newParentId: number | null): Promise<void> {
    return firebaseService.moveFolderToParent(folderId, newParentId);
  }

  async duplicateFolder(folderId: number, newName?: string, targetParentId?: number): Promise<number> {
    return firebaseService.duplicateFolder(folderId, newName, targetParentId);
  }

  async reorderFolder(folderId: number, targetFolderId: number, insertBefore: boolean): Promise<void> {
    return firebaseService.reorderFolder(folderId, targetFolderId, insertBefore);
  }

  // ================== MÉTHODES POUR LES RANGES ==================

  async getAllRanges(): Promise<Range[]> {
    return firebaseService.getAllRanges();
  }

  async createRange(name: string, folderId?: number): Promise<number> {
    return firebaseService.createRange(name, folderId);
  }

  async updateRange(id: number, name: string): Promise<void> {
    return firebaseService.updateRange(id, name);
  }

  async deleteRange(id: number): Promise<void> {
    return firebaseService.deleteRange(id);
  }

  async moveRangeToFolder(rangeId: number, newFolderId: number | null): Promise<void> {
    return firebaseService.moveRangeToFolder(rangeId, newFolderId);
  }

  async duplicateRange(rangeId: number, newName?: string): Promise<number> {
    return firebaseService.duplicateRange(rangeId, newName);
  }

  // Réorganisation (non implémenté côté Firebase pour l'instant)
  async reorderRange(rangeId: number, targetRangeId: number, insertBefore: boolean): Promise<void> {
    return firebaseService.reorderRange(rangeId, targetRangeId, insertBefore);
  }

  // ================== MÉTHODES POUR LES ACTIONS ==================

  async getActionsForRange(rangeId: number): Promise<Action[]> {
    return firebaseService.getActionsForRange(rangeId);
  }

  async createAction(rangeId: number, name: string, color: string): Promise<number> {
    return firebaseService.createAction(rangeId, name, color);
  }

  async updateAction(id: number, name: string, color: string): Promise<void> {
    return firebaseService.updateAction(id, name, color);
  }

  async deleteAction(id: number): Promise<void> {
    return firebaseService.deleteAction(id);
  }

  // ================== MÉTHODES POUR LES MAINS ==================

  async getRangeHands(rangeId: number): Promise<RangeHand[]> {
    return firebaseService.getRangeHands(rangeId);
  }

  async setHandAction(rangeId: number, hand: string, actionId: number): Promise<void> {
    return firebaseService.setHandAction(rangeId, hand, actionId);
  }

  async removeHandAction(rangeId: number, hand: string): Promise<void> {
    return firebaseService.removeHandAction(rangeId, hand);
  }

  // ================== MÉTHODES POUR LES REPLAYS ==================

  async getAllReplays(): Promise<SavedReplay[]> {
    return firebaseService.getAllReplays();
  }

  async getReplay(id: number): Promise<SavedReplay | null> {
    return firebaseService.getReplay(id);
  }

  async createReplay(replay: Omit<SavedReplay, 'id'>): Promise<number> {
    return firebaseService.createReplay(replay);
  }

  async updateReplay(id: number, label: string): Promise<void> {
    return firebaseService.updateReplay(id, label);
  }

  async deleteReplay(id: number): Promise<void> {
    return firebaseService.deleteReplay(id);
  }

  // ================== UTILITAIRES ==================

  close(): void {
    firebaseService.close();
  }
}

// Instance singleton - C'est celle-ci que vous devez utiliser partout
export const databaseService = new DatabaseService();

