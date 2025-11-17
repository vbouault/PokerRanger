import React, { useState, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload, faUpload } from '@fortawesome/free-solid-svg-icons';
import { databaseService } from '../../services/indexedDB';
import './DatabaseManager.css';

const DatabaseManager: React.FC = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setMessage(null);

      const jsonData = await databaseService.exportDatabase();
      
      // Créer un blob et télécharger le fichier
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ranger-gto-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: 'Base de données exportée avec succès !' });
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      setMessage({ type: 'error', text: 'Erreur lors de l\'export de la base de données' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      setMessage(null);

      const text = await file.text();
      
      // Demander confirmation à l'utilisateur
      const clearExisting = window.confirm(
        'Voulez-vous remplacer toutes les données existantes par les données importées ?\n\n' +
        'Cliquez sur "OK" pour remplacer, ou "Annuler" pour ajouter les données aux données existantes.'
      );

      await databaseService.importDatabase(text, clearExisting);

      setMessage({ 
        type: 'success', 
        text: clearExisting 
          ? 'Base de données importée avec succès (données remplacées) !' 
          : 'Base de données importée avec succès (données ajoutées) !' 
      });

      // Recharger la page pour afficher les nouvelles données
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Erreur lors de l\'import:', error);
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Erreur lors de l\'import de la base de données' 
      });
    } finally {
      setIsImporting(false);
      // Réinitialiser l'input pour permettre de réimporter le même fichier
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="database-manager">
      <div className="db-manager-buttons">
        <button 
          onClick={handleExport}
          disabled={isExporting || isImporting}
          className="db-btn db-btn-export"
          title="Exporter la base de données"
        >
          <FontAwesomeIcon icon={faDownload} spin={isExporting} />
        </button>
        <button 
          onClick={handleImportClick}
          disabled={isExporting || isImporting}
          className="db-btn db-btn-import"
          title="Importer une base de données"
        >
          <FontAwesomeIcon icon={faUpload} spin={isImporting} />
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      {message && (
        <div className={`db-message db-message-${message.type}`}>
          {message.text}
        </div>
      )}
    </div>
  );
};

export default DatabaseManager;

