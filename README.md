# 🎯 Ranger GTO - Gestionnaire de Ranges Poker & Replay

Une application web moderne pour gérer vos ranges de poker et analyser vos historiques de mains.

## ✨ Fonctionnalités

### 📁 Gestionnaire de Ranges
- Création et organisation de ranges de mains de poker
- Système de dossiers hiérarchiques
- Actions colorées personnalisables
- Interface de grille 13x13 interactive
- Statistiques en temps réel
- Duplication et réorganisation par glisser-déposer

### 🎬 Replay de Parties
- Import d'historiques de mains (.txt)
- Visualisation interactive des parties
- Sauvegarde des replays
- Navigation action par action
- Affichage détaillé du pot et des mises

### 💾 Sauvegarde des Données

L'application utilise **Firebase (Firestore)** pour le stockage des données :

- ☁️ **Sauvegarde cloud automatique**
- 🔄 **Synchronisation entre appareils**
- 🛡️ **Aucun risque de perte de données**
- 🔐 **Authentification sécurisée**
- 📱 **Accessibilité partout**

**Configuration requise :** Créer un projet Firebase (gratuit, 10 minutes)  
**Guide** : [QUICKSTART.md](./QUICKSTART.md) ou [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)

## 🚀 Installation

### Prérequis
- Node.js (v14 ou supérieur)
- npm ou yarn

### Installation des dépendances

```bash
npm install --legacy-peer-deps
```

### Configuration Firebase (REQUISE)

L'application nécessite Firebase pour fonctionner. Suivez le guide détaillé : [**QUICKSTART.md**](./QUICKSTART.md) (10 minutes)

**Résumé rapide :**

1. Créez un projet Firebase sur https://console.firebase.google.com/
2. Activez Authentication (Anonyme) et Firestore Database
3. Créez un fichier `.env.local` à la racine :

```bash
REACT_APP_FIREBASE_API_KEY=votre_clé_api
REACT_APP_FIREBASE_AUTH_DOMAIN=votre-projet.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=votre-projet-id
REACT_APP_FIREBASE_STORAGE_BUCKET=votre-projet.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=1:123456789:web:abc123
```

4. Démarrez l'application : `npm start`

**📚 Guides disponibles :**
- [QUICKSTART.md](./QUICKSTART.md) - Configuration rapide (10 min)
- [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) - Guide détaillé avec captures

## 🏃 Démarrage

### Mode développement

```bash
npm start
```

L'application sera accessible sur http://localhost:3000

### Build de production

```bash
npm run build
```

Les fichiers optimisés seront générés dans le dossier `build/`.

### Tests

```bash
npm test
```

## 📱 Utilisation

### Gestionnaire de Ranges

1. **Créer un dossier** : Cliquez sur "+" à côté de "Mes Ranges"
2. **Créer une range** : Cliquez sur "+" dans un dossier
3. **Ajouter des actions** : Dans une range, utilisez le panneau latéral pour créer des actions (Raise, Call, Fold...)
4. **Sélectionner des mains** : Cliquez sur les cases de la grille pour assigner des mains aux actions
5. **Organiser** : Glissez-déposez les dossiers et ranges pour les réorganiser

### Replay de Parties

1. **Importer** : Cliquez sur "Nouveau Replay" et importez votre fichier .txt
2. **Analyser** : L'application parse automatiquement les mains
3. **Sauvegarder** (optionnel) : Cochez "Sauvegarder" et donnez un nom
4. **Rejouer** : Naviguez dans les actions avec les contrôles

## 🏗️ Architecture

```
ranger-gto/
├── src/
│   ├── components/
│   │   ├── ranger/          # Gestionnaire de ranges
│   │   ├── replayer/        # Replay de parties
│   │   └── shared/          # Composants partagés
│   ├── services/
│   │   ├── firebase.ts      # Configuration Firebase
│   │   ├── firebaseService.ts    # Service Firebase
│   │   ├── indexedDB.ts     # Service IndexedDB
│   │   └── databaseService.ts    # Service hybride (point d'entrée)
│   ├── hooks/               # React hooks personnalisés
│   ├── parsers/             # Parseur d'historiques
│   ├── types/               # Définitions TypeScript
│   └── utils/               # Utilitaires
├── public/                  # Fichiers statiques
└── build/                   # Build de production
```

