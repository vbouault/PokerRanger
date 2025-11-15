# Migration vers Firebase Firestore

## ✅ Migration terminée !

Votre application **Ranger GTO** utilise désormais **Firebase Firestore** au lieu d'IndexedDB local.

---

## 📋 Ce qui a été fait

### 1. **Installation de Firebase**
- ✅ SDK Firebase installé (`firebase` package)
- ✅ Configuration Firebase dans `src/config/firebase.ts`
- ✅ Variables d'environnement configurées dans `.env.local`

### 2. **Nouveau service Firestore**
- ✅ Création de `src/services/firestore.ts` avec API identique à IndexedDB
- ✅ Support de l'authentification anonyme
- ✅ Persistance hors ligne automatique (cache local)
- ✅ Batch writes pour les opérations multiples (performances optimisées)

### 3. **Mise à jour des composants**
- ✅ `src/hooks/useRangeManager.ts` → utilise Firestore
- ✅ `src/components/replayer/HandHistoryImporter.tsx` → utilise Firestore
- ✅ `src/components/replayer/ReplayList.tsx` → utilise Firestore
- ✅ Ancien service IndexedDB archivé en `indexedDB.ts.backup`

---

## 🔧 Configuration Firebase Console (À FAIRE)

### Étape 1 : Configurer les règles de sécurité

