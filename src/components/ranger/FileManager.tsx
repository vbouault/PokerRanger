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
    moveFolderToParent,
    reorderFolder,
    createRange,
    updateRange,
    deleteRange,
    duplicateRange,
    moveRangeToFolder,
    reorderRange
  } = useRangeManager();
  const [editingItem, setEditingItem] = useState<{ id: number; type: ItemType } | null>(null);
  const [editingName, setEditingName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemType, setNewItemType] = useState<ItemType>('folder');
  const [parentFolderId, setParentFolderId] = useState<number | undefined>(undefined);
  const [draggedItem, setDraggedItem] = useState<{ id: number; type: ItemType } | null>(null);
  const [dragOverItem, setDragOverItem] = useState<{ id: number; type: ItemType } | null>(null);
  const [insertBefore, setInsertBefore] = useState<boolean>(false);

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

  // Gestion du drag and drop
  const handleDragStart = (e: React.DragEvent, id: number, type: ItemType) => {
    setDraggedItem({ id, type });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
  };

  const handleDragOver = (e: React.DragEvent, id: number, type: ItemType) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedItem && (draggedItem.id !== id || draggedItem.type !== type)) {
      setDragOverItem({ id, type });
      
      // Déterminer si on insère avant ou après en fonction de la position de la souris
      const rect = e.currentTarget.getBoundingClientRect();
      const mouseY = e.clientY - rect.top;
      const elementHeight = rect.height;
      
      // Si la souris est dans la moitié supérieure, insérer avant, sinon après
      setInsertBefore(mouseY < elementHeight / 2);
    }
  };

  const handleDragLeave = () => {
    setDragOverItem(null);
    setInsertBefore(false);
  };

  const handleDrop = async (e: React.DragEvent, targetId: number | null, targetType: ItemType | null) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedItem) return;

    // Si on dépose sur la racine (targetId === null)
    if (targetId === null) {
      if (draggedItem.type === 'range') {
        await moveRangeToFolder(draggedItem.id, null);
      } else if (draggedItem.type === 'folder') {
        await moveFolderToParent(draggedItem.id, null);
      }
      setDraggedItem(null);
      setDragOverItem(null);
      setInsertBefore(false);
      return;
    }

    // Empêcher de déplacer un élément sur lui-même
    if (draggedItem.id === targetId && draggedItem.type === targetType) {
      setDraggedItem(null);
      setDragOverItem(null);
      setInsertBefore(false);
      return;
    }

    // Logique pour les ranges
    if (draggedItem.type === 'range') {
      if (targetType === 'range') {
        // Réorganiser : déplacer la range avant ou après la cible
        await reorderRange(draggedItem.id, targetId, insertBefore);
      } else if (targetType === 'folder') {
        // Déplacer vers un dossier
        await moveRangeToFolder(draggedItem.id, targetId);
      }
    }
    // Logique pour les dossiers
    else if (draggedItem.type === 'folder') {
      if (targetType === 'folder') {
        // Vérifier si c'est une réorganisation ou un déplacement
        // On considère que c'est une réorganisation si le modifier key est pressé
        // ou on peut utiliser un indicateur visuel
        // Pour simplifier, on va utiliser la distance : si très proche = réorganisation
        
        // Pour l'instant, toujours considérer comme réorganisation
        // Empêcher de déplacer un dossier dans lui-même ou dans ses enfants
        if (!isFolderDescendant(draggedItem.id, targetId)) {
          await reorderFolder(draggedItem.id, targetId, insertBefore);
        }
      }
    }

    setDraggedItem(null);
    setDragOverItem(null);
    setInsertBefore(false);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverItem(null);
  };

  // Vérifier si targetFolderId est un descendant de folderId
  const isFolderDescendant = (folderId: number, targetFolderId: number): boolean => {
    const findFolder = (folders: Folder[], id: number): Folder | null => {
      for (const folder of folders) {
        if (folder.id === id) return folder;
        if (folder.folders) {
          const found = findFolder(folder.folders, id);
          if (found) return found;
        }
      }
      return null;
    };

    const checkDescendant = (folder: Folder, targetId: number): boolean => {
      if (folder.id === targetId) return true;
      if (folder.folders) {
        return folder.folders.some(f => checkDescendant(f, targetId));
      }
      return false;
    };

    const folder = findFolder(hierarchy, folderId);
    if (!folder) return false;
    return checkDescendant(folder, targetFolderId);
  };

  const renderRange = (range: Range, level: number = 0) => {
    const isEditing = editingItem?.id === range.id && editingItem.type === 'range';
    const isSelected = currentRange?.id === range.id;
    const isDragging = draggedItem?.id === range.id && draggedItem.type === 'range';
    const isDragOver = dragOverItem?.id === range.id && dragOverItem.type === 'range';
    const showInsertBefore = isDragOver && insertBefore;
    const showInsertAfter = isDragOver && !insertBefore;

    return (
      <div key={`range-${range.id}`} className="range-item">
        <div
          className={`range-row ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''} ${showInsertBefore ? 'insert-before' : ''} ${showInsertAfter ? 'insert-after' : ''}`}
          style={{ paddingLeft: `${level * 20 + 10}px` }}
          draggable={!isEditing}
          onDragStart={(e) => handleDragStart(e, range.id, 'range')}
          onDragOver={(e) => handleDragOver(e, range.id, 'range')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, range.id, 'range')}
          onDragEnd={handleDragEnd}
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
    const isDragging = draggedItem?.id === folder.id && draggedItem.type === 'folder';
    const isDragOver = dragOverItem?.id === folder.id && dragOverItem.type === 'folder';
    const showInsertBefore = isDragOver && draggedItem?.type === 'folder' && insertBefore;
    const showInsertAfter = isDragOver && draggedItem?.type === 'folder' && !insertBefore;
    const showDropInto = isDragOver && draggedItem?.type === 'range';

    return (
      <div key={`folder-${folder.id}`} className="range-item">
        <div
          className={`range-row ${isDragging ? 'dragging' : ''} ${showInsertBefore ? 'insert-before' : ''} ${showInsertAfter ? 'insert-after' : ''} ${showDropInto ? 'drag-over' : ''}`}
          style={{ paddingLeft: `${level * 20 + 10}px` }}
          draggable={!isEditing}
          onDragStart={(e) => handleDragStart(e, folder.id, 'folder')}
          onDragOver={(e) => handleDragOver(e, folder.id, 'folder')}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, folder.id, 'folder')}
          onDragEnd={handleDragEnd}
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

      <div 
        className="ranges-list"
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        }}
        onDrop={(e) => handleDrop(e, null, null)}
      >
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
