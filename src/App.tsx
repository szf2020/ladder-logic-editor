/**
 * Ladder Logic Editor Application
 *
 * A visual ladder logic diagram editor with Structured Text representation.
 */

import { useEffect } from 'react';
import { MainLayout } from './components/layout/MainLayout';
import { useProjectStore } from './store';

import './App.css';

function App() {
  const newTrafficControllerProject = useProjectStore(
    (state) => state.newTrafficControllerProject
  );
  const project = useProjectStore((state) => state.project);

  // Initialize with a traffic controller project on first load
  useEffect(() => {
    if (!project) {
      newTrafficControllerProject('Traffic Controller');
    }
  }, [project, newTrafficControllerProject]);

  return (
    <div className="app">
      <MainLayout />
    </div>
  );
}

export default App;
