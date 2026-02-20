import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { GraphList } from './components/graph-management/GraphList.js';
import { GraphWorkspace } from './components/layout/GraphWorkspace.js';
import { CommandPalette } from './components/layout/CommandPalette.js';
import { useAppStore } from './stores/app-store.js';

export function App() {
  const { isCommandPaletteOpen, toggleCommandPalette, closeCommandPalette } = useAppStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleCommandPalette();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggleCommandPalette]);

  return (
    <>
      <Routes>
        <Route path="/" element={<GraphList />} />
        <Route path="/graph/:graphId" element={<GraphWorkspace />} />
      </Routes>
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={closeCommandPalette}
      />
    </>
  );
}
