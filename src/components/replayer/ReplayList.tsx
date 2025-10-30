import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faPencil, faTrash, faCheck, faXmark } from '@fortawesome/free-solid-svg-icons';
import { SavedReplay } from '../../types/poker';
import { databaseService } from '../../services/databaseService';
import './ReplayList.css';

interface ReplayListProps {
  onSelectReplay: (replay: SavedReplay) => void;
  onNewReplay: () => void;
}

const ReplayList: React.FC<ReplayListProps> = ({ onSelectReplay, onNewReplay }) => {
  const [replays, setReplays] = useState<SavedReplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState('');

  useEffect(() => {
    loadReplays();
  }, []);

  const loadReplays = async () => {
    try {
      setLoading(true);
      const loadedReplays = await databaseService.getAllReplays();
      setReplays(loadedReplays);
    } catch (error) {
      console.error('Erreur lors du chargement des replays:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce replay ?')) {
      try {
        await databaseService.deleteReplay(id);
        await loadReplays();
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        alert('Erreur lors de la suppression du replay');
      }
    }
  };

  const handleStartEdit = (replay: SavedReplay, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(replay.id!);
    setEditLabel(replay.label);
  };

  const handleSaveEdit = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editLabel.trim()) {
      try {
        await databaseService.updateReplay(id, editLabel.trim());
        await loadReplays();
        setEditingId(null);
      } catch (error) {
        console.error('Erreur lors de la modification:', error);
        alert('Erreur lors de la modification du label');
      }
    }
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
    setEditLabel('');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (loading) {
    return (
      <div className="replay-list-container">
        <div className="loading">Chargement des replays...</div>
      </div>
    );
  }

  return (
    <div className="replay-list-container">
      <div className="replay-list-header">
        <h2>Mes Replays</h2>
        <button onClick={onNewReplay} className="btn-new-replay">
          Nouveau Replay
        </button>
      </div>

      {replays.length === 0 ? (
        <div className="empty-state">
          <p>Aucun replay enregistré</p>
          <p className="empty-state-hint">
            Cliquez sur "Nouveau Replay" pour importer et sauvegarder un historique de mains
          </p>
        </div>
      ) : (
        <div className="replay-table-wrapper">
          <table className="replay-table">
            <thead>
              <tr>
                <th>Label</th>
                <th>Nombre de mains</th>
                <th>Stakes</th>
                <th>Date de création</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {replays.map((replay) => (
                <tr key={replay.id} className="replay-row">
                  <td className="replay-label">
                    {editingId === replay.id ? (
                      <input
                        type="text"
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="edit-input"
                        autoFocus
                      />
                    ) : (
                      <strong>{replay.label}</strong>
                    )}
                  </td>
                  <td>{replay.handsCount} main{replay.handsCount > 1 ? 's' : ''}</td>
                  <td>{replay.stakes || 'N/A'}</td>
                  <td>{formatDate(replay.createdAt)}</td>
                  <td className="replay-actions">
                    {editingId === replay.id ? (
                      <>
                        <button
                          onClick={(e) => handleSaveEdit(replay.id!, e)}
                          className="btn-action btn-save"
                          title="Sauvegarder"
                        >
                          <FontAwesomeIcon icon={faCheck} />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="btn-action btn-cancel"
                          title="Annuler"
                        >
                          <FontAwesomeIcon icon={faXmark} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => onSelectReplay(replay)}
                          className="btn-action btn-play"
                          title="Lancer le replay"
                        >
                          <FontAwesomeIcon icon={faPlay} />
                        </button>
                        <button
                          onClick={(e) => handleStartEdit(replay, e)}
                          className="btn-action btn-edit"
                          title="Modifier"
                        >
                          <FontAwesomeIcon icon={faPencil} />
                        </button>
                        <button
                          onClick={(e) => handleDelete(replay.id!, e)}
                          className="btn-action btn-delete"
                          title="Supprimer"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ReplayList;

