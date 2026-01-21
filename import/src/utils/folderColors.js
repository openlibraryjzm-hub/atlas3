// 16 distinct colors for folder system
export const FOLDER_COLORS = [
  { id: 'red', name: 'Red', hex: '#ef4444', rgb: 'rgb(239, 68, 68)' },
  { id: 'orange', name: 'Orange', hex: '#f97316', rgb: 'rgb(249, 115, 22)' },
  { id: 'amber', name: 'Amber', hex: '#f59e0b', rgb: 'rgb(245, 158, 11)' },
  { id: 'yellow', name: 'Yellow', hex: '#eab308', rgb: 'rgb(234, 179, 8)' },
  { id: 'lime', name: 'Lime', hex: '#84cc16', rgb: 'rgb(132, 204, 22)' },
  { id: 'green', name: 'Green', hex: '#22c55e', rgb: 'rgb(34, 197, 94)' },
  { id: 'emerald', name: 'Emerald', hex: '#10b981', rgb: 'rgb(16, 185, 129)' },
  { id: 'teal', name: 'Teal', hex: '#14b8a6', rgb: 'rgb(20, 184, 166)' },
  { id: 'cyan', name: 'Cyan', hex: '#06b6d4', rgb: 'rgb(6, 182, 212)' },
  { id: 'sky', name: 'Sky', hex: '#0ea5e9', rgb: 'rgb(14, 165, 233)' },
  { id: 'blue', name: 'Blue', hex: '#3b82f6', rgb: 'rgb(59, 130, 246)' },
  { id: 'indigo', name: 'Indigo', hex: '#6366f1', rgb: 'rgb(99, 102, 241)' },
  { id: 'violet', name: 'Violet', hex: '#8b5cf6', rgb: 'rgb(139, 92, 246)' },
  { id: 'purple', name: 'Purple', hex: '#a855f7', rgb: 'rgb(168, 85, 247)' },
  { id: 'fuchsia', name: 'Fuchsia', hex: '#d946ef', rgb: 'rgb(217, 70, 239)' },
  { id: 'pink', name: 'Pink', hex: '#ec4899', rgb: 'rgb(236, 72, 153)' },
];

export const getFolderColorById = (id) => {
  return FOLDER_COLORS.find(color => color.id === id) || FOLDER_COLORS[0];
};

