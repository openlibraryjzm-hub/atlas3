# Session Updates: Playlist Banner Tabs Refinement
**Timestamp:** 14/01/2026 5:55pm

## Key Changes
1. **Playlist Page Banner Tabs**:
   - **Refactor**: Integrated **Tab Presets Dropdown** directly into the `TabBar` layout on the left side, physically replacing the removed "All" tab position.
   - **Logic Change**: Removed the explicit "All" tab button. The "All" state is now represented by having no specific tab selected.
   - **Toggle Behavior**: Clicking the currently active tab now toggles it off, returning to the "All" (default) state.
   - **UI Polish**: Styled the `TabPresetsDropdown` trigger button to match the circular aesthetic (`h-9`, `rounded-full`) of the sibling tabs for visual consistency.

---

# Session Updates: Scroll Controls & Playlist Refinement
**Timestamp:** 14/01/2026 5:43pm

## Key Changes
1. **Side Menu Scroll Controls (Top Nav Integration)**:
   - **Refactor**: Moved the scroll controls from the left margin into the **Top Navigation Bar** itself (Left of the Back Arrow).
   - **Layout**: Horizontal row (`Up` - `Dot` - `Down`).
   - **UI Polish**:
     - Increased the hit area of the central "Dot" button (8px padding) for easier interaction.
     - Dot button now attempts to scroll to the "Active" item (Playing Video or Active Playlist) when clicked.

2. **Active Playlist Visual State**:
   - **Experiment**: Attempted to add a "Warm Red Glow" to the currently playing playlist card (matching the video card aesthetic).
   - **Outcome**: The visual implementation on the inner thumbnail clashed with the outer card structure. Reverted visual changes but kept the underlying DOM markers (`active-playlist-marker`, `data-active-playlist`) to facilitate future scroll-to-active functionality.
   - **Current Status**: 
     - "Scroll to Active" works perfectly on **Videos Page** (Red Ring detection).
     - "Scroll to Active" currently **does not work** on **Playlists Page** (Pending visual/class confirmation).
     - Red Aura on active playlist card is currently **disabled/not working**.

---

# Session Updates: Side Menu Scroll Controls
**Timestamp:** 14/01/2026 5:05pm

## Key Changes
1. **Side Menu Scroll Controls**:
   - **Feature**: Added a "Side Menu Scroll Menu" component in the left margin of the side panel.
   - **Visuals**: Simple two-chevron design (Up/Down) with a central dot separator, fixed vertically in the center.
   - **Functionality**:
     - **Up Chevron**: Smoothly scrolls the active side menu page (Playlists, Videos, History, etc.) to the top.
     - **Down Chevron**: Smoothly scrolls to the bottom.
   - **Implementation**:
     - Created `SideMenuScrollControls.jsx` which dynamically locates the active scrollable container (`.overflow-y-auto`) within the side menu content.
     - Integrated into `LayoutShell.jsx` to ensure it appears on all side menu pages.
     - Positioned absolutely (`left: 6px`) to float within the page margins without overlapping content.

---

# Session Updates: Card Menu Positioning & Fixes
**Timestamp:** 14/01/2026 4:47pm

## Key Changes
1. **Card Menu Refactor**:
   - **Problem**: The 3-dot context menu on playlist cards was being cut off by parent overflow containers, failing to stick to the card during scrolling, and had broken click event propagation (buttons completely unresponsive).
   - **Solution**: 
     - Replaced the existing `CardMenu` with a **new, robust implementation** (`NewCardMenu.jsx`) using `ReactDOM.createPortal`.
     - **Fixed Positioning**: The menu now uses `position: fixed` relative to the viewport but listens to global `scroll` and `resize` events to "stick" visually to its trigger button.
     - **Event Handling**: Implemented rigorous `e.stopPropagation()` and `e.preventDefault()` on all menu items to ensure clicks are processed by the menu system and not captured by the underlying card navigation logic.
     - **Z-Index**: Tuned z-index to `30` to correctly layer above card content but below the Sticky Toolbar / Top Navigation.

2. **"Remove from Tab" Feature**:
   - **Feature**: Added a context-aware "Remove from Tab" option to the playlist card menu.
   - **Logic**: This option only appears when viewing a specific tab (not "All"). Clicking it instantly removes the playlist from the current tab via `useTabStore`.
   - **Type Safety**: Updated `tabStore.js` to strictly convert IDs to strings during comparisons, resolving "silent failure" bugs caused by number/string ID mismatches.

