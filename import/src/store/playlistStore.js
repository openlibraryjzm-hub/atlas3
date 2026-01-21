import { create } from 'zustand';

export const usePlaylistStore = create((set, get) => ({
  showPlaylists: false,
  currentPlaylistItems: [],
  currentPlaylistId: null,
  currentVideoIndex: 0,

  // Playlist navigation
  allPlaylists: [],
  currentPlaylistIndex: -1,

  // Hierarchical navigation: flat list of playlists and their folders
  // Structure: [Playlist1, Playlist1-FolderA, Playlist1-FolderB, Playlist2, Playlist2-FolderA, ...]
  navigationItems: [], // Array of { type: 'playlist' | 'folder', data: Playlist | FolderWithVideos }
  currentNavigationIndex: -1, // Index in navigationItems array
  currentFolder: null, // { playlist_id, folder_color } or null
  currentPlaylistTitle: null, // Explicit title for fallback when navigation items are out of sync

  setShowPlaylists: (show) => set({ showPlaylists: show }),

  setPlaylistItems: (items, playlistId = null, folderInfo = null, playlistTitle = null) => {
    // folderInfo is { playlist_id, folder_color } or null
    const state = get();
    let newIndex = state.currentPlaylistIndex;
    let videoIndex = 0;

    // Determine playlist title logic
    let finalTitle = playlistTitle;

    // If no title provided, try to find it in allPlaylists
    if (!finalTitle && playlistId && state.allPlaylists.length > 0) {
      const p = state.allPlaylists.find(p => p.id === playlistId);
      if (p) {
        finalTitle = p.name;
      }
    }

    // If still no title and we are staying on the same playlist, preserve the existing title logic
    if (!finalTitle && state.currentPlaylistId && String(playlistId) === String(state.currentPlaylistId)) {
      finalTitle = state.currentPlaylistTitle;
    }

    // Update current playlist index if we have a playlist ID and it's not a folder
    if (playlistId && !folderInfo && state.allPlaylists.length > 0) {
      const index = state.allPlaylists.findIndex(p => p.id === playlistId);
      if (index >= 0) {
        newIndex = index;
      }
    }

    // Check if there's a shuffled order stored
    if (playlistId && items.length > 0) {
      try {
        const shuffledOrder = localStorage.getItem(`shuffled_order_${playlistId}`);
        if (shuffledOrder) {
          const shuffledIds = JSON.parse(shuffledOrder);
          // Reorder items to match shuffled order
          const itemMap = new Map(items.map(item => [item.id, item]));
          const reordered = shuffledIds
            .map(id => itemMap.get(id))
            .filter(Boolean);

          // Add any new items that weren't in the shuffled order
          const existingIds = new Set(shuffledIds);
          const newItems = items.filter(item => !existingIds.has(item.id));
          const finalItems = [...reordered, ...newItems];

          // Restore last video index
          const storedIndex = localStorage.getItem(`last_video_index_${playlistId}`);
          if (storedIndex !== null) {
            const parsedIndex = parseInt(storedIndex, 10);
            if (parsedIndex >= 0 && parsedIndex < finalItems.length) {
              videoIndex = parsedIndex;
            }
          }

          // Update navigation index
          let navIndex = -1;
          if (playlistId) {
            navIndex = state.navigationItems.findIndex(item =>
              item.type === 'playlist' &&
              item.data.id === playlistId
            );
          }

          set({
            currentPlaylistItems: finalItems,
            currentPlaylistId: playlistId,
            currentVideoIndex: videoIndex,
            currentPlaylistIndex: newIndex,
            currentFolder: null,
            currentNavigationIndex: navIndex,
            currentNavigationIndex: navIndex,
            currentPlaylistTitle: finalTitle,
          });
          return;
        }
      } catch (error) {
        console.error('Failed to load shuffled order:', error);
      }
    }

    // Restore last video index for this playlist if available (non-shuffled)
    if (playlistId && items.length > 0) {
      try {
        const storedIndex = localStorage.getItem(`last_video_index_${playlistId}`);
        if (storedIndex !== null) {
          const parsedIndex = parseInt(storedIndex, 10);
          if (parsedIndex >= 0 && parsedIndex < items.length) {
            videoIndex = parsedIndex;
          }
        }
      } catch (error) {
        console.error('Failed to load last video index:', error);
      }
    }

    // Update navigation index based on what we're loading
    let navIndex = -1;
    if (folderInfo) {
      // Find folder in navigation items
      navIndex = state.navigationItems.findIndex(item =>
        item.type === 'folder' &&
        item.data.playlist_id === folderInfo.playlist_id &&
        item.data.folder_color === folderInfo.folder_color
      );
    } else if (playlistId) {
      // Find playlist in navigation items
      navIndex = state.navigationItems.findIndex(item =>
        item.type === 'playlist' &&
        item.data.id === playlistId
      );
    }

    set({
      currentPlaylistItems: items,
      currentPlaylistId: playlistId,
      currentVideoIndex: videoIndex,
      currentPlaylistIndex: newIndex,
      currentFolder: folderInfo || null,
      currentNavigationIndex: navIndex,
      currentNavigationIndex: navIndex,
      currentPlaylistTitle: finalTitle,
    });
  },

  setAllPlaylists: (playlists) => {
    set({ allPlaylists: playlists });
    // Update current playlist index if we have a current playlist ID
    const state = get();
    if (state.currentPlaylistId && playlists.length > 0) {
      const index = playlists.findIndex(p => p.id === state.currentPlaylistId);
      if (index >= 0) {
        set({ currentPlaylistIndex: index });
      }
    }
  },

  // Build hierarchical navigation list: playlists with their folders interleaved
  buildNavigationItems: (playlists, folders) => {
    const items = [];
    const foldersByPlaylist = new Map();

    // Group folders by playlist_id
    folders.forEach(folder => {
      if (!foldersByPlaylist.has(folder.playlist_id)) {
        foldersByPlaylist.set(folder.playlist_id, []);
      }
      foldersByPlaylist.get(folder.playlist_id).push(folder);
    });

    // Sort folders by folder_color for consistent ordering
    foldersByPlaylist.forEach((folderList, playlistId) => {
      folderList.sort((a, b) => a.folder_color.localeCompare(b.folder_color));
    });

    // Build flat list: playlist followed by its folders
    playlists.forEach(playlist => {
      // Add the playlist
      items.push({ type: 'playlist', data: playlist });

      // Add its folders (if any)
      const playlistFolders = foldersByPlaylist.get(playlist.id) || [];
      playlistFolders.forEach(folder => {
        items.push({ type: 'folder', data: folder });
      });
    });

    return items;
  },

  setNavigationItems: (items) => {
    set({ navigationItems: items });
    // Update current navigation index based on current state
    const state = get();
    console.log('[DEBUG_FLAG] setNavigationItems:', { count: items.length, currentCtxt: state.currentPlaylistId });
    if (state.currentFolder) {
      // Find folder in navigation items
      const index = items.findIndex(item =>
        item.type === 'folder' &&
        item.data.playlist_id === state.currentFolder.playlist_id &&
        item.data.folder_color === state.currentFolder.folder_color
      );
      if (index >= 0) {
        set({ currentNavigationIndex: index });
        console.log('[DEBUG_FLAG] setNavigationItems matched folder at', index);
        return;
      }
    }
    if (state.currentPlaylistId) {
      // Find playlist in navigation items
      const index = items.findIndex(item =>
        item.type === 'playlist' &&
        item.data.id === state.currentPlaylistId
      );
      if (index >= 0) {
        set({ currentNavigationIndex: index });
        console.log('[DEBUG_FLAG] setNavigationItems matched playlist at', index);
        return;
      }
    }
    // If no match, reset index
    console.log('[DEBUG_FLAG] setNavigationItems no match, reset index');
    set({ currentNavigationIndex: -1 });
  },

  setCurrentFolder: (folder) => {
    // folder is { playlist_id, folder_color } or null
    set({ currentFolder: folder });
  },

  setCurrentVideoIndex: (index) => {
    const state = get();
    set({ currentVideoIndex: index });

    // Save last video index for current playlist
    if (state.currentPlaylistId) {
      try {
        localStorage.setItem(`last_video_index_${state.currentPlaylistId}`, index.toString());
      } catch (error) {
        console.error('Failed to save last video index:', error);
      }
    }
  },

  getCurrentVideo: () => {
    const state = get();
    if (state.currentPlaylistItems.length === 0) return null;
    return state.currentPlaylistItems[state.currentVideoIndex] || state.currentPlaylistItems[0];
  },

  nextVideo: () => {
    const state = get();
    if (state.currentPlaylistItems.length === 0) return;
    const nextIndex = (state.currentVideoIndex + 1) % state.currentPlaylistItems.length;
    set({ currentVideoIndex: nextIndex });

    // Save last video index for current playlist
    if (state.currentPlaylistId) {
      try {
        localStorage.setItem(`last_video_index_${state.currentPlaylistId}`, nextIndex.toString());
      } catch (error) {
        console.error('Failed to save last video index:', error);
      }
    }
  },

  previousVideo: () => {
    const state = get();
    if (state.currentPlaylistItems.length === 0) return;
    const prevIndex = state.currentVideoIndex === 0
      ? state.currentPlaylistItems.length - 1
      : state.currentVideoIndex - 1;
    set({ currentVideoIndex: prevIndex });

    // Save last video index for current playlist
    if (state.currentPlaylistId) {
      try {
        localStorage.setItem(`last_video_index_${state.currentPlaylistId}`, prevIndex.toString());
      } catch (error) {
        console.error('Failed to save last video index:', error);
      }
    }
  },

  // Playlist navigation functions (hierarchical: playlist -> its folders -> next playlist)
  // Returns { type: 'playlist' | 'folder', data: ... } or null
  nextPlaylist: () => {
    const state = get();
    if (state.navigationItems.length === 0) return null;

    const nextIndex = state.currentNavigationIndex < 0
      ? 0
      : (state.currentNavigationIndex + 1) % state.navigationItems.length;

    console.log('[DEBUG_FLAG] nextPlaylist Trace:', {
      currentIndex: state.currentNavigationIndex,
      nextIndex: nextIndex,
      totalItems: state.navigationItems.length,
      nextItemType: state.navigationItems[nextIndex]?.type
    });

    const nextItem = state.navigationItems[nextIndex];
    if (!nextItem) return null;

    // Update state based on item type
    if (nextItem.type === 'playlist') {
      set({
        currentNavigationIndex: nextIndex,
        currentPlaylistIndex: state.allPlaylists.findIndex(p => p.id === nextItem.data.id),
        currentFolder: null,
      });
    } else {
      set({
        currentNavigationIndex: nextIndex,
        currentPlaylistIndex: -1,
        currentFolder: {
          playlist_id: nextItem.data.playlist_id,
          folder_color: nextItem.data.folder_color
        },
      });
    }

    return nextItem;
  },

  previousPlaylist: () => {
    const state = get();
    if (state.navigationItems.length === 0) return null;

    const prevIndex = state.currentNavigationIndex <= 0
      ? state.navigationItems.length - 1
      : state.currentNavigationIndex - 1;

    const prevItem = state.navigationItems[prevIndex];
    if (!prevItem) return null;

    // Update state based on item type
    if (prevItem.type === 'playlist') {
      set({
        currentNavigationIndex: prevIndex,
        currentPlaylistIndex: state.allPlaylists.findIndex(p => p.id === prevItem.data.id),
        currentFolder: null,
      });
    } else {
      set({
        currentNavigationIndex: prevIndex,
        currentPlaylistIndex: -1,
        currentFolder: {
          playlist_id: prevItem.data.playlist_id,
          folder_color: prevItem.data.folder_color
        },
      });
    }

    return prevItem;
  },

  // Shuffle playlist items
  shufflePlaylist: () => {
    const state = get();
    if (state.currentPlaylistItems.length === 0) return;

    // Create a shuffled copy of the items
    const shuffled = [...state.currentPlaylistItems];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Select a random video from the shuffled list
    const randomIndex = Math.floor(Math.random() * shuffled.length);

    set({
      currentPlaylistItems: shuffled,
      currentVideoIndex: randomIndex,
    });

    // Save the shuffled order and new index
    if (state.currentPlaylistId) {
      try {
        localStorage.setItem(`last_video_index_${state.currentPlaylistId}`, randomIndex.toString());
        localStorage.setItem(`shuffled_order_${state.currentPlaylistId}`, JSON.stringify(shuffled.map(item => item.id)));
      } catch (error) {
        console.error('Failed to save shuffled order:', error);
      }
    }

    return shuffled[randomIndex];
  },

  // Preview state - for previewing playlists without changing the actual player
  previewPlaylistItems: null,
  previewPlaylistId: null,
  previewFolderInfo: null,

  setPreviewPlaylist: (items, playlistId, folderInfo = null) => {
    set({
      previewPlaylistItems: items,
      previewPlaylistId: playlistId,
      previewFolderInfo: folderInfo,
    });
  },

  clearPreview: () => {
    set({
      previewPlaylistItems: null,
      previewPlaylistId: null,
      previewFolderInfo: null,
    });
  },
}));

