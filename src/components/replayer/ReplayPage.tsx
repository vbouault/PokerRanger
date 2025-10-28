import React, { useEffect, useState } from 'react';
import HandHistoryImporter from './HandHistoryImporter';
import ReplayList from './ReplayList';
import PokerTable from './PokerTable';
import ActionControls from './ActionControls';
import { Hand, SavedReplay } from '../../types/poker';

type ViewMode = 'list' | 'importer' | 'replayer';

interface ReplayPageProps {
  hands: Hand[];
  setHands: (hands: Hand[]) => void;
  currentHandIndex: number;
  setCurrentHandIndex: (index: number) => void;
  currentActionIndex: number;
  setCurrentActionIndex: (index: number) => void;
  showImporter: boolean;
  setShowImporter: (show: boolean) => void;
  showChipsInBB: boolean;
  setShowChipsInBB: (show: boolean) => void;
}

const ReplayPage: React.FC<ReplayPageProps> = ({
  hands,
  setHands,
  currentHandIndex,
  setCurrentHandIndex,
  currentActionIndex,
  setCurrentActionIndex,
  showImporter,
  setShowImporter,
  showChipsInBB,
  setShowChipsInBB,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // Synchroniser viewMode avec showImporter au montage
  useEffect(() => {
    if (hands.length > 0) {
      setViewMode('replayer');
    } else if (showImporter) {
      setViewMode('importer');
    } else {
      setViewMode('list');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleHandsLoaded = (loadedHands: Hand[], saveToDb?: boolean) => {
    setHands(loadedHands);
    setCurrentHandIndex(0);
    setCurrentActionIndex(0);
    setShowImporter(false);
    setViewMode('replayer');
  };

  const handleSelectReplay = (replay: SavedReplay) => {
    setHands(replay.hands);
    setCurrentHandIndex(0);
    setCurrentActionIndex(0);
    setViewMode('replayer');
  };

  const handleNewReplay = () => {
    setViewMode('importer');
  };

  const handlePreviousHand = () => {
    if (currentHandIndex > 0) {
      setCurrentHandIndex(currentHandIndex - 1);
      setCurrentActionIndex(0);
    }
  };

  const handleNextHand = () => {
    if (currentHandIndex < hands.length - 1) {
      setCurrentHandIndex(currentHandIndex + 1);
      setCurrentActionIndex(0);
    }
  };

  const handlePreviousAction = () => {
    if (currentActionIndex > 0) {
      setCurrentActionIndex(currentActionIndex - 1);
    }
  };

  const handleNextAction = () => {
    const currentHand = hands[currentHandIndex];
    if (currentHand && currentActionIndex < currentHand.actions.length - 1) {
      setCurrentActionIndex(currentActionIndex + 1);
    }
  };

  const handleBackToList = () => {
    setViewMode('list');
    setHands([]);
    setCurrentHandIndex(0);
    setCurrentActionIndex(0);
  };

  // Navigation directe vers une main spécifique
  const goToHand = (handIndex: number) => {
    if (handIndex >= 0 && handIndex < hands.length) {
      setCurrentHandIndex(handIndex);
      setCurrentActionIndex(0);
    }
  };

  // Gestion des raccourcis clavier
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Ne pas intercepter les raccourcis si on n'est pas dans le replayer
      if (viewMode !== 'replayer' || hands.length === 0) return;

      // Empêcher le comportement par défaut pour nos raccourcis
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
      }

      // Navigation entre les mains
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'ArrowLeft':
            handlePreviousHand();
            break;
          case 'ArrowRight':
            handleNextHand();
            break;
          case 'Home':
            goToHand(0); // Première main
            break;
          case 'End':
            goToHand(hands.length - 1); // Dernière main
            break;
        }
      }

      // Navigation avec les touches fléchées (sans Ctrl)
      if (!event.ctrlKey && !event.metaKey) {
        switch (event.key) {
          case 'ArrowLeft':
            handlePreviousAction();
            break;
          case 'ArrowRight':
            handleNextAction();
            break;
        }
      }
    };

    // Ajouter l'écouteur d'événements
    window.addEventListener('keydown', handleKeyPress);

    // Nettoyer l'écouteur lors du démontage
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentHandIndex, currentActionIndex, hands.length, viewMode]);

  const currentHand = hands[currentHandIndex];
  const currentAction = currentHand?.actions[currentActionIndex];
  
  // Obtenir la big blind pour l'affichage en BB
  const getBigBlind = (hand: Hand | null): number => {
    if (!hand || !hand.blinds) return 1;
    const blindValues = Object.values(hand.blinds);
    return blindValues.length > 0 ? Math.max(...blindValues) : 1;
  };
  
  const bigBlind = getBigBlind(currentHand);

  return (
    <div className="replay-page">
      {viewMode === 'list' && (
        <ReplayList 
          onSelectReplay={handleSelectReplay}
          onNewReplay={handleNewReplay}
        />
      )}
      
      {viewMode === 'importer' && (
        <div className="importer-wrapper">
          <button onClick={() => setViewMode('list')} className="back-to-list-button">
            ← Retour à la liste
          </button>
          <HandHistoryImporter onHandsLoaded={handleHandsLoaded} />
        </div>
      )}

      {viewMode === 'replayer' && (
        <div className="replayer-container">
          <button onClick={handleBackToList} className="back-button">
            ← Retour à la liste
          </button>

          <PokerTable 
            hand={currentHand} 
            currentAction={currentActionIndex}
            showChipsInBB={showChipsInBB}
          />

          <ActionControls
            currentHand={currentHandIndex}
            totalHands={hands.length}
            currentAction={currentActionIndex}
            totalActions={currentHand?.actions?.length || 0}
            onPreviousHand={handlePreviousHand}
            onNextHand={handleNextHand}
            onPreviousAction={handlePreviousAction}
            onNextAction={handleNextAction}
            onGoToHand={goToHand}
            currentActionData={currentAction}
            showChipsInBB={showChipsInBB}
            onToggleChipsInBB={() => setShowChipsInBB(!showChipsInBB)}
            bigBlind={bigBlind}
          />
        </div>
      )}
    </div>
  );
};

export default ReplayPage;
