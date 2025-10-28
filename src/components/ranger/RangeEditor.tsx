import React from 'react';
import FileManager from './FileManager';
import Ranger from './Ranger';
import { Range } from '../../types/range';
import './RangeEditor.css';

interface RangeEditorProps {
  currentRange: Range | null;
  setCurrentRange: (range: Range | null) => void;
  expandedFolders: Set<number>;
  setExpandedFolders: (folders: Set<number>) => void;
}

const RangeEditor: React.FC<RangeEditorProps> = ({ 
  currentRange, 
  setCurrentRange, 
  expandedFolders, 
  setExpandedFolders 
}) => {
  const handleRangeSelect = (range: Range) => {
    setCurrentRange(range);
  };

  return (
    <div className="range-editor">
      <FileManager 
        onRangeSelect={handleRangeSelect}
        currentRange={currentRange}
        expandedFolders={expandedFolders}
        setExpandedFolders={setExpandedFolders}
      />
      <div className="editor-content">
        <Ranger selectedRange={currentRange} />
      </div>
    </div>
  );
};

export default RangeEditor;
