import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { GraphList } from './components/graph-management/GraphList.js';
import { GraphWorkspace } from './components/layout/GraphWorkspace.js';
import { CommandPalette } from './components/layout/CommandPalette.js';

export function App() {
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <Routes>
        <Route path="/" element={<GraphList />} />
        <Route path="/graph/:graphId" element={<GraphWorkspace />} />
      </Routes>
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
    </>
  );
}
