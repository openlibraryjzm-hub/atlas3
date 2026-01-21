import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useTabPresetStore } from '../store/tabPresetStore';
import { useTabStore } from '../store/tabStore';

const TabPresetsDropdown = ({ align = 'left' }) => {
  const { presets, activePresetId, setActivePreset, createPreset, deletePreset, updatePreset } = useTabPresetStore();
  const { tabs } = useTabStore();
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [selectedTabIds, setSelectedTabIds] = useState(new Set());
  const [editingPresetId, setEditingPresetId] = useState(null);

  const buttonRef = useRef(null);
  const [dropdownPosition, setDropdownPosition] = useState(null);

  // Calculate position when opening
  useEffect(() => {
    const updatePosition = () => {
      if (buttonRef.current && isOpen) {
        const rect = buttonRef.current.getBoundingClientRect();
        // Position below the button with a small usage of fixed positioning
        setDropdownPosition({
          top: rect.bottom + 8,
          left: rect.left,
        });
      }
    };

    if (isOpen) {
      updatePosition();
      // Update position on scroll/resize to keep it attached
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
    }

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!isOpen) return;

      // Check if click is on the button
      if (buttonRef.current && buttonRef.current.contains(event.target)) {
        return;
      }

      // Check if click is inside the portal (we'll look for the portal element by ID)
      const portalContent = document.getElementById('tab-presets-dropdown-portal');
      if (portalContent && portalContent.contains(event.target)) {
        return;
      }

      // Don't close if clicking inside the modal (which is also a portal)
      const modalContent = document.getElementById('tab-presets-modal');
      if (modalContent && modalContent.contains(event.target)) {
        return;
      }

      setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const activePreset = presets.find(p => p.id === activePresetId) || presets[0];

  const handleCreatePreset = () => {
    if (newPresetName.trim() && selectedTabIds.size > 0) {
      createPreset(newPresetName.trim(), Array.from(selectedTabIds));
      setNewPresetName('');
      setSelectedTabIds(new Set());
      setShowCreateModal(false);
    }
  };

  const handleStartCreate = () => {
    setSelectedTabIds(new Set());
    setNewPresetName('');
    setShowCreateModal(true);
  };

  const handleToggleTab = (tabId) => {
    setSelectedTabIds(prev => {
      const updated = new Set(prev);
      if (updated.has(tabId)) {
        updated.delete(tabId);
      } else {
        updated.add(tabId);
      }
      return updated;
    });
  };

  const handleEditPreset = (preset) => {
    if (preset.id === 'all') return;
    setEditingPresetId(preset.id);
    setSelectedTabIds(new Set(preset.tabIds));
    setNewPresetName(preset.name);
    setShowCreateModal(true);
  };

  const handleSaveEdit = () => {
    if (newPresetName.trim() && editingPresetId) {
      updatePreset(editingPresetId, newPresetName.trim(), Array.from(selectedTabIds));
      setEditingPresetId(null);
      setNewPresetName('');
      setSelectedTabIds(new Set());
      setShowCreateModal(false);
    }
  };

  const handleDeletePreset = (presetId, e) => {
    e.stopPropagation();
    if (presetId === 'all') return;
    if (window.confirm('Are you sure you want to delete this preset?')) {
      deletePreset(presetId);
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`h-9 px-4 rounded-full text-xs font-bold uppercase tracking-wide transition-colors flex items-center justify-center gap-2 border-2 shadow-sm ${activePresetId === 'all'
          ? 'bg-slate-800 text-white border-slate-700 hover:bg-slate-700'
          : 'bg-white text-slate-600 border-[#334155] hover:bg-slate-50'
          }`}
        title="Tab Presets"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <span>{activePreset.name}</span>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && dropdownPosition && ReactDOM.createPortal(
        <div
          id="tab-presets-dropdown-portal"
          className="fixed z-[9999] w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Preset List */}
          <div className="max-h-64 overflow-y-auto">
            {presets.map((preset) => (
              <div
                key={preset.id}
                className={`flex items-center justify-between px-3 py-2 hover:bg-slate-700 cursor-pointer group ${activePresetId === preset.id ? 'bg-sky-600/20' : ''
                  }`}
                onClick={() => {
                  setActivePreset(preset.id);
                  setIsOpen(false);
                }}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-white text-sm truncate">{preset.name}</span>
                  {preset.id === 'all' ? (
                    <span className="text-xs text-slate-400">({tabs.length} tabs)</span>
                  ) : (
                    <span className="text-xs text-slate-400">({preset.tabIds.length} tabs)</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {preset.id !== 'all' && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditPreset(preset);
                        }}
                        className="p-1 rounded hover:bg-slate-600 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-white"
                        title="Edit preset"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => handleDeletePreset(preset.id, e)}
                        className="p-1 rounded hover:bg-slate-600 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-400"
                        title="Delete preset"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Create Preset Button */}
          <div className="border-t border-slate-700">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleStartCreate();
                setIsOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm text-sky-400 hover:bg-slate-700 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Create Preset</span>
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Create/Edit Preset Modal */}
      {showCreateModal && (
        <div
          id="tab-presets-modal"
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white mb-4">
              {editingPresetId ? 'Edit Preset' : 'Create Preset'}
            </h3>

            {/* Preset Name Input */}
            <input
              type="text"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              placeholder="Preset name"
              className="px-3 py-2 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:ring-1 focus:ring-sky-500 mb-4"
              autoFocus
            />

            {/* Tab Selection */}
            <div className="flex-1 overflow-y-auto mb-4">
              <p className="text-slate-400 text-sm mb-2">Select tabs to include:</p>
              <div className="space-y-2">
                {tabs.filter(tab => tab.id !== 'all').map((tab) => {
                  const isSelected = selectedTabIds.has(tab.id);
                  return (
                    <div
                      key={tab.id}
                      onClick={() => handleToggleTab(tab.id)}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${isSelected
                        ? 'bg-sky-600/20 border border-sky-500'
                        : 'bg-slate-700 hover:bg-slate-600 border border-transparent'
                        }`}
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${isSelected
                        ? 'bg-sky-500 border-sky-500'
                        : 'border-slate-500'
                        }`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <span className="text-white text-sm">{tab.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-700">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingPresetId(null);
                  setNewPresetName('');
                  setSelectedTabIds(new Set());
                }}
                className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={editingPresetId ? handleSaveEdit : handleCreatePreset}
                disabled={!newPresetName.trim() || selectedTabIds.size === 0}
                className="px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 disabled:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {editingPresetId ? 'Save' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TabPresetsDropdown;
