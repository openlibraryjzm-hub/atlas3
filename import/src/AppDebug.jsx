import React from 'react';
import LayoutShell from './LayoutShell';
import { useLayoutStore } from './store/layoutStore';
import './App.css';

function AppDebug() {
  const { viewMode, setViewMode, menuQuarterMode, toggleMenuQuarterMode } = useLayoutStore();
  const [debugEnabled, setDebugEnabled] = React.useState(true);

  // Force debug mode on
  React.useEffect(() => {
    useLayoutStore.setState({ showDebugBounds: true });
    console.log('Debug mode forced ON');
  }, []);

  return (
    <div className="app-container">
      {/* View Mode Toggle */}
      <div className="view-mode-toggle" style={{ position: 'fixed', top: 0, left: 0, zIndex: 10000, background: '#000', padding: '10px' }}>
        <button
          onClick={() => setViewMode('full')}
          className={viewMode === 'full' ? 'active' : ''}
        >
          Full
        </button>
        <button
          onClick={() => setViewMode('half')}
          className={viewMode === 'half' ? 'active' : ''}
        >
          Half
        </button>
        <button
          onClick={() => setViewMode('quarter')}
          className={viewMode === 'quarter' ? 'active' : ''}
        >
          Quarter
        </button>
        {viewMode !== 'full' && (
          <button
            onClick={toggleMenuQuarterMode}
            className={menuQuarterMode ? 'active' : ''}
            title="Toggle Menu Quarter Mode"
          >
            Menu Q
          </button>
        )}
        <div style={{ color: '#3b82f6', marginLeft: '10px', display: 'inline-block' }}>
          DEBUG MODE ACTIVE
        </div>
      </div>

      <LayoutShell 
        topController={null}
        mainPlayer={null}
        miniHeader={null}
        sideMenu={null}
      />
    </div>
  );
}

export default AppDebug;

