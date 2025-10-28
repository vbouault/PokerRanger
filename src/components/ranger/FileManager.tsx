import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileLines, faFolder, faPencil, faPlus, faCopy, faTrash, faChevronRight, faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { useRangeManager } from '../../hooks/useRangeManager';
import { Folder, Range } from '../../types/range';
import './FileManager.css';

interface FileManagerProps {
  onRangeSelect: (range: Range) => void;
  currentRange: Range | null;
  expandedFolders: Set<number>;
  setExpandedFolders: (folders: Set<number>) => void;
}

type ItemType = 'folder' | 'range';

const FileManager: React.FC<FileManagerProps> = ({ 
  onRangeSelect, 
  currentRange,
  expandedFolders,
  setExpandedFolders
}) => {
  const {
    hierarchy,
    createFolder,
    updateFolder,
    deleteFolder,
    duplicateFolder,
    createRange,
    updateRange,
    deleteRange,
    duplicateRange
  } = useRangeManager();
  const [editingItem, setEditingItem] = useState<{ id: number; type: ItemType } | null>(null);
  const [editingName, setEditingName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemType, setNewItemType] = useState<ItemType>('folder');
  const [parentFolderId, setParentFolderId] = useState<number | undefined>(undefined);

  const toggleFolder = (folderId: number) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const handleEditStart = (id: number, name: string, type: ItemType) => {
    setEditingItem({ id, type });
    setEditingName(name);
  };

  const handleEditSave = () => {
    if (editingItem && editingName.trim()) {
      if (editingItem.type === 'folder') {
        updateFolder(editingItem.id, editingName.trim());
      } else {
        updateRange(editingItem.id, editingName.trim());
      }
      setEditingItem(null);
      setEditingName('');
    }
  };

  const handleEditCancel = () => {
    setEditingItem(null);
    setEditingName('');
  };

  const handleDeleteFolder = (folderId: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce dossier et tout son contenu ?')) {
      deleteFolder(folderId);
    }
  };

  const handleDeleteRange = (rangeId: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette range ?')) {
      deleteRange(rangeId);
    }
  };

  const handleAddItem = () => {
    if (newItemName.trim()) {
      if (newItemType === 'folder') {
        createFolder(newItemName.trim(), parentFolderId);
      } else {
        createRange(newItemName.trim(), parentFolderId);
      }
      setNewItemName('');
      setShowAddForm(false);
      setParentFolderId(undefined);
      setNewItemType('folder');
    }
  };

  const renderRange = (range: Range, level: number = 0) => {
    const isEditing = editingItem?.id === range.id && editingItem.type === 'range';
    const isSelected = currentRange?.id === range.id;

    return (
      <div key={`range-${range.id}`} className="range-item">
        <div
          className={`range-row ${isSelected ? 'selected' : ''}`}
          style={{ paddingLeft: `${level * 20 + 10}px` }}
        >
          <div className="folder-spacer" />
          <span className="item-icon">
            <FontAwesomeIcon icon={faFileLines} />
          </span>

          {/* Nom de la range */}
          {isEditing ? (
            <input
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleEditSave()}
              onBlur={handleEditSave}
              className="edit-input"
              autoFocus
            />
          ) : (
            <span
              className="range-name"
              onClick={() => onRangeSelect(range)}
              title={range.name}
            >
              {range.name}
            </span>
          )}

          {/* Actions */}
          {!isEditing && (
            <div className="range-actions">
              <button
                className="action-btn edit-btn"
                onClick={() => handleEditStart(range.id, range.name, 'range')}
                title="Renommer"
              >
                <FontAwesomeIcon icon={faPencil} />
              </button>
              <button
                className="action-btn copy-btn"
                onClick={() => duplicateRange(range.id)}
                title="Dupliquer"
              >
                <FontAwesomeIcon icon={faCopy} />
              </button>
              <button
                className="action-btn delete-btn"
                onClick={() => handleDeleteRange(range.id)}
                title="Supprimer"
              >
                <FontAwesomeIcon icon={faTrash} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderFolder = (folder: Folder, level: number = 0) => {
    const hasContent = (folder.folders && folder.folders.length > 0) || (folder.ranges && folder.ranges.length > 0);
    const isExpanded = expandedFolders.has(folder.id);
    const isEditing = editingItem?.id === folder.id && editingItem.type === 'folder';

    return (
      <div key={`folder-${folder.id}`} className="range-item">
        <div
          className="range-row"
          style={{ paddingLeft: `${level * 20 + 10}px` }}
        >
          {/* Icône de dossier */}
          {hasContent && (
            <button
              className="folder-toggle"
              onClick={() => toggleFolder(folder.id)}
            >
              <FontAwesomeIcon icon={isExpanded ? faChevronDown : faChevronRight} />
            </button>
          )}
          {!hasContent && <div className="folder-spacer" />}

          <span className="item-icon">
            <FontAwesomeIcon icon={faFolder} />
          </span>

          {/* Nom du dossier */}
          {isEditing ? (
            <input
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleEditSave()}
              onBlur={handleEditSave}
              className="edit-input"
              autoFocus
            />
          ) : (
            <span className="folder-name" title={folder.name}>
              {folder.name}
            </span>
          )}

          {/* Actions */}
          {!isEditing && (
            <div className="range-actions">
              <button
                className="action-btn edit-btn"
                onClick={() => handleEditStart(folder.id, folder.name, 'folder')}
                title="Renommer"
              >
                <FontAwesomeIcon icon={faPencil} />
              </button>
              <button
                className="action-btn add-btn"
                onClick={() => {
                  setParentFolderId(folder.id);
                  setShowAddForm(true);
                }}
                title="Ajouter un élément"
              >
                <FontAwesomeIcon icon={faPlus} />
              </button>
              <button
                className="action-btn copy-btn"
                onClick={() => duplicateFolder(folder.id)}
                title="Dupliquer"
              >
                <FontAwesomeIcon icon={faCopy} />
              </button>
              <button
                className="action-btn delete-btn"
                onClick={() => handleDeleteFolder(folder.id)}
                title="Supprimer"
              >
                <FontAwesomeIcon icon={faTrash} />
              </button>
            </div>
          )}
        </div>

        {/* Contenu du dossier */}
        {hasContent && isExpanded && (
          <div className="sub-ranges">
            {folder.folders && folder.folders.map(subfolder => renderFolder(subfolder, level + 1))}
            {folder.ranges && folder.ranges.map(range => renderRange(range, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="file-manager">
      <div className="file-manager-header">
        <h3>Ranges</h3>
        <button
          className="add-root-btn"
          onClick={() => {
            setParentFolderId(undefined);
            setShowAddForm(true);
          }}
          title="Ajouter un élément racine"
        >
          <FontAwesomeIcon icon={faPlus} />
        </button>
      </div>

      <div className="ranges-list">
        {hierarchy.map(folder => renderFolder(folder))}
      </div>

      {/* Formulaire d'ajout */}
      {showAddForm && (
        <div className="add-range-form">
          <div className="form-type-selector">
            <label>
              <input
                type="radio"
                value="folder"
                checked={newItemType === 'folder'}
                onChange={(e) => setNewItemType(e.target.value as ItemType)}
              />
              Dossier
            </label>
            <label>
              <input
                type="radio"
                value="range"
                checked={newItemType === 'range'}
                onChange={(e) => setNewItemType(e.target.value as ItemType)}
              />
              Range
            </label>
          </div>
          <input
            type="text"
            placeholder={newItemType === 'folder' ? 'Nom du dossier' : 'Nom de la range'}
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddItem()}
            className="add-input"
            autoFocus
          />
          <div className="form-actions">
            <button onClick={handleAddItem} className="btn-save">
              Ajouter
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewItemName('');
                setParentFolderId(undefined);
                setNewItemType('folder');
              }}
              className="btn-cancel"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default FileManager;
