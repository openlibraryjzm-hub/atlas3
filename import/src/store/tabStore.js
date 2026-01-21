import { create } from 'zustand';

// Load tabs from localStorage
const loadTabs = () => {
  try {
    const stored = localStorage.getItem('playlistTabs');
    if (stored) {
      return JSON.parse(stored);
    }
    // Default: just "All" tab
    return [{ id: 'all', name: 'All', playlistIds: [] }];
  } catch {
    return [{ id: 'all', name: 'All', playlistIds: [] }];
  }
};

// Save tabs to localStorage
const saveTabs = (tabs) => {
  try {
    localStorage.setItem('playlistTabs', JSON.stringify(tabs));
  } catch (error) {
    console.error('Failed to save tabs:', error);
  }
};

const useTabStore = create((set, get) => ({
  tabs: loadTabs(),
  activeTabId: 'all',

  setActiveTab: (tabId) => {
    set({ activeTabId: tabId });
    try {
      localStorage.setItem('activeTabId', tabId);
    } catch (error) {
      console.error('Failed to save active tab:', error);
    }
  },

  createTab: (name) => {
    const state = get();
    const newTab = {
      id: `tab-${Date.now()}`,
      name: name || `Tab ${state.tabs.length}`,
      playlistIds: [],
    };
    const updatedTabs = [...state.tabs, newTab];
    saveTabs(updatedTabs);
    set({ tabs: updatedTabs, activeTabId: newTab.id });
    return newTab.id;
  },

  deleteTab: (tabId) => {
    if (tabId === 'all') return; // Can't delete "All" tab
    const state = get();
    const updatedTabs = state.tabs.filter(tab => tab.id !== tabId);
    saveTabs(updatedTabs);
    const newActiveTabId = state.activeTabId === tabId ? 'all' : state.activeTabId;
    set({ tabs: updatedTabs, activeTabId: newActiveTabId });
    try {
      localStorage.setItem('activeTabId', newActiveTabId);
    } catch (error) {
      console.error('Failed to save active tab:', error);
    }
  },

  addPlaylistToTab: (tabId, playlistId) => {
    if (tabId === 'all') return; // Can't add to "All" tab
    const state = get();
    const updatedTabs = state.tabs.map(tab => {
      if (tab.id === tabId && !tab.playlistIds.some(id => String(id) === String(playlistId))) {
        return { ...tab, playlistIds: [...tab.playlistIds, playlistId] };
      }
      return tab;
    });
    saveTabs(updatedTabs);
    set({ tabs: updatedTabs });
  },

  removePlaylistFromTab: (tabId, playlistId) => {
    if (tabId === 'all') return; // Can't remove from "All" tab
    const state = get();
    const updatedTabs = state.tabs.map(tab => {
      if (tab.id === tabId) {
        return { ...tab, playlistIds: tab.playlistIds.filter(id => String(id) !== String(playlistId)) };
      }
      return tab;
    });
    saveTabs(updatedTabs);
    set({ tabs: updatedTabs });
  },

  renameTab: (tabId, newName) => {
    if (tabId === 'all') return; // Can't rename "All" tab
    const state = get();
    const updatedTabs = state.tabs.map(tab => {
      if (tab.id === tabId) {
        return { ...tab, name: newName };
      }
      return tab;
    });
    saveTabs(updatedTabs);
    set({ tabs: updatedTabs });
  },
}));

// Load active tab from localStorage on init
const loadActiveTab = () => {
  try {
    const stored = localStorage.getItem('activeTabId');
    return stored || 'all';
  } catch {
    return 'all';
  }
};

// Initialize active tab
const initialActiveTab = loadActiveTab();
if (initialActiveTab !== 'all') {
  useTabStore.getState().setActiveTab(initialActiveTab);
}

export { useTabStore };

