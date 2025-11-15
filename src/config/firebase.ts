import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  enableIndexedDbPersistence,
  initializeFirestore,
  CACHE_SIZE_UNLIMITED
} from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);

// Initialiser Firestore avec des paramètres optimisés
export const db = initializeFirestore(app, {
  cacheSizeBytes: CACHE_SIZE_UNLIMITED,
  // Pas de listeners automatiques inutiles
  experimentalForceLongPolling: false,
  experimentalAutoDetectLongPolling: true,
});

// Initialiser Auth
export const auth = getAuth(app);

// Activer la persistance hors ligne
enableIndexedDbPersistence(db, {
  forceOwnership: false // Permet plusieurs onglets sans conflit
}).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Persistance hors ligne désactivée : plusieurs onglets ouverts');
  } else if (err.code === 'unimplemented') {
    console.warn('Persistance hors ligne non supportée par ce navigateur');
  }
});

// Authentification anonyme automatique
export const initializeAuth = async (): Promise<void> => {
  try {
    await signInAnonymously(auth);
    console.log('Authentification anonyme réussie');
  } catch (error) {
    console.error('Erreur lors de l\'authentification anonyme:', error);
  }
};

export default app;

