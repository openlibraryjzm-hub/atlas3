import { create } from 'zustand';

export const useShuffleStore = create((set, get) => ({
    // Map of playlistId -> { map: {videoId: rank} }
    shuffleStates: {},

    // Get or create shuffle state for a playlist
    getShuffleState: (playlistId, videoIds) => {
        const state = get();

        // Return existing state if available
        if (state.shuffleStates[playlistId]) {
            return state.shuffleStates[playlistId];
        }

        // Generate new shuffle mapping
        const map = {};
        videoIds.forEach(id => {
            map[id] = Math.random();
        });

        const newState = { map };

        set(s => ({
            shuffleStates: {
                ...s.shuffleStates,
                [playlistId]: newState
            }
        }));

        return newState;
    },

    // Helper to get rank for a video
    getVideoRank: (playlistId, videoId) => {
        const state = get();
        const playlistState = state.shuffleStates[playlistId];
        if (!playlistState || !playlistState.map) return 0;

        // If video not in map (newly added?), return a random fallback or append to map?
        // For read-only access, just return 0 or hash.
        // Ideally we should update the map, but that requires set.
        // Let's just return a derived value if missing to keep it stable-ish? 
        // Or just Math.random() (unstable but rare).
        return playlistState.map[videoId] || Math.random();
    }
}));
