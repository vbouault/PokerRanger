import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';

// Vérifier si Firebase est configuré
export const isFirebaseConfigured = !!(
  process.env.REACT_APP_FIREBASE_API_KEY &&
  process.env.REACT_APP_FIREBASE_AUTH_DOMAIN &&
  process.env.REACT_APP_FIREBASE_PROJECT_ID &&
  process.env.REACT_APP_FIREBASE_STORAGE_BUCKET &&
  process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID &&
  process.env.REACT_APP_FIREBASE_APP_ID
);

let app: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;
let authInstance: Auth | null = null;

// Initialiser Firebase uniquement si configuré
if (isFirebaseConfigured) {
  try {
    const firebaseConfig = {
      apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
      authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
      storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.REACT_APP_FIREBASE_APP_ID
    };

    // Initialiser Firebase
    app = initializeApp(firebaseConfig);

    // Initialiser Firestore
    dbInstance = getFirestore(app);

    // Initialiser l'authentification
    authInstance = getAuth(app);

    // Activer la persistence offline (cache local)
    enableIndexedDbPersistence(dbInstance).catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('⚠️ Persistence offline: plusieurs onglets ouverts. La synchronisation se fera dans l\'onglet principal.');
      } else if (err.code === 'unimplemented') {
        console.warn('⚠️ Persistence offline non supportée par ce navigateur');
      }
    });

    console.log('🔥 Firebase initialisé avec succès');
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation de Firebase:', error);
    console.warn('⚠️ L\'application fonctionnera en mode local (IndexedDB) uniquement');
  }
} else {
  console.log('ℹ️ Firebase non configuré - L\'application fonctionnera en mode local (IndexedDB) uniquement');
  console.log('💡 Pour activer la synchronisation cloud, consultez FIREBASE_SETUP.md');
}

// Exporter les instances avec vérification
export const db = dbInstance;
export const auth = authInstance;

