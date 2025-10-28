# 🎴 Poker Hand Replayer

Un visualiseur de mains et tournois de poker moderne et élégant, développé en React.

## ✨ Fonctionnalités

- **Import d'historique** : Importez vos fichiers d'historique de mains ou collez directement le texte
- **Support multi-formats** : Compatible avec PokerStars, Winamax et formats génériques
- **Navigation intuitive** : 
  - Naviguez entre les mains (précédente/suivante)
  - Rejouez chaque action (précédente/suivante)
- **Interface moderne** : Design soigné avec animations et effets visuels
- **Affichage de table** : Visualisation réaliste d'une table de poker
- **Historique d'actions** : Suivez toutes les actions en temps réel
- **Timeline de progression** : Barre de progression visuelle

## 🚀 Installation

```bash
npm install
```

## 🎮 Utilisation

```bash
npm start
```

L'application s'ouvrira automatiquement dans votre navigateur à l'adresse [http://localhost:3000](http://localhost:3000).

## 📖 Comment utiliser

1. **Charger un historique** :
   - Cliquez sur "Choisir un fichier" pour importer un fichier .txt ou .log
   - Ou collez votre historique directement dans la zone de texte
   - Ou utilisez le bouton "Charger un exemple" pour tester avec des données d'exemple

2. **Navigation** :
   - Utilisez les boutons "Main précédente/suivante" pour naviguer entre les mains
   - Utilisez "Action précédente/suivante" pour rejouer chaque action pas à pas
   - La timeline montre visuellement votre progression

3. **Visualisation** :
   - La table de poker affiche les joueurs, leurs cartes (si connues), et le board
   - L'action courante est mise en évidence
   - L'historique complet est affiché sur le côté

## 📋 Formats supportés

L'application supporte les formats d'historique de :
- PokerStars
- Winamax
- Formats génériques similaires

## 🛠️ Technologies utilisées

- React 19.2.0
- CSS3 avec gradients et animations
- JavaScript moderne (ES6+)

## 📝 Structure du projet

```
src/
├── components/
│   ├── HandHistoryImporter.js    # Composant d'import
│   ├── PokerTable.js              # Table de poker
│   ├── ActionControls.js          # Contrôles de navigation
│   └── ActionHistory.js           # Historique des actions
├── utils/
│   └── handHistoryParser.js       # Parser d'historique
├── App.js                         # Composant principal
└── App.css                        # Styles globaux
```

## 🎨 Fonctionnalités de design

- Palette de couleurs moderne avec gradients
- Animations fluides
- Interface responsive
- Effets de hover et transitions
- Indicateurs visuels pour les actions passées/courantes/futures

## 📄 Licence

MIT

## 👨‍💻 Développeur

Créé avec ❤️ pour les joueurs de poker qui veulent analyser leurs sessions.
