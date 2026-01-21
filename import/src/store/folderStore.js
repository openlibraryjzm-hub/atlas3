import { create } from 'zustand';
import { FOLDER_COLORS } from '../utils/folderColors';

// Load quick assign folder from localStorage
const loadQuickAssignFolder = () => {
  try {
    const stored = localStorage.getItem('quickAssignFolder');
    return stored || FOLDER_COLORS[0].id; // Default to first color (red) if not set
  } catch {
    return FOLDER_COLORS[0].id;
  }
};

// Save quick assign folder to localStorage
const saveQuickAssignFolder = (folderId) => {
  try {
    localStorage.setItem('quickAssignFolder', folderId);
  } catch (error) {
    console.error('Failed to save quick assign folder:', error);
  }
};

const useFolderStore = create((set) => ({
  selectedFolder: null, // null means "all videos", otherwise a color id
  setSelectedFolder: (folder) => set({ selectedFolder: folder }),
  
  // Quick assign folder preference (defaults to first color)
  quickAssignFolder: loadQuickAssignFolder(),
  setQuickAssignFolder: (folderId) => {
    saveQuickAssignFolder(folderId);
    set({ quickAssignFolder: folderId });
  },
  
  // Map of item_id -> array of folder colors
  videoFolderAssignments: {},
  
  // Set folder assignments for a video
  setVideoFolders: (itemId, folders) => set((state) => ({
    videoFolderAssignments: {
      ...state.videoFolderAssignments,
      [itemId]: folders,
    },
  })),
  
  // Load folder assignments for multiple videos
  loadVideoFolders: (assignments) => {
    const map = {};
    Object.entries(assignments).forEach(([itemId, folders]) => {
      map[itemId] = folders;
    });
    set({ videoFolderAssignments: map });
  },
  
  // Clear all assignments
  clearAssignments: () => set({ videoFolderAssignments: {} }),
  
  // Show colored folders in playlist menu
  showColoredFolders: false,
  setShowColoredFolders: (enabled) => set({ showColoredFolders: enabled }),
  
  // Bulk tag mode
  bulkTagMode: false,
  setBulkTagMode: (enabled) => set({ bulkTagMode: enabled }),
  
  // Bulk tag selections: Map of videoId -> Set of folder colors
  bulkTagSelections: {},
  addBulkTagSelection: (videoId, folderColor) => set((state) => {
    const current = state.bulkTagSelections[videoId] || new Set();
    const updated = new Set(current);
    updated.add(folderColor);
    return {
      bulkTagSelections: {
        ...state.bulkTagSelections,
        [videoId]: updated,
      },
    };
  }),
  removeBulkTagSelection: (videoId, folderColor) => set((state) => {
    const current = state.bulkTagSelections[videoId];
    if (!current) return state;
    const updated = new Set(current);
    updated.delete(folderColor);
    if (updated.size === 0) {
      const { [videoId]: _, ...rest } = state.bulkTagSelections;
      return { bulkTagSelections: rest };
    }
    return {
      bulkTagSelections: {
        ...state.bulkTagSelections,
        [videoId]: updated,
      },
    };
  }),
  toggleBulkTagSelection: (videoId, folderColor) => set((state) => {
    const current = state.bulkTagSelections[videoId] || new Set();
    const hasSelection = current.has(folderColor);
    if (hasSelection) {
      const updated = new Set(current);
      updated.delete(folderColor);
      if (updated.size === 0) {
        const { [videoId]: _, ...rest } = state.bulkTagSelections;
        return { bulkTagSelections: rest };
      }
      return {
        bulkTagSelections: {
          ...state.bulkTagSelections,
          [videoId]: updated,
        },
      };
    } else {
      const updated = new Set(current);
      updated.add(folderColor);
      return {
        bulkTagSelections: {
          ...state.bulkTagSelections,
          [videoId]: updated,
        },
      };
    }
  }),
  clearBulkTagSelections: () => set({ bulkTagSelections: {} }),
}));

export { useFolderStore };

