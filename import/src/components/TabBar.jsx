import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useTabStore } from '../store/tabStore';
import { useTabPresetStore } from '../store/tabPresetStore';
import { useLayoutStore } from '../store/layoutStore';
import AddPlaylistToTabModal from './AddPlaylistToTabModal';
import TabPresetsDropdown from './TabPresetsDropdown';

const TabMenu = ({ onAdd, onRename, onDelete, inspectMode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    const updatePosition = () => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();

        // Fixed positioning (viewport relative)
        let top = rect.bottom + 5;
        let left = rect.left;

        setPosition({ top, left });
      }
    };

    if (isOpen) {
      updatePosition();
      window.addEventListener('resize', updatePosition);
      document.addEventListener('scroll', updatePosition, true);
    }

    return () => {
      window.removeEventListener('resize', updatePosition);
      document.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current && !menuRef.current.contains(event.target) &&
        buttonRef.current && !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const getInspectTitle = (label) => inspectMode ? label : undefined;

  return (
    <>
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`p-0.5 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-800 transition-all ${isOpen ? 'opacity-100 bg-slate-200 text-slate-800' : 'opacity-0 group-hover:opacity-100'}`}
        title={getInspectTitle('Tab options')}
        style={{ width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
        </svg>
      </button>

      {isOpen && position && ReactDOM.createPortal(
        <div
          ref={menuRef}
          className="fixed z-50 mt-1 w-36 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden"
          style={{
            top: position.top,
            left: position.left,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { onAdd(); setIsOpen(false); }}
            className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-2"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Playlist
          </button>
          <button
            onClick={() => { onRename(); setIsOpen(false); }}
            className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-2"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
            Rename
          </button>
          <div className="h-px bg-slate-700 my-0.5"></div>
          <button
            onClick={() => { onDelete(); setIsOpen(false); }}
            className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            Delete Tab
          </button>
        </div>,
        document.body
      )}
    </>
  );
};

const TabBar = ({ onAddPlaylistToTab, showPresets = true }) => {
  const { tabs, activeTabId, setActiveTab, createTab, deleteTab, renameTab } = useTabStore();
  const { inspectMode } = useLayoutStore();

  const getInspectTitle = (label) => inspectMode ? label : undefined;
  const [showCreateTab, setShowCreateTab] = useState(false);
  const [newTabName, setNewTabName] = useState('');
  const [editingTabId, setEditingTabId] = useState(null);
  const [editTabName, setEditTabName] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalTabId, setAddModalTabId] = useState(null);

  const handleCreateTab = () => {
    if (newTabName.trim()) {
      createTab(newTabName.trim());
      setNewTabName('');
      setShowCreateTab(false);
    }
  };

  const handleStartEdit = (tab) => {
    if (tab.id === 'all') return;
    setEditingTabId(tab.id);
    setEditTabName(tab.name);
  };

  const handleSaveEdit = (tabId) => {
    if (editTabName.trim()) {
      renameTab(tabId, editTabName.trim());
      setEditingTabId(null);
      setEditTabName('');
    }
  };

  const handleCancelEdit = () => {
    setEditingTabId(null);
    setEditTabName('');
  };

  const handleOpenAddModal = (tabId, e) => {
    if (e) e.stopPropagation();
    setAddModalTabId(tabId);
    setShowAddModal(true);
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setAddModalTabId(null);
  };

  const handleAddPlaylist = (tabId, playlistId) => {
    if (onAddPlaylistToTab) {
      onAddPlaylistToTab(tabId, playlistId);
    }
  };

  const currentTab = tabs.find(t => t.id === addModalTabId);
  const { activePresetId, presets } = useTabPresetStore();
  const activePreset = presets.find(p => p.id === activePresetId) || presets[0];

  const visibleTabsRaw = activePresetId === 'all' || !activePreset || activePreset.tabIds.length === 0
    ? tabs
    : tabs.filter(tab => tab.id === 'all' || activePreset.tabIds.includes(tab.id));

  const visibleTabs = visibleTabsRaw.filter(tab => tab.id !== 'all');

  return (
    <>
      {showAddModal && currentTab && (
        <AddPlaylistToTabModal
          tabId={addModalTabId}
          tabName={currentTab.name}
          onClose={handleCloseAddModal}
          onAdd={handleAddPlaylist}
        />
      )}
      <div className="flex items-center gap-2 min-w-0">
        {showPresets && (
          <div className="flex-shrink-0 relative z-20">
            <TabPresetsDropdown />
          </div>
        )}

        <div className="flex items-center gap-1 overflow-x-auto flex-1 min-w-0 pb-1 no-scrollbar">
          {visibleTabs.map((tab) => (
            <div key={tab.id} className="flex-shrink-0">
              {editingTabId === tab.id ? (
                <input
                  type="text"
                  value={editTabName}
                  onChange={(e) => setEditTabName(e.target.value)}
                  onBlur={() => handleSaveEdit(tab.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit(tab.id);
                    else if (e.key === 'Escape') handleCancelEdit();
                  }}
                  className="px-2 py-1 text-xs bg-slate-700 text-white rounded border border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  style={{ minWidth: '60px', width: 'auto' }}
                  autoFocus
                />
              ) : (
                <div
                  className={`rounded-full flex items-center justify-center border-2 shadow-sm transition-all duration-200 px-4 h-9 gap-1.5 cursor-pointer group relative ${activeTabId === tab.id
                    ? 'bg-white border-sky-500 text-sky-600 transform scale-105'
                    : 'bg-white border-[#334155] text-slate-600 hover:bg-slate-50 active:scale-95'
                    }`}
                  onClick={() => setActiveTab(activeTabId === tab.id ? 'all' : tab.id)}
                  title={getInspectTitle(`Tab: ${tab.name}`)}
                >
                  <span className="font-bold text-xs uppercase tracking-wide">{tab.name}</span>

                  {tab.id !== 'all' && (
                    <TabMenu
                      onAdd={() => handleOpenAddModal(tab.id)}
                      onRename={() => handleStartEdit(tab)}
                      onDelete={() => deleteTab(tab.id)}
                      inspectMode={inspectMode}
                    />
                  )}
                </div>
              )}
            </div>
          ))}

          {showCreateTab ? (
            <div className="flex items-center gap-1 flex-shrink-0">
              <input
                type="text"
                value={newTabName}
                onChange={(e) => setNewTabName(e.target.value)}
                onBlur={() => {
                  if (newTabName.trim()) handleCreateTab();
                  else setShowCreateTab(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateTab();
                  else if (e.key === 'Escape') {
                    setShowCreateTab(false);
                    setNewTabName('');
                  }
                }}
                placeholder="Tab name"
                className="px-2 py-1.5 text-xs bg-slate-700 text-white rounded border border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                style={{ minWidth: '100px' }}
                autoFocus
              />
            </div>
          ) : (
            <button
              onClick={() => setShowCreateTab(true)}
              className="flex items-center justify-center w-7 h-7 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors flex-shrink-0"
              title="Create new tab"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default TabBar;
