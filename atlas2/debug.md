###7: Debugging/Testing Features

The Debugging/Testing Features provide visual aids for development and testing. Layout Debug Mode shows colored boundaries for all layout regions, while Inspect Element Mode displays user-friendly labels on interactive UI elements.

---

---

#### ### 7.0 Dev Toolbar

**1: User-Perspective Description**

The Dev Toolbar is a floating control bar maintained in `App.jsx` that serves as the central hub for development and testing tools. It contains:

- **View Mode Buttons**: Full, Half, Quarter
- **Menu Quarter Toggle**: Toggles side menu position
- **Debug Toggles**: Debug, Inspect, Ruler
- **Menu Toggle**: Toggles Radial Menu

**Visibility Control**:
- The toolbar itself can be hidden/shown via the **More Options** (3-dot) menu in the PlayerController.
- This allows for a cleaner UI when not actively developing or debugging.
- State is managed via `layoutStore.showDevToolbar`.

#### ### 7.1 Layout Debug Mode

**1: User-Perspective Description**

Users see colored borders and labels around all layout regions when debug mode is enabled:

- **Debug Toggle Button**: Blue button in the Dev Toolbar labeled "Debug"
  - Active state: Blue background with white text
  - Inactive state: Transparent background with border
  - Clicking toggles debug mode on/off

- **Colored Boundaries**: Each layout region displays with:
  - **6px solid border** in region-specific color
  - **2px white outline** for visibility
  - **Semi-transparent background** matching border color
  - **Label badge** in top-left corner showing region name

- **Region Colors**:
  - **Top Controller**: Blue (`#3b82f6`) - PlayerController area
  - **Main Player**: Green (`#22c55e`) - Main video player area
  - **Second Player**: Amber/Yellow (`#fbbf24`) - Secondary player overlay
  - **Side Menu**: Orange (`#f97316`) - Right side menu container
  - **Mini Header**: Purple (`#a855f7`) - Navigation bar area
  - **Side Menu Content**: Pink (`#ec4899`) - Page content area
  - **Spacer**: Gray (`#6b7280`) - Empty spacer areas (quarter mode)
  - **Menu Spacer**: Gray (`#6b7280`) - Menu quarter mode spacer
  - **Animated Menu**: Emerald (`#10b981`) - Radial menu area

- **Label Badges**: Each region shows a label badge:
  - Black background with white text
  - Monospace font, uppercase text
  - Positioned at top-left corner (4px offset)
  - Shows region name (e.g., "TOP CONTROLLER", "MAIN PLAYER")
  - Z-index 10000 to appear above all content

- **Content Hiding**: When debug mode is active:
  - Actual content is hidden (`!showDebugBounds` condition)
  - Only boundaries and labels are visible
  - Placeholder text may appear for empty regions
  - Helps visualize layout structure without content interference

- **Visibility**: Debug bounds are always visible when enabled:
  - `overflow: visible` to show boundaries
  - `min-height: 80px` and `min-width: 100px` to ensure visibility
  - `display: block` and `visibility: visible` enforced
  - Works in all view modes (full, half, quarter)

**2: File Manifest**

**UI/Components:**
- `src/LayoutShell.jsx`: Applies debug bounds classes to layout regions
- `src/App.jsx`: Debug toggle button and state management
- `src/LayoutShell.css`: Debug bounds styling and color definitions

**State Management:**
- `src/store/layoutStore.js`:
  - `showDebugBounds`: Boolean for debug mode state
  - `toggleDebugBounds()`: Toggles debug mode on/off

**API/Bridge:**
- No API calls - client-side only

**Backend:**
- No database tables - UI state only

**3: The Logic & State Chain**

**Trigger → Action → Persistence Flow:**

1. **Debug Mode Toggle Flow:**
   - User clicks "Debug" button → `toggleDebugBounds()` (App.jsx line 328)
   - Updates state → `set({ showDebugBounds: !state.showDebugBounds })`
   - Logs to console → `console.log('Debug bounds toggled:', newValue)`
   - `LayoutShell` re-renders → Checks `showDebugBounds` from store
   - Applies debug classes → `debug-bounds` class added to regions
   - Content visibility toggles → `!showDebugBounds` condition hides/shows content