## Learnings
- **Portals & Scrolling**: When using Portals (`ReactDOM.createPortal`) for dropdowns inside scrollable containers, strictly calculating position on *every* scroll frame is necessary to keep the menu attached.
- **Event Propagation**: In complex nested cards (where the card itself is a clickable link), it is critical that interactive children (like menus) aggressively stop event propagation to prevent triggering parent navigation.
- **ID Mismatches**: Always normalize IDs (e.g., `String(id)`) in store logic when dealing with mixed-type sources (database integers vs. DOM/URL strings) to prevent logic failures.

---

# Session Updates: Video Card Interaction Refinement
**Timestamp:** 14/01/2026 12:48am

## Key Changes
1. **Video Card Cleanup**:
   - **Removed Hover Buttons**: Removed the Play button, Priority Pin button, and Pin/Bookmark button from the video thumbnail hover overlay to reduce visual clutter.
   - **Cleaned Up State**: Removed unused state logic and event handlers associated with these buttons (`isPriority`, `handlePinClick`, etc.).
   - **Updated Documentation**: Reflected these changes in `atlas/ui.md`.

---

# Session Updates: Sticky Toolbar & Video Aesthetics Refinement
**Timestamp:** 14/01/2026 12:26am

## Key Changes
1. **Banner & Sticky Toolbar**:
   - Refined `PageBanner.jsx` layout for cleaner vertical rhythm.
   - **Sticky Toolbar Redesign**:
     - Adjusted layout to be more compact.
     - **Color Bar Prism**: Transformed the folder selection dots into a continuous, flexible "prism bar" of colored rectangles.
     - **Video Counts**: Added video count numbers inside the colored rectangles (visible when count > 0).
     - **Interaction**: Selecting a folder replaces the count with a subtle white ring indicator.
   - Reordered toolbar elements for better UX (Sort -> Filter -> Colors).

2. **Video Card Aesthetics**:
   - **"Now Playing" Indicator**:
     - Replaced text badge with **3 animated bouncing dots** (Warm Red).
     - Added a **vibrant warm red glow** (`ring-red-500` + dual-layer shadow) around the active video thumbnail.
     - Added "bleed" effect where the red glow extends both outwards and inwards into the thumbnail.
   - **Watched Badge**: Simplified to a standalone green tick icon.
   - **Cleanups**: Removed the "#index" badge from bottom-left for a cleaner thumbnail view.

---

# Session Updates: Banner Layout Refinement
**Timestamp:** 13/01/26 - 11:15pm

## Key Changes
1. **Banner Layout Refinement**:
   - Refactored `PageBanner.jsx` to bottom-align content (`items-end`) instead of centered.
   - Adjusted padding (`pt-12 pb-20`) to create a shorter top visual profile while maintaining clearance for the Sticky Toolbar's negative margin overlap.

---

# Session Updates: Performance Optimization (Batch Fetching & Skeleton UI)
**Timestamp:** 13/01/26 - 10:54pm

## Key Accomplishments

1.  **Solved N+1 Bottleneck on Videos Page**
    *   **Problem**: Loading `VideosPage` caused 50+ individual IPC calls to fetch folder assignments for each video, causing UI stutter.
    *   **Solution**: Implemented `get_all_folder_assignments` batch command in Rust. Refactored `VideosPage.jsx` to fetch all assignments in a single async call.
    *   **Impact**: Drastically reduced IPC overhead. Page transition is now limited only by rendering speed.

2.  **Optimized Playlists Page Loading**
    *   **Problem**: Loading `PlaylistsPage` triggered multiple N+1 query loops for item counts, thumbnails, and folder checking.
    *   **Solution**: Implemented `get_all_playlist_metadata` (Rust) and used `getAllFoldersWithVideos` (frontend) to load all data in parallel batches.
    *   **Impact**: Playlist grid metadata loads instantly.

3.  **Implement Skeleton Loading (Optimistic UI)**
    *   **Problem**: Transitions between pages showed blank screens or generic "Loading..." text, making the app feel slow even if data was fast.
    *   **Solution**: Created `VideoCardSkeleton` and `PlaylistCardSkeleton` components with a CSS-based `shimmer` animation.
    *   **Implementation**: Integrated these skeletons into `VideosPage.jsx` and `PlaylistsPage.jsx` to display a placeholder grid immediately while fetching data.
    *   **Impact**: Perceived performance is significantly improved; the app feels "native" and responsive.