Voir [ARCHITECTURE.md](./ARCHITECTURE.md) pour plus de détails.

## 🔧 Technologies

- **React** 19 - Framework UI
- **TypeScript** - Typage statique
- **Firebase** - Backend cloud (authentification + Firestore)
- **React Router** - Navigation
- **FontAwesome** - Icônes
- **Vercel** - Hébergement

## 📊 Service de Base de Données

L'application utilise **Firebase (Firestore)** comme base de données :

- ☁️ **Cloud natif** : Toutes les données dans Firebase
- 🔄 **Synchronisation automatique** : Entre tous vos appareils
- 🔐 **Authentification anonyme** : Pas de compte requis
- 📱 **Persistence offline** : Cache local automatique
- 🛡️ **Sécurité** : Règles Firestore côté serveur

### Vérifier la connexion

Ouvrez la console du navigateur (F12) au démarrage :

**Connexion réussie :**
```
🔄 Initialisation de Firebase...
🔥 Firebase initialisé avec succès
🔐 Connexion anonyme réussie (Firebase): xxx...
✅ Firebase initialisé avec succès
💾 Vos données sont sauvegardées dans le cloud
```

**Erreur de configuration :**
```
❌ Erreur lors de l'initialisation de Firebase
💡 Consultez FIREBASE_SETUP.md pour configurer Firebase
```

➡️ **Solution** : Vérifiez votre fichier `.env.local` et les clés Firebase

## 🔒 Sécurité

- Authentification Firebase (anonyme par défaut)
- Règles Firestore : un utilisateur ne peut accéder qu'à ses propres données
- Variables d'environnement pour les clés sensibles
- Aucune donnée partagée entre utilisateurs

## 🌐 Déploiement

L'application est configurée pour Vercel avec le fichier `vercel.json`.

### Variables d'environnement sur Vercel

Dans les paramètres du projet Vercel, ajoutez :

```
REACT_APP_FIREBASE_API_KEY
REACT_APP_FIREBASE_AUTH_DOMAIN
REACT_APP_FIREBASE_PROJECT_ID
REACT_APP_FIREBASE_STORAGE_BUCKET
REACT_APP_FIREBASE_MESSAGING_SENDER_ID
REACT_APP_FIREBASE_APP_ID
```

## 🐛 Dépannage

### Erreur "Firebase not initialized"
- Vérifiez que `.env.local` existe avec toutes les variables
- Variables doivent commencer par `REACT_APP_`
- Redémarrez `npm start`

### Les données ne se synchronisent pas
- Vérifiez votre connexion internet
- Fermez les autres onglets (offline persistence)
- Consultez la console (F12) pour les erreurs

### Migration des données
- Si la popup de migration n'apparaît pas, vérifiez la console
- Vous pouvez forcer la migration en vidant le cache de Firebase

## 📝 Formats supportés

### Historiques de mains

L'application supporte les formats suivants :
- PokerStars Hand History (.txt)
- Format texte standard avec structure :
  - Identifiant de main
  - Date et heure
  - Stakes et type de jeu
  - Position des joueurs
  - Actions preflop, flop, turn, river
  - Showdown et résultats

## 🤝 Contribution

Les contributions sont les bienvenues ! Pour contribuer :

1. Forkez le projet
2. Créez une branche (`git checkout -b feature/AmazingFeature`)
3. Committez vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Pushez vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

## 📄 Licence

Ce projet est sous licence MIT.

## 👨‍💻 Auteur

Développé avec ❤️ pour la communauté poker

## 🔗 Liens utiles

- [Documentation Firebase](https://firebase.google.com/docs)
- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [Guide de configuration Firebase](./FIREBASE_SETUP.md)

---

⚡ **Astuce** : Pour une expérience optimale, configurez Firebase pour bénéficier de la synchronisation cloud !

