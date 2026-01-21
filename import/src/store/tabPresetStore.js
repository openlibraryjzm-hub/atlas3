import { create } from 'zustand';

// Load presets from localStorage
const loadPresets = () => {
  try {
    const stored = localStorage.getItem('tabPresets');
    if (stored) {
      return JSON.parse(stored);
    }
    // Default: "All" preset that includes all tabs
    return [{ id: 'all', name: 'All', tabIds: [] }]; // Empty tabIds means "all tabs"
  } catch {
    return [{ id: 'all', name: 'All', tabIds: [] }];
  }
};

// Save presets to localStorage
const savePresets = (presets) => {
  try {
    localStorage.setItem('tabPresets', JSON.stringify(presets));
  } catch (error) {
    console.error('Failed to save presets:', error);
  }
};

const useTabPresetStore = create((set, get) => ({
  presets: loadPresets(),
  activePresetId: 'all',
  
  setActivePreset: (presetId) => {
    set({ activePresetId: presetId });
    try {
      localStorage.setItem('activePresetId', presetId);
    } catch (error) {
      console.error('Failed to save active preset:', error);
    }
  },
  
  createPreset: (name, tabIds) => {
    const state = get();
    const newPreset = {
      id: `preset-${Date.now()}`,
      name: name || `Preset ${state.presets.length}`,
      tabIds: tabIds || [],
    };
    const updatedPresets = [...state.presets, newPreset];
    savePresets(updatedPresets);
    set({ presets: updatedPresets, activePresetId: newPreset.id });
    return newPreset.id;
  },
  
  deletePreset: (presetId) => {
    if (presetId === 'all') return; // Can't delete "All" preset
    const state = get();
    const updatedPresets = state.presets.filter(preset => preset.id !== presetId);
    savePresets(updatedPresets);
    const newActivePresetId = state.activePresetId === presetId ? 'all' : state.activePresetId;
    set({ presets: updatedPresets, activePresetId: newActivePresetId });
    try {
      localStorage.setItem('activePresetId', newActivePresetId);
    } catch (error) {
      console.error('Failed to save active preset:', error);
    }
  },
  
  updatePreset: (presetId, name, tabIds) => {
    if (presetId === 'all') return; // Can't update "All" preset
    const state = get();
    const updatedPresets = state.presets.map(preset => {
      if (preset.id === presetId) {
        return { ...preset, name: name || preset.name, tabIds: tabIds !== undefined ? tabIds : preset.tabIds };
      }
      return preset;
    });
    savePresets(updatedPresets);
    set({ presets: updatedPresets });
  },
}));

// Load active preset from localStorage on init
const loadActivePreset = () => {
  try {
    const stored = localStorage.getItem('activePresetId');
    return stored || 'all';
  } catch {
    return 'all';
  }
};

// Initialize active preset
const initialActivePreset = loadActivePreset();
if (initialActivePreset !== 'all') {
  useTabPresetStore.getState().setActivePreset(initialActivePreset);
}

export { useTabPresetStore };

