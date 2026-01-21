import { create } from 'zustand';

export const useNavigationStore = create((set) => ({
  currentPage: 'playlists',
  history: [],
  setCurrentPage: (page) => set((state) => {
    // Don't modify history if staying on same page
    if (state.currentPage === page) return state;

    return {
      history: [...state.history, state.currentPage],
      currentPage: page
    };
  }),
  goBack: () => set((state) => {
    if (state.history.length === 0) return state;

    const previousPage = state.history[state.history.length - 1];
    const newHistory = state.history.slice(0, -1);

    return {
      currentPage: previousPage,
      history: newHistory
    };
  }),
}));

