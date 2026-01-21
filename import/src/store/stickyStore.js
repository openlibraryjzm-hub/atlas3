import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Sticky Store - Persistent stickied videos per playlist
 * Stickied videos appear in a carousel at the top of the Videos page
 */
export const useStickyStore = create(
    persist(
        (set, get) => ({
            // Map of playlistId -> array of video IDs
            // structured as { [playlistId]: [videoId1, videoId2, ...] }
            stickiedVideos: {},

            /**
             * Helper to generate composite key
             */
            _getKey: (playlistId, folderId) => {
                const folderKey = folderId === null ? 'root' : folderId;
                return `${playlistId}::${folderKey}`;
            },

            /**
             * Toggle sticky status for a video in a specific playlist context (folder)
             * @param {string|number} playlistId - Playlist ID
             * @param {number} videoId - Video ID
             * @param {string|null} folderId - Folder ID (null for root/all, 'unsorted', or color)
             */
            toggleSticky: (playlistId, videoId, folderId = null) => {
                const state = get();
                const key = state._getKey(playlistId, folderId);
                const currentStickies = state.stickiedVideos[key] || [];
                const isStickied = currentStickies.includes(videoId);

                let newStickies;
                if (isStickied) {
                    // Unsticky
                    newStickies = currentStickies.filter(id => id !== videoId);
                } else {
                    // Sticky
                    newStickies = [...currentStickies, videoId];
                }

                set({
                    stickiedVideos: {
                        ...state.stickiedVideos,
                        [key]: newStickies,
                    },
                });
            },

            /**
             * Check if a video is stickied in a playlist context
             * @param {string|number} playlistId - Playlist ID
             * @param {number} videoId - Video ID
             * @param {string|null} folderId - Folder ID
             * @returns {boolean}
             */
            isStickied: (playlistId, videoId, folderId = null) => {
                const state = get();
                const key = state._getKey(playlistId, folderId);
                const stickies = state.stickiedVideos[key];
                return stickies ? stickies.includes(videoId) : false;
            },
        }),
        {
            name: 'sticky-storage', // unique name for localStorage
        }
    )
);