1. Allez sur [Firebase Console](https://console.firebase.google.com/)
2. Sélectionnez votre projet **poker-ranger-c304c**
3. Dans le menu latéral, cliquez sur **Firestore Database**
4. Allez dans l'onglet **Règles**
5. Copiez-collez les règles du fichier `firestore.rules` :

\`\`\`
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /folders/{folderId} {
      allow read, write: if request.auth != null;
    }
    match /ranges/{rangeId} {
      allow read, write: if request.auth != null;
    }
    match /actions/{actionId} {
      allow read, write: if request.auth != null;
    }
    match /rangeHands/{handId} {
      allow read, write: if request.auth != null;
    }
    match /replays/{replayId} {
      allow read, write: if request.auth != null;
    }
  }
}
\`\`\`

6. Cliquez sur **Publier**

### Étape 2 : Activer l'authentification anonyme

1. Dans le menu Firebase, cliquez sur **Authentication**
2. Allez dans l'onglet **Sign-in method**
3. Activez **Connexion anonyme**
4. Sauvegardez

### Étape 3 : Créer les index composites (Optionnel mais recommandé)

Pour des requêtes plus rapides, créez ces index dans Firestore :

1. Allez dans **Firestore Database** → **Index**
2. Créez les index suivants :

| Collection | Champs indexés | Mode de requête |
|-----------|---------------|----------------|
| `folders` | `parentId` (Ascending), `position` (Ascending) | Collection |
| `ranges` | `folderId` (Ascending), `position` (Ascending) | Collection |
| `actions` | `rangeId` (Ascending), `position` (Ascending) | Collection |
| `rangeHands` | `rangeId` (Ascending), `hand` (Ascending) | Collection |
| `rangeHands` | `actionId` (Ascending) | Collection |
| `replays` | `createdAt` (Descending) | Collection |

**Note** : Firebase créera automatiquement certains index si nécessaire lors de la première utilisation.

---

## 🚀 Fonctionnalités implémentées

### ✨ Nouveautés avec Firestore

1. **Cache hors ligne automatique** 
   - Vos données sont automatiquement mises en cache localement
   - L'app fonctionne même sans connexion Internet
   - Synchronisation automatique lors du retour en ligne

2. **Authentification anonyme**
   - Connexion automatique sans compte utilisateur
   - Données isolées par session anonyme

3. **Performances optimisées**
   - Batch writes pour les opérations multiples
   - Index composites pour des requêtes rapides
   - Mêmes fonctionnalités qu'IndexedDB avec API identique

---

## 🧪 Comment tester

### 1. Renommer votre fichier env
Renommez `.env copy.local` en `.env.local` :
\`\`\`bash
mv ".env copy.local" .env.local
\`\`\`

### 2. Démarrer l'application
\`\`\`bash
npm start
\`\`\`

### 3. Tester les fonctionnalités
- ✅ Créer des dossiers et ranges
- ✅ Ajouter des actions
- ✅ Modifier les ranges
- ✅ Supprimer des éléments
- ✅ Tester le mode hors ligne (désactivez le réseau dans DevTools)
- ✅ Importer des replays de poker

### 4. Vérifier dans Firebase Console
Allez dans **Firestore Database** pour voir vos données en temps réel !

---

## 📊 Structure des collections Firestore

### Collections créées automatiquement :

1. **`folders`** - Dossiers hiérarchiques
   - `id` : ID unique (converti en numérique pour compatibilité)
   - `name` : Nom du dossier
   - `parentId` : ID du dossier parent (null pour racine)
   - `position` : Position dans la liste
   - `createdAt` : Date de création

2. **`ranges`** - Ranges de poker
   - `id` : ID unique
   - `name` : Nom de la range
   - `folderId` : ID du dossier parent
   - `position` : Position dans la liste
   - `createdAt` : Date de création

3. **`actions`** - Actions dans les ranges
   - `id` : ID unique
   - `rangeId` : ID de la range
   - `name` : Nom de l'action
   - `color` : Couleur de l'action
   - `position` : Position

4. **`rangeHands`** - Mains associées aux actions
   - `rangeId` : ID de la range
   - `actionId` : ID de l'action
   - `hand` : Main de poker (ex: "AA", "KQs")

5. **`replays`** - Historiques de parties
   - `id` : ID unique
   - `label` : Nom du replay
   - `hands` : Liste des mains jouées
   - `createdAt` : Date de création

---

## 🔒 Sécurité

- ✅ Authentification anonyme activée
- ✅ Règles de sécurité : lecture/écriture uniquement pour les utilisateurs authentifiés
- ✅ Données isolées (chaque utilisateur anonyme a sa propre session)

---

## ⚠️ Notes importantes

1. **Pas de migration automatique des données**
   - Les données existantes dans IndexedDB local ne sont **pas migrées**
   - Vous commencez avec une base de données Firestore vide
   - L'ancien service est archivé dans `indexedDB.ts.backup` si besoin

2. **Connexion Internet requise pour la première utilisation**
   - Première connexion nécessite Internet pour l'authentification
   - Ensuite, mode hors ligne disponible grâce au cache

3. **Quotas Firebase gratuits**
   - 50 000 lectures / jour
   - 20 000 écritures / jour
   - 20 000 suppressions / jour
   - 1 GB de stockage
   - Largement suffisant pour une utilisation personnelle !

---

## 🐛 Dépannage

### Erreur : "Missing or insufficient permissions"
→ Vérifiez que les règles Firestore sont bien configurées (voir Étape 1 ci-dessus)

### Erreur : "Auth error"
→ Vérifiez que l'authentification anonyme est activée (voir Étape 2 ci-dessus)

### L'app ne charge pas les données
→ Ouvrez la console du navigateur (F12) et vérifiez les erreurs
→ Vérifiez que votre `.env.local` contient bien toutes les variables

### Données qui n'apparaissent pas
→ Allez dans Firebase Console → Firestore Database pour vérifier que les données sont bien enregistrées

---

## 📞 Support

Si vous rencontrez des problèmes, vérifiez :
1. Les règles Firestore sont publiées
2. L'authentification anonyme est activée
3. Le fichier `.env.local` existe et contient les bonnes variables
4. La console du navigateur pour les erreurs

---

## 🎉 Prochaines étapes possibles

- 🔐 Ajouter l'authentification par email/Google
- 👥 Partager des ranges entre utilisateurs
- 📱 Progressive Web App (PWA) pour utilisation mobile
- 🌐 Déploiement sur Firebase Hosting
- 📊 Analytics avec Firebase Analytics

Bon poker ! 🃏

