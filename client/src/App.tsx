import { Routes, Route } from 'react-router-dom';
import { GraphList } from './components/graph-management/GraphList.js';
import { GraphWorkspace } from './components/layout/GraphWorkspace.js';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<GraphList />} />
      <Route path="/graph/:graphId" element={<GraphWorkspace />} />
    </Routes>
  );
}
