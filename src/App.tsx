import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import { Navigation } from './components/shared';
import { ReplayPage } from './components/replayer';
import { RangeEditor } from './components/ranger';
import { Range } from './types/range';
import { Hand } from './types/poker';

const App: React.FC = () => {
  // État pour le RangeEditor
  const [currentRange, setCurrentRange] = useState<Range | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());

  // État pour le ReplayPage
  const [hands, setHands] = useState<Hand[]>([]);
  const [currentHandIndex, setCurrentHandIndex] = useState<number>(0);
  const [currentActionIndex, setCurrentActionIndex] = useState<number>(0);
  const [showImporter, setShowImporter] = useState<boolean>(true);
  const [showChipsInBB, setShowChipsInBB] = useState<boolean>(false);

  return (
    <Router>
      <div className="App">
        <Navigation />
        <Routes>
          <Route 
            path="/" 
            element={
              <RangeEditor 
                currentRange={currentRange}
                setCurrentRange={setCurrentRange}
                expandedFolders={expandedFolders}
                setExpandedFolders={setExpandedFolders}
              />
            } 
          />
          <Route 
            path="/replayer" 
            element={
              <ReplayPage 
                hands={hands}
                setHands={setHands}
                currentHandIndex={currentHandIndex}
                setCurrentHandIndex={setCurrentHandIndex}
                currentActionIndex={currentActionIndex}
                setCurrentActionIndex={setCurrentActionIndex}
                showImporter={showImporter}
                setShowImporter={setShowImporter}
                showChipsInBB={showChipsInBB}
                setShowChipsInBB={setShowChipsInBB}
              />
            } 
          />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
