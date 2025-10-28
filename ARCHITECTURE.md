# Architecture du Poker Hand Replayer

## Vue d'ensemble

Cette application a été refactorisée avec TypeScript pour offrir une architecture plus propre, modulaire et maintenable.

## Structure du projet

```
src/
├── types/
│   └── poker.ts              # Types TypeScript pour le poker
├── utils/
│   ├── pokerCalculations.ts  # Utilitaires pour les calculs de poker
│   └── handHistoryParser.js  # Parser legacy (déprécié)
├── parsers/
│   └── HandHistoryParser.ts  # Parser modulaire TypeScript
├── hooks/
│   └── useTableState.ts      # Hook personnalisé pour l'état de la table
├── components/
│   ├── Card.tsx              # Composant carte
│   ├── Player.tsx            # Composant joueur
│   ├── TableCenter.tsx       # Centre de la table
│   ├── PokerTable.tsx        # Table principale
│   ├── HandHistoryImporter.tsx # Importateur d'historique
│   ├── ActionControls.tsx    # Contrôles de navigation
│   ├── ActionHistory.tsx     # Historique des actions
│   └── PokerTable.js         # Table legacy (déprécié)
├── App.tsx                   # Composant principal
└── index.js                  # Point d'entrée
```

## Principes architecturaux

### 1. Séparation des responsabilités
- **Types** : Définition claire des interfaces et types
- **Parsers** : Logique de parsing séparée de l'UI
- **Hooks** : Logique métier réutilisable
- **Composants** : UI pure et réutilisable
- **Utils** : Fonctions utilitaires pures

### 2. TypeScript
- Types stricts pour éviter les erreurs
- Interfaces claires pour les données
- Meilleure intellisense et documentation

### 3. Architecture modulaire
- Chaque module a une responsabilité unique
- Facile à tester individuellement
- Facile à maintenir et étendre

## Composants principaux

### Types (`src/types/poker.ts`)
Définit tous les types TypeScript pour le système de poker :
- `Card`, `Suit`, `Rank` : Types de base pour les cartes
- `Player`, `Action`, `Hand` : Structures de données principales
- `PlayerState`, `TableState` : États des composants

### Parser (`src/parsers/HandHistoryParser.ts`)
Parser modulaire avec une architecture orientée objet :
- Classe `HandHistoryParser` avec méthodes spécialisées
- Chaque type de ligne a sa propre méthode de parsing
- Facile à étendre pour de nouveaux formats

### Hook (`src/hooks/useTableState.ts`)
Gestion de l'état de la table avec une classe `TableStateManager` :
- Logique métier séparée de l'UI
- Calculs optimisés avec `useMemo`
- État immutable et prévisible

### Utilitaires (`src/utils/pokerCalculations.ts`)
Fonctions pures pour les calculs de poker :
- Extraction des montants des actions
- Calculs de pot et de mises
- Manipulation des cartes

### Composants UI
- **Card** : Affichage d'une carte (face visible ou cachée)
- **Player** : Affichage d'un joueur avec son état
- **TableCenter** : Centre de la table (pot et board)
- **PokerTable** : Table principale orchestrant tout

## Migration depuis l'ancien code

### Avantages de la nouvelle architecture

1. **Type Safety** : TypeScript prévient les erreurs à la compilation
2. **Maintenabilité** : Code modulaire et bien structuré
3. **Testabilité** : Chaque module peut être testé indépendamment
4. **Extensibilité** : Facile d'ajouter de nouveaux formats ou fonctionnalités
5. **Performance** : Optimisations avec `useMemo` et calculs efficaces

### Compatibilité
- L'ancien code continue de fonctionner
- Migration progressive possible
- Même interface utilisateur

## Utilisation

```typescript
import { HandHistoryParser } from './parsers/HandHistoryParser';
import { PokerTable } from './components/PokerTable';

// Parser
const parser = new HandHistoryParser();
const hands = parser.parse(historyText);

// Composant
<PokerTable hand={currentHand} currentAction={currentActionIndex} />
```

## Tests

Chaque module peut être testé indépendamment :

```typescript
// Test du parser
const parser = new HandHistoryParser();
const hands = parser.parse(sampleHistory);
expect(hands).toHaveLength(2);

// Test des utilitaires
const amount = extractBetAmount('raises', '200 to 400');
expect(amount).toBe(400);
```

## Extensions futures

1. **Nouveaux formats** : Ajouter des méthodes dans `HandHistoryParser`
2. **Nouvelles fonctionnalités** : Étendre les types et les hooks
3. **Tests** : Ajouter des tests unitaires pour chaque module
4. **Performance** : Optimiser les calculs avec des memoization
5. **UI** : Améliorer l'interface avec de nouveaux composants