2. **Debug Bounds Application Flow:**
   - `LayoutShell` checks `showDebugBounds` → Reads from `useLayoutStore()`
   - For each layout region → Conditionally applies `debug-bounds` class:
     - Top Controller: `debug-bounds debug-bounds--top-controller`
     - Main Player: `debug-bounds debug-bounds--player`
     - Second Player: `debug-bounds debug-bounds--second-player`
     - Side Menu: `debug-bounds debug-bounds--side-menu`
     - Mini Header: `debug-bounds debug-bounds--mini-header`
     - Side Menu Content: `debug-bounds debug-bounds--side-menu-content`
     - Spacer: `debug-bounds debug-bounds--spacer`
     - Menu Spacer: `debug-bounds debug-bounds--menu-spacer`
   - CSS applies styling → Colored borders, backgrounds, labels appear

3. **Label Display Flow:**
   - Each region has `data-debug-label` attribute → Set in `LayoutShell.jsx`
   - CSS `::after` pseudo-element → `content: attr(data-debug-label)`
   - Label badge rendered → Positioned at top-left corner
   - Styling applied → Black background, white text, monospace font
   - Always visible → Z-index 10000 ensures visibility

4. **Content Hiding Flow:**
   - When `showDebugBounds` is true → Content conditionally hidden
   - `LayoutShell` checks condition → `{!showDebugBounds && <content />}`
   - Actual components hidden → Only boundaries visible
   - Placeholder text shown → For empty regions (e.g., "Second Player (no content)")

**Source of Truth:**
- `layoutStore.showDebugBounds` - Source of Truth for debug mode state

**State Dependencies:**
- When `showDebugBounds` changes → `LayoutShell` re-renders → Debug classes applied/removed
- When debug mode enabled → Content hidden → Only boundaries visible
- When debug mode disabled → Content shown → Boundaries hidden
- When view mode changes → Debug bounds adapt → Regions resize but remain visible

---

#### ### 7.2 Inspect Element Mode

**1: User-Perspective Description**

Users see tooltip labels on interactive UI elements when inspect mode is enabled:

- **Inspect Toggle Button**: Purple button in the Dev Toolbar labeled "Inspect"
  - Active state: Purple background (`#8b5cf6`) with white text
  - Inactive state: Transparent background with purple border
  - Clicking toggles inspect mode on/off

- **Tooltip Labels**: When inspect mode is active, hovering over interactive elements shows:
  - **User-friendly names** instead of technical DOM names
  - Examples:
    - "Play video" (instead of "button" or "svg")
    - "Pin video" (instead of "pin-icon")
    - "Add playlists to tab" (instead of "add-button")
    - "Preview playlist" (instead of "eye-icon")
  - Labels appear in browser tooltip (via `title` attribute)
  - Only visible when hovering over elements

- **Labeled Components**: Inspect labels are integrated across major components:
  - **PlayerController**: All buttons (playlist/video navigation, shuffle, star, like, mode switcher)
  - **PlaylistsPage**: Playlist cards, preview buttons, menu options
  - **VideosPage**: Video cards, bulk tag buttons, sort dropdown
  - **VideoCard**: Pin icons, quick actions (star), play buttons
  - **FolderSelector**: Folder color dots (16 colors + "All")
  - **TabBar**: Tab buttons, add/delete buttons
  - **HistoryPage**: History video cards, play buttons
  - **CardMenu**: 3-dot menu buttons
  - **TopNavigation**: Tab buttons (Playlists, Videos, History)

- **Excluded Components**: Radial menu explicitly excluded from labeling (per design decision)

- **Conditional Display**: Labels only appear when inspect mode is enabled:
  - `title` attribute set to label when `inspectMode === true`
  - `title` attribute set to `undefined` when `inspectMode === false`
  - Browser tooltip only shows when `title` is defined

