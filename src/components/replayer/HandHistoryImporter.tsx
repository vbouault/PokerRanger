import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFolder, faFile, faSearch, faCircleCheck, faFloppyDisk, faPlay, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { HandHistoryParser } from '../../parsers/HandHistoryParser';
import { Hand } from '../../types/poker';
import { databaseService } from '../../services/indexedDB';
import './HandHistoryImporter.css';

interface HandHistoryImporterProps {
  onHandsLoaded: (hands: Hand[], saveToDb?: boolean) => void;
}

const HandHistoryImporter: React.FC<HandHistoryImporterProps> = ({ onHandsLoaded }) => {
  const [inputText, setInputText] = useState<string>('');
  const [parsedHands, setParsedHands] = useState<Hand[] | null>(null);
  const [replayLabel, setReplayLabel] = useState<string>('');
  const [saveToDb, setSaveToDb] = useState<boolean>(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setInputText(text);
      };
      reader.readAsText(file);
    }
  };

  const handleParseHistory = () => {
    if (inputText.trim()) {
      const parser = new HandHistoryParser();
      const hands = parser.parse(inputText);
      if (hands.length > 0) {
        setParsedHands(hands);
        // Générer un label par défaut basé sur la date et le nombre de mains
        const defaultLabel = `Session ${new Date().toLocaleDateString('fr-FR')} - ${hands.length} main${hands.length > 1 ? 's' : ''}`;
        setReplayLabel(defaultLabel);
      } else {
        alert('Aucune main trouvée dans l\'historique. Vérifiez le format.');
      }
    }
  };

  const handleLoadReplay = async () => {
    if (!parsedHands) return;

    try {
      if (saveToDb && replayLabel.trim()) {
        // Extraire les stakes du premier hand si disponible
        const stakes = parsedHands[0]?.stakes || undefined;
        
        await databaseService.createReplay({
          label: replayLabel.trim(),
          hands: parsedHands,
          handsCount: parsedHands.length,
          stakes,
          createdAt: new Date().toISOString()
        });
      }
      onHandsLoaded(parsedHands, saveToDb);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert('Erreur lors de la sauvegarde du replay');
    }
  };

  return (
    <div className="importer-container">
      <h2><FontAwesomeIcon icon={faFolder} /> Importer l'historique de mains</h2>
      
      <div className="import-options">
        <div className="file-upload">
          <label htmlFor="file-input" className="file-label">
            <FontAwesomeIcon icon={faFile} /> Choisir un fichier
          </label>
          <input
            id="file-input"
            type="file"
            accept=".txt,.log"
            onChange={handleFileUpload}
            className="file-input-hidden"
          />
        </div>
      </div>

      <div className="text-input-area">
        <textarea
          placeholder="Ou collez votre historique de mains ici..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          rows={15}
          disabled={parsedHands !== null}
        />
      </div>

      {parsedHands === null ? (
        <button 
          onClick={handleParseHistory} 
          className="btn-parse"
          disabled={!inputText.trim()}
        >
          <FontAwesomeIcon icon={faSearch} /> Analyser l'historique
        </button>
      ) : (
        <div className="parsed-info">
          <div className="success-message">
            <FontAwesomeIcon icon={faCircleCheck} /> {parsedHands.length} main{parsedHands.length > 1 ? 's' : ''} analysée{parsedHands.length > 1 ? 's' : ''}
          </div>

          <div className="save-options">
            <div className="checkbox-group">
              <input
                type="checkbox"
                id="save-to-db"
                checked={saveToDb}
                onChange={(e) => setSaveToDb(e.target.checked)}
              />
              <label htmlFor="save-to-db">
                <FontAwesomeIcon icon={faFloppyDisk} /> Sauvegarder ce replay dans la base de données
              </label>
            </div>

            {saveToDb && (
              <div className="label-input-group">
                <label htmlFor="replay-label">Label du replay :</label>
                <input
                  id="replay-label"
                  type="text"
                  value={replayLabel}
                  onChange={(e) => setReplayLabel(e.target.value)}
                  placeholder="Nom du replay..."
                  className="replay-label-input"
                />
              </div>
            )}
          </div>

          <div className="action-buttons">
            <button 
              onClick={handleLoadReplay}
              className="btn-load"
              disabled={saveToDb && !replayLabel.trim()}
            >
              <FontAwesomeIcon icon={faPlay} /> Charger le replay
            </button>
            <button 
              onClick={() => {
                setParsedHands(null);
                setReplayLabel('');
                setSaveToDb(false);
              }}
              className="btn-cancel"
            >
              <FontAwesomeIcon icon={faArrowLeft} /> Retour
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HandHistoryImporter;