## Learnings
*   **Batch vs. Sequential**: Moving iteration from Frontend (Sequential RPC) to Backend (Internal Loop) is the single biggest performance win for this architecture.
*   **Perceived Speed**: Even with fast backends, skeleton screens are crucial for bridging the gap between "click" and "render", maintaining user immersion.

# Session Updates: TopNavigation Refinement & Top Menu Alignment
**Timestamp:** 14/01/2026 2:47pm

## Key Changes
1. **TopNavigation UI Refresh**:
   - **Theme Integration**: Updated `TopNavigation.jsx` to use the centralized theme system (`utils/themes.js`) for background and border styles, replacing hardcoded Tailwind classes.
   - **Tab Styling**:
     - Converted tabs to circular (`w-9 h-9`) and pill-shaped buttons to match the aesthetic of the `PlayerController` action buttons.
     - **Inactive State**: `bg-white` with `border-slate-700` (#334155) and slate icon.
     - **Active State**: `bg-white` with `border-sky-500` and sky-colored icon/text.
     - **Typography**: Matched the active tab text color (`text-sky-950`) to the video title style in the Player Controller menus.
   - **Layout**:
     - Retained "Playlists" and "Videos" as text+icon labels.
     - Converted secondary tabs (History, Likes, Pins, Settings, Support) to **icon-only** buttons for a cleaner, toolbar-like appearance.

2. **PlayerController Documentation**:
   - Updated `atlas/advanced-player-controller.md` to reflect the removal of the 3x3 Grid button from the video menu (integrated into navigation cluster) and the updated layout of action buttons.

## Learnings
- **Visual Consistency**: Aligning the global navigation bar (`TopNavigation`) with the specific control aesthetics of the `PlayerController` creates a more unified application feel.

---

# Session Updates: Banner Layout & Content Alignment
**Timestamp:** 14/01/2026 8:35pm

## Key Changes
1. **Banner Height & Layout**:
   - **Height**: Reduced `PageBanner` container height to a fixed `220px` to minimize empty vertical space and bring the content closer to the sticky toolbar.
   - **Vertical Alignment**: Moved banner content higher by reducing top padding from `pt-12` to `pt-4`.
   - **Centering**: Added `mt-8` to the ASCII avatar container and adjusted `continueVideo` position to `top-12`. This effectively centers the visual elements (Avatar, Text Block, Thumbnail) within the new 220px vertical space.

2. **Content Presentation**:
   - **Author Identity**: Removed the duplicate author pseudonym that was previously floating above the ASCII avatar. The author name remains in the metadata text row.
   - **Continue Video**: Moved the "Continue Visual" thumbnail to the top-right (`top-12`, `right-6`) to align horizontally with the main title block and ASCII art.
   - **Overlap Prevention**: Added dynamic right padding (`pr-64`) to the text container only when a continue video is present, ensuring long titles/descriptions don't underlap the thumbnail.

3. **Playlists Page Banner**:
   - **Data Integration**: Updated the banner on the Playlists Page to display meaningful metadata:
     - **Count**: Shows the number of visible playlists (e.g., "5 Playlists").
     - **Dynamic Label**: Implemented logical pluralization ("Playlist" vs "Playlists") in `PageBanner.jsx`.
     - **Secondary Data**: Repaired the "Author" slot to display the **Total Video Count** (sum of videos in visible playlists) as "X Videos".
   - **Title Logic**:
     - Renamed default view from "Playlists" to **"All"**.
     - Custom presets now show just the preset name (e.g., "Gaming").
     - **Tab Awareness**: Appends the active tab name if selected (e.g., "**All - Favorites**") to clearly indicate the current view context.

## Learnings
- **Visual Balance**: When reducing container height, strictly centering elements (like the ASCII art and floating thumbnails) relative to the container *height* is crucial for a balanced look, even if the text block is top-aligned.
- **Contextual Metadata**: Re-purposing generic banner slots (like 'author') to show relevant context-specific data (like 'Total Videos' on a playlist overview) significantly improves the utility of the UI without requiring new component props.
