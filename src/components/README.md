# Structure des Composants

Cette application est organisée en modules distincts pour séparer clairement les fonctionnalités du ranger et du replayer.

## 📁 Organisation des Dossiers

### 🎯 `/ranger/`
Composants dédiés au système de ranges poker :
- **Ranger.tsx** - Grille principale des mains de poker
- **FileManager.tsx** - Gestionnaire de fichiers pour organiser les ranges
- **RangeEditor.tsx** - Éditeur principal combinant le gestionnaire et le ranger
- **CSS associés** - Styles spécifiques au ranger

### 🎮 `/replayer/`
Composants dédiés au replayer de mains de poker :
- **ReplayPage.tsx** - Page principale du replayer
- **PokerTable.tsx** - Table de poker avec les joueurs
- **Player.tsx** - Composant joueur individuel
- **TableCenter.tsx** - Centre de la table (pot, cartes communes)
- **ActionControls.tsx** - Contrôles de lecture (play, pause, etc.)
- **ActionHistory.tsx** - Historique des actions
- **HandHistoryImporter.tsx** - Importateur de fichiers de mains
- **CSS associés** - Styles spécifiques au replayer

### 🔗 `/shared/`
Composants partagés entre les modules :
- **Navigation.tsx** - Barre de navigation principale
- **Card.tsx** - Composant carte de poker
- **CSS associés** - Styles partagés

## 📦 Imports

### Import depuis un module spécifique :
```typescript
import { Ranger, FileManager } from './components/ranger';
import { ReplayPage, PokerTable } from './components/replayer';
import { Navigation, Card } from './components/shared';
```

### Import depuis tous les composants :
```typescript
import { Ranger, ReplayPage, Navigation } from './components';
```

## 🎨 Avantages de cette Structure

1. **Séparation claire** des fonctionnalités
2. **Imports organisés** et faciles à maintenir
3. **Évolutivité** - facile d'ajouter de nouveaux modules
4. **Réutilisabilité** des composants partagés
5. **Maintenance** simplifiée du code
