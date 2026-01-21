import { useLayoutStore } from '../store/layoutStore';

/**
 * Hook to get inspect label for an element
 * Returns the label if inspect mode is enabled, otherwise returns undefined
 * This allows components to use title attributes conditionally
 */
export const useInspectLabel = (label) => {
  const { inspectMode } = useLayoutStore();
  return inspectMode ? label : undefined;
};

/**
 * Helper function to get inspect label (for use outside React components)
 */
export const getInspectLabel = (inspectMode, label) => {
  return inspectMode ? label : undefined;
};

