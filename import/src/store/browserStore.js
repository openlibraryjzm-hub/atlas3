import { create } from 'zustand';

/**
 * Browser Store - Manages browser visibility state
 * This store tracks whether the browser (Layer 2) is visible,
 * and coordinates with the video app (Layer 1) to create the illusion
 * that the browser is just another page in the app.
 */
const useBrowserStore = create((set) => ({
    // Browser visibility state
    isBrowserVisible: false,

    // Show the browser (hides video app UI)
    showBrowser: () => set({ isBrowserVisible: true }),

    // Hide the browser (shows video app UI)
    hideBrowser: () => set({ isBrowserVisible: false }),

    // Toggle browser visibility
    toggleBrowser: () => set((state) => ({ isBrowserVisible: !state.isBrowserVisible })),
}));

export default useBrowserStore;
