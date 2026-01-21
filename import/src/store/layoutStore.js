import { create } from 'zustand';

export const useLayoutStore = create((set) => ({
  viewMode: 'full', // 'full' | 'half' | 'quarter'
  menuQuarterMode: false, // Menu docked in bottom-right
  showDebugBounds: false, // Visual debug mode for layout bounds
  inspectMode: false, // Inspect element mode for showing UI labels
  showRuler: false, // Ruler overlay for measurements
  showDevToolbar: true, // Visibility of the floating dev toolbar (full/half/quarter/etc buttons)

  setViewMode: (mode) => {
    if (['full', 'half', 'quarter'].includes(mode)) {
      set({ viewMode: mode });
      // Disable menu quarter mode when switching to full screen
      if (mode === 'full') {
        set({ menuQuarterMode: false });
      }
    }
  },

  toggleMenuQuarterMode: () => set((state) => {
    // Only allow toggling when not in full screen mode
    if (state.viewMode === 'full') return state;
    return { menuQuarterMode: !state.menuQuarterMode };
  }),

  toggleDebugBounds: () => set((state) => {
    const newValue = !state.showDebugBounds;
    console.log('Debug bounds toggled:', newValue);
    return { showDebugBounds: newValue };
  }),

  toggleInspectMode: () => set((state) => {
    const newValue = !state.inspectMode;
    console.log('Inspect mode toggled:', newValue);
    return { inspectMode: newValue };
  }),

  toggleRuler: () => set((state) => {
    const newValue = !state.showRuler;
    console.log('Ruler toggled:', newValue);
    return { showRuler: newValue };
  }),

  // Toggle visibility of the dev toolbar
  toggleDevToolbar: () => set((state) => ({ showDevToolbar: !state.showDevToolbar })),
}));