**2: File Manifest**

**UI/Components:**
- `src/utils/inspectLabels.js`: Utility functions for inspect labels
- All major components use inspect labels:
  - `src/components/PlayerController.jsx`
  - `src/components/PlaylistsPage.jsx`
  - `src/components/VideosPage.jsx`
  - `src/components/VideoCard.jsx`
  - `src/components/FolderSelector.jsx`
  - `src/components/TabBar.jsx`
  - `src/components/HistoryPage.jsx`
  - `src/components/CardMenu.jsx`
  - `src/components/TopNavigation.jsx`
  - `src/components/CardActions.jsx`
- `src/App.jsx`: Inspect toggle button

**State Management:**
- `src/store/layoutStore.js`:
  - `inspectMode`: Boolean for inspect mode state
  - `toggleInspectMode()`: Toggles inspect mode on/off

**API/Bridge:**
- No API calls - client-side only

**Backend:**
- No database tables - UI state only

**3: The Logic & State Chain**

**Trigger → Action → Persistence Flow:**

1. **Inspect Mode Toggle Flow:**
   - User clicks "Inspect" button → `toggleInspectMode()` (App.jsx line 344)
   - Updates state → `set({ inspectMode: !state.inspectMode })`
   - Logs to console → `console.log('Inspect mode toggled:', newValue)`
   - All components re-render → Check `inspectMode` from store
   - Labels conditionally applied → `title` attributes updated

2. **Label Application Flow:**
   - Component uses inspect label → Calls `getInspectTitle(label)` or `useInspectLabel(label)`
   - `getInspectTitle()` checks `inspectMode` → Returns label if true, `undefined` if false
   - `useInspectLabel()` hook → Reads `inspectMode` from `useLayoutStore()`
   - Returns label or undefined → Based on inspect mode state
   - Component sets `title` attribute → `title={getInspectTitle('Play video')}`
   - Browser shows tooltip → Only when `title` is defined (inspect mode on)

3. **Label Helper Functions:**
   - **`useInspectLabel(label)`** (inspectLabels.js line 8):
     - React hook for use in components
     - Reads `inspectMode` from `useLayoutStore()`
     - Returns label if `inspectMode === true`, `undefined` otherwise
   - **`getInspectLabel(inspectMode, label)`** (inspectLabels.js line 16):
     - Helper function for use outside React components
     - Takes `inspectMode` as parameter
     - Returns label if `inspectMode === true`, `undefined` otherwise
   - **`getInspectTitle(label)`** (component-level helper):
     - Defined in each component: `const getInspectTitle = (label) => inspectMode ? label : undefined`
     - Uses component's `inspectMode` from `useLayoutStore()`
     - Returns label or undefined

4. **Component Integration Flow:**
   - Component imports `useLayoutStore` → Gets `inspectMode` state
   - Defines helper → `const getInspectTitle = (label) => inspectMode ? label : undefined`
   - Applies to interactive elements → `title={getInspectTitle('User-friendly name')}`
   - When inspect mode on → Tooltip shows on hover
   - When inspect mode off → No tooltip (title is undefined)

5. **Label Naming Convention:**
   - Labels use user-friendly names → "Play video" not "playButton"
   - Descriptive actions → "Add playlists to tab" not "addButton"
   - Context-aware → "Pin video" not just "Pin"
   - Consistent format → Action + object (e.g., "Delete playlist", "Shuffle playlist")

**Source of Truth:**
- `layoutStore.inspectMode` - Source of Truth for inspect mode state

**State Dependencies:**
- When `inspectMode` changes → All components re-render → Labels appear/disappear
- When inspect mode enabled → `title` attributes set → Tooltips show on hover
- When inspect mode disabled → `title` attributes undefined → No tooltips
- When component mounts → Checks `inspectMode` → Applies labels if enabled

---

#### ### 7.3 Ruler Overlay (Non-Functional)

**Status**: ⚠️ **NON-FUNCTIONAL** - Component exists but ruler lines do not render

**1: User-Perspective Description**

A ruler overlay feature was implemented to provide pixel measurements for the main player area, intended to help with precise positioning and sizing of the video player. However, the feature is currently non-functional - the toggle button works and state changes correctly, but the ruler lines do not appear on screen.

**Intended Functionality:**
- **Ruler Toggle Button**: Red button in the Dev Toolbar labeled "Ruler"
  - Active state: Red background (`#ef4444`) with white text
  - Inactive state: Transparent background with red border
  - Clicking toggles ruler overlay on/off
  - Button is functional and state toggles correctly

- **Ruler Display** (intended but not working):
  - Horizontal ruler along top edge of main player area
  - Vertical ruler along left edge of main player area
  - Red tick marks every 50px with labels every 200px
  - Dimension labels showing width and height in pixels
  - View mode indicator in corner

**Current Behavior:**
- Toggle button appears and functions correctly
- State (`showRuler`) toggles properly in `layoutStore`
- Component (`DebugRuler`) renders when `showRuler` is true
- Component attempts to find `.layout-shell__player` element
- Ruler lines and measurements do not appear on screen
- Status box may appear if dimensions are 0, but ruler visualization fails

**2: File Manifest**

**UI/Components:**
- `src/components/DebugRuler.jsx`: Ruler overlay component (non-functional)
- `src/LayoutShell.jsx`: Renders `DebugRuler` when `showRuler` is true
- `src/App.jsx`: Ruler toggle button

**State Management:**
- `src/store/layoutStore.js`:
  - `showRuler`: Boolean for ruler overlay state
  - `toggleRuler()`: Toggles ruler overlay on/off

**API/Bridge:**
- No API calls - client-side only

**Backend:**
- No database tables - UI state only

**3: The Logic & State Chain**

**Trigger → Action → Persistence Flow:**

1. **Ruler Toggle Flow:**
   - User clicks "Ruler" button → `toggleRuler()` (App.jsx)
   - Updates state → `set({ showRuler: !state.showRuler })`
   - Logs to console → `console.log('Ruler toggled:', newValue)`
   - `LayoutShell` re-renders → Checks `showRuler` from store
   - Conditionally renders → `{showRuler && <DebugRuler />}`

2. **Ruler Component Flow:**
   - `DebugRuler` component mounts → Reads `showRuler` from store
   - `useEffect` runs → Attempts to find `.layout-shell__player` element
   - Uses `ResizeObserver` → Observes player element for size changes
   - Calculates dimensions → Gets `getBoundingClientRect()` of player element
   - Sets state → `setDimensions({ width, height, top, left })`
   - **Issue**: Ruler lines do not render despite dimensions being calculated

3. **Rendering Flow (Intended):**
   - If dimensions are 0 → Shows status box with diagnostic info
   - If dimensions are valid → Should render horizontal and vertical rulers
   - Rulers positioned using `position: fixed` with calculated `top` and `left`
   - Tick marks generated every 50px, labels every 200px
   - **Issue**: Ruler visualization fails to appear even when dimensions are valid

**Known Issues:**
- Component renders but ruler lines do not appear
- Element selector (`.layout-shell__player`) may not be finding the element correctly
- Dimensions may be calculated but ruler positioning/rendering fails
- Z-index or CSS positioning issues may prevent visibility
- Status box may appear but full ruler visualization does not

**Source of Truth:**
- `layoutStore.showRuler` - Source of Truth for ruler overlay state

**State Dependencies:**
- When `showRuler` changes → `LayoutShell` re-renders → `DebugRuler` conditionally renders
- When ruler enabled → Component mounts → Attempts to find and measure player element
- When ruler disabled → Component unmounts → Cleanup runs
- **Issue**: Despite correct state flow, visual output does not appear

**Note**: This feature was implemented to assist with video player sizing and positioning, but is currently non-functional. The infrastructure exists but requires debugging to identify why the ruler visualization does not render.