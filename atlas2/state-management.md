# State Management

This document provides a comprehensive overview of all Zustand stores, their relationships, and state flow patterns in the application.

**Related Documentation:**
- **Feature Docs**: All feature documents (`advanced-player-controller.md`, `playlist&tab.md`, `ui.md`, etc.) use these stores
- **Database**: See `database-schema.md` for persistent data that syncs with stores
- **API Layer**: See `api-bridge.md` for commands that update store state
- **Navigation**: See `navigation-routing.md` for how stores coordinate navigation flows

## Overview

The application uses **Zustand** (v5.0.9) for state management. Zustand is a lightweight, unopinionated state management library that provides a simple API for creating reactive stores. There are **8 Zustand stores** that manage different aspects of the application state.

## Store Architecture

### Store Categories

1. **UI State Stores** (client-side only, no persistence):
   - `layoutStore` - View modes, debug modes
   - `navigationStore` - Current page routing
   - `pinStore` - Session-only pin state

2. **Data State Stores** (sync with database):
   - `playlistStore` - Current playlist/video state, navigation items
   - `folderStore` - Folder assignments, bulk tagging state

3. **Organization State Stores** (persisted to localStorage):
   - `tabStore` - Tab organization
   - `tabPresetStore` - Tab preset configurations
   - `stickyStore` - Sticky video state management

4. **Configuration State Stores** (persisted to localStorage):
   - `configStore` - Theme and Profile settings

## Store Details

### 1. layoutStore (`src/store/layoutStore.js`)

**Purpose**: Manages UI layout and debug modes

**State:**
- `viewMode`: 'full' | 'half' | 'quarter' - Current view mode
- `menuQuarterMode`: boolean - Menu quarter mode toggle
- `showDebugBounds`: boolean - Layout debug mode (colored boundaries)
- `inspectMode`: boolean - Inspect element mode (tooltip labels)

**Actions:**
- `setViewMode(mode)` - Sets view mode, auto-disables menuQuarterMode when switching to 'full'
- `toggleMenuQuarterMode()` - Toggles menu quarter mode (only works when not in 'full')
- `toggleDebugBounds()` - Toggles layout debug bounds
- `toggleInspectMode()` - Toggles inspect element mode

**Persistence**: None - all state is session-only

**Dependencies:**
- When `viewMode` changes → `LayoutShell` re-renders → Layout structure changes
- When `showDebugBounds` changes → All layout regions show/hide debug boundaries
- When `inspectMode` changes → All components show/hide tooltip labels

---

### 2. navigationStore (`src/store/navigationStore.js`)

**Purpose**: Manages page routing (Playlists/Videos/History)

**State:**
- `currentPage`: 'playlists' | 'videos' | 'history' - Currently active page

**Actions:**
- `setCurrentPage(page)` - Sets active page

**Persistence**: None - resets to 'playlists' on app start

**Dependencies:**
- When `currentPage` changes → `App.jsx` re-renders → Different page component displayed
- When page changes in 'full' mode → Auto-switches to 'half' mode to show side menu

---

### 3. playlistStore (`src/store/playlistStore.js`)

**Purpose**: Manages current playlist, video playback, and hierarchical navigation

**State:**
- `showPlaylists`: boolean - Legacy sidebar toggle (unused in current UI)
- `currentPlaylistItems`: Array - Videos in current playlist
- `currentPlaylistId`: number | null - Current playlist ID
- `currentVideoIndex`: number - Index of currently playing video
- `allPlaylists`: Array - All playlists in database (synced globally for navigation)
- `currentPlaylistIndex`: number - Index in allPlaylists array
- `navigationItems`: Array - Flat list of playlists and folders for navigation
- `currentNavigationIndex`: number - Index in navigationItems array
- `currentFolder`: { playlist_id, folder_color } | null - Current folder context
- `previewPlaylistItems`: Array | null - Preview playlist items (null when not previewing)
- `previewPlaylistId`: number | null - Preview playlist ID
- `previewFolderInfo`: { playlist_id, folder_color } | null - Preview folder info

**Actions:**
- `setShowPlaylists(show)` - Sets sidebar visibility (legacy)
- `setPlaylistItems(items, playlistId, folderInfo)` - Sets current playlist items
- `setCurrentVideoIndex(index)` - Sets current video index
- `nextVideo()` - Navigates to next video in playlist
- `previousVideo()` - Navigates to previous video in playlist
- `nextPlaylist()` - Navigates to next playlist/folder in navigationItems
- `previousPlaylist()` - Navigates to previous playlist/folder
- `shufflePlaylist()` - Shuffles current playlist items
- `buildNavigationItems(playlists, folders)` - Builds hierarchical navigation list
- `setNavigationItems(items)` - Sets navigation items
- `setAllPlaylists(playlists)` - Sets all playlists array
- `setCurrentFolder(folderInfo)` - Sets current folder context
- `setPreviewPlaylist(items, playlistId, folderInfo)` - Sets preview playlist state
- `clearPreview()` - Clears preview state
- `getCurrentVideo()` - Gets current video object

**Persistence**: 
- Video index persisted to localStorage: `last_video_index_{playlistId}`
- Shuffled order persisted to localStorage: `shuffled_order_{playlistId}`
- Folder video index persisted: `last_video_index_{playlistId}_{folderColor}`

**Dependencies:**
- When `currentPlaylistItems` changes → VideosPage updates → Grid re-renders
- When `currentVideoIndex` changes → YouTubePlayer receives new video → Player updates
- When `previewPlaylistItems` set → VideosPage shows preview items → Preview mode active
- When `navigationItems` changes → PlayerController navigation updates → Next/prev buttons work

---

### 4. folderStore (`src/store/folderStore.js`)

**Purpose**: Manages folder assignments, filtering, and bulk tagging

**State:**
- `selectedFolder`: string | null - Currently selected folder color (null = all videos)
- `quickAssignFolder`: string - Default folder color for quick assign (persisted to localStorage)
- `videoFolderAssignments`: Object - Map of video ID to array of folder colors
- `showColoredFolders`: boolean - Toggle for showing folders in playlist grid (persisted to localStorage)
- `bulkTagMode`: boolean - Bulk tagging mode toggle
- `bulkTagSelections`: Object - Map of video ID to Set of folder colors

**Actions:**
- `setSelectedFolder(folder)` - Sets selected folder filter (null = all)
- `setQuickAssignFolder(folderId)` - Sets quick assign folder preference (persists to localStorage)
- `setVideoFolders(itemId, folders)` - Sets folder assignments for a video
- `loadVideoFolders(assignments)` - Loads folder assignments for multiple videos
- `clearAssignments()` - Clears all folder assignments
- `setShowColoredFolders(enabled)` - Toggles folder display (persists to localStorage)
- `setBulkTagMode(enabled)` - Toggles bulk tagging mode
- `addBulkTagSelection(videoId, folderColor)` - Adds folder color to bulk selection
- `removeBulkTagSelection(videoId, folderColor)` - Removes folder color from bulk selection
- `toggleBulkTagSelection(videoId, folderColor)` - Toggles folder color in bulk selection
- `clearBulkTagSelections()` - Clears all bulk tag selections

**Persistence:**
- `quickAssignFolder` persisted to localStorage: `quickAssignFolder`
- `showColoredFolders` persisted to localStorage: `showColoredFolders`

**Dependencies:**
- When `selectedFolder` changes → VideosPage filters videos → Grid shows only folder videos
- When `videoFolderAssignments` changes → VideoCard star icons update → Visual feedback
- When `bulkTagMode` changes → VideoCard hover behavior changes → Color grid appears
- When `bulkTagSelections` changes → Visual feedback updates → Checkmarks appear

---

### 5. tabStore (`src/store/tabStore.js`)

**Purpose**: Manages tab organization for playlists

**State:**
- `tabs`: Array - Array of tab objects `{ id, name, playlistIds: [] }`
- `activeTabId`: string - Currently active tab ID

**Actions:**
- `setActiveTab(tabId)` - Sets active tab (persists to localStorage)
- `createTab(name)` - Creates new tab, returns tab ID
- `deleteTab(tabId)` - Deletes tab (cannot delete 'all')
- `renameTab(tabId, newName)` - Renames tab
- `addPlaylistToTab(tabId, playlistId)` - Adds playlist to tab
- `removePlaylistFromTab(tabId, playlistId)` - Removes playlist from tab

**Persistence:**
- `tabs` persisted to localStorage: `playlistTabs`
- `activeTabId` persisted to localStorage: `activeTabId`

**Dependencies:**
- When `activeTabId` changes → PlaylistsPage filters playlists → Grid shows only tab playlists
- When tab's `playlistIds` changes → Grid updates → Playlists appear/disappear

---

### 6. tabPresetStore (`src/store/tabPresetStore.js`)

**Purpose**: Manages tab preset configurations

**State:**
- `presets`: Array - Array of preset objects `{ id, name, tabIds: [] }`
- `activePresetId`: string - Currently active preset ID

**Actions:**
- `setActivePreset(presetId)` - Sets active preset (persists to localStorage)
- `createPreset(name, tabIds)` - Creates new preset
- `deletePreset(presetId)` - Deletes preset (cannot delete 'all')
- `updatePreset(presetId, name, tabIds)` - Updates preset

**Persistence:**
- `presets` persisted to localStorage: `tabPresets`
- `activePresetId` persisted to localStorage: `activePresetId`

**Dependencies:**
- When `activePresetId` changes → TabBar filters visible tabs → Only preset tabs shown
- When preset's `tabIds` changes → TabBar recalculates → Tab visibility updates

---

### 7. pinStore (`src/store/pinStore.js`)

**Purpose**: Manages video pinning with 24-hour expiration for normal pins and persistent priority pins

**State:**
- `pinnedVideos`: Array - Array of pinned video objects. Each object includes `pinnedAt` timestamp.
- `priorityPinIds`: Array - Array of video IDs that are priority pins (mutually exclusive with normal pins).

**Actions:**
- `togglePin(video)` - Toggles normal pin status. If becoming pinned, sets `pinnedAt` timestamp. Enforces exclusivity (unpins from priority if needed).
- `setFirstPin(video)` - Sets video as priority pin. Enforces exclusivity (unpins from normal if needed).
- `togglePriorityPin(video)` - Toggles priority pin status.
- `isPinned(videoId)` - Checks if video is a normal pin (and NOT a priority pin).
- `isPriorityPin(videoId)` - Checks if video is a priority pin.
- `removePin(videoId)` - Removes pin by video ID (from both lists).
- `clearAllPins()` - Clears all pins and priority state.
- `checkExpiration()` - Checks `pinnedAt` timestamps and removes normal pins older than 24 hours. Priority pins do not expire.
- `getPinInfo(videoId)` - Returns object with `{ isPinned, isPriority, pinnedAt }`.

**Persistence**: 
- Persisted to localStorage: `pin-storage`
- Persists both `pinnedVideos` and `priorityPinIds`.

**Pin Behavior:**
- **Normal Pins**: 
  - Expire 24 hours after being pinned. 
  - Show a countdown timer on the Pins Page.
- **Priority Pins**: 
  - Do NOT expire.
  - Are mutually exclusive with normal pins (a video cannot be both).
  - Typically displayed in a separate "Priority" section (e.g., carousel).
  - The store supports multiple priority pins via `priorityPinIds` array, though UI may treat the first one specially.

**Dependencies:**
- When video pinned → VideoCard pin icon updates → Amber if pinned, gray if not
- When `pinnedVideos` changes → PinsPage re-renders → Shows normal pins in grid
- When `priorityPinIds` changes → PinsPage re-renders → Shows priority pins in carousel
- When app mounts or interval triggers → `checkExpiration()` runs → Expired normal pins removed

---

### 8. stickyStore (`src/store/stickyStore.js`)

**Purpose**: Manages sticky video state with folder-scoped persistence

**State:**
- `stickiedVideos`: Set - Set of strings in format `${playlistId}::${videoId}::${folderKey}` (internal state, exposed via selectors)

**Actions:**
- `toggleSticky(playlistId, videoId, folderId)` - Toggles sticky state for a video in a specific folder context
- `isStickied(playlistId, videoId, folderId)` - Checks if a video is stickied in a specific folder context
- `getStickiedVideoIds(playlistId, folderId)` - Returns array of video IDs stickied in that context
- `clearAllSticky()` - Clears all sticky states

**Persistence**: 
- Persisted to localStorage: `sticky-storage`
- Uses custom serialization/deserialization for the Set of strings

**Key Behaviors:**
- **Scoped Keys**: Stickiness is stored using a composite key: `${activePlaylistId}::${folderKey}`. This ensures a video can be stickied in the "Red" folder but not in the "Blue" folder or Root view.
- **Copy Semantics**: Sticky videos are treated as copies; they appear in the carousel but are NOT removed from the main grid list.
- **UnsortedExclusion**: Stickiness is disabled/hidden for the 'unsorted' folder view.

**Dependencies:**
- When `stickiedVideos` changes → `VideosPage` re-renders → Carousel updates and VideoCard menu items update

---

### 9. configStore (`src/store/configStore.js`)

**Purpose**: Manages application-wide configuration including themes and user profile

**State:**
- `currentThemeId`: string - ID of the active theme (e.g., 'nebula', 'sunset')
- `userName`: string - User's display name for banners (default: 'Boss')
- `userAvatar`: string - User's ASCII art avatar (default: '( ͡° ͜ʖ ͡°)')
- `customOrbImage`: string | null - Base64 encoded custom orb image
- `customBannerImage`: string | null - Base64 encoded custom app banner image
- `customPageBannerImage`: string | null - Base64 encoded custom page banner image
- `isSpillEnabled`: boolean - Master toggle for orb spill effect
- `orbSpill`: Object - Quadrant spill flags ({ tl, tr, bl, br })
- `orbImageScale`: number - Orb image zoom level (0.5 - 3.0)
- `orbImageXOffset`/`YOffset`: number - Orb image pan offsets
- `visualizerGradient`: boolean - Toggle for distance-based visualizer transparency (default: true)
- Legacy layout settings (deprecated/removed from UI but present in store structure)

**Actions:**
- `setCurrentThemeId(id)` - Sets the active application theme
- `setUserName(name)` - Sets the user's display name
- `setUserAvatar(avatar)` - Sets the user's ASCII avatar (supports multi-line)
- `setBannerPattern(pattern)` - Sets the video page banner pattern ('diagonal' | 'dots' | 'waves' | 'solid')
- `setPlayerBorderPattern(pattern)` - Sets the top player border/separator pattern ('diagonal' | 'dots' | 'waves' | 'solid')
- `setCustomBannerImage(dataUrl)` - Sets the app-wide top banner custom image
- `setCustomPageBannerImage(dataUrl)` - Sets the page banner custom image (Videos Page/Folders)
- `setVisualizerGradient(enabled)` - Toggles visualizer distance-based transparency fade

**Persistence:**
- Persisted to localStorage: `config-storage`

**Dependencies:**
- When `currentThemeId` changes → App theme colors update globally
- When `userName` or `userAvatar` changes → `PageBanner` re-renders with new identity
- **Profile Customization**:
  - `SettingsPage` provides UI to update name and avatar.
  - Supports multi-line ASCII art (rendered in `<pre>` tag with 4px font).
  - Single-line ASCII art (like Lenny faces) is scaled larger.

---

### 10. browserStore (`src/store/browserStore.js`)

**Purpose**: Tracks visibility of the Layer 2 Browser and coordinates visibility state with the C# backend.

**State**:
- `isBrowserVisible`: boolean - Whether the browser overlay (Layer 2) is currently visible.

**Actions**:
- `showBrowser()` - Sets `isBrowserVisible` to true.
- `hideBrowser()` - Sets `isBrowserVisible` to false.
- `toggleBrowser()` - Toggles the visibility state.

**Source of Truth**: React state (not persisted). It mirrors the intended visibility which is then communicated to the C# host via `setBrowserMode`.

---

## State Flow Patterns

### Pattern 1: Playlist Selection → Video Loading

1. User clicks playlist → `setPlaylistItems(items, playlistId)` called
2. `playlistStore` updates:
   - `currentPlaylistItems` = items
   - `currentPlaylistId` = playlistId
   - `currentVideoIndex` = restored from localStorage or 0
3. `VideosPage` detects change → Loads folder assignments
4. `YouTubePlayer` receives new video URL → Starts playing
5. Watch history recorded → `addToWatchHistory()` called

### Pattern 2: Folder Filtering

1. User clicks folder color → `setSelectedFolder(folderColor)` called
2. `folderStore.selectedFolder` updates
3. `VideosPage` detects change → Calls `getVideosInFolder(playlistId, folderColor)`
4. `displayedVideos` updates → Grid shows only folder videos
5. Folder assignments loaded → `loadVideoFolders(assignments)` updates store

### Pattern 3: Preview Navigation

1. User enters preview mode → `setPreviewPlaylist(items, playlistId, folderInfo)` called
2. `playlistStore` updates:
   - `previewPlaylistItems` = items
   - `previewPlaylistId` = playlistId
   - `previewFolderInfo` = folderInfo
3. `VideosPage` detects preview → Shows preview items instead of current items
4. User commits → `setPlaylistItems()` called with preview data → Preview cleared
5. User reverts → `clearPreview()` called → Returns to original state

### Pattern 4: Tab Filtering

1. User clicks tab → `setActiveTab(tabId)` called
2. `tabStore.activeTabId` updates
3. `PlaylistsPage` detects change → Filters playlists by `activeTab.playlistIds`
4. Grid updates → Shows only playlists in active tab

### Pattern 5: Bulk Tagging

1. User enters bulk tag mode → `setBulkTagMode(true)` called
2. `folderStore.bulkTagMode` updates
3. `VideoCard` components detect change → Hover shows color grid
4. User selects colors → `toggleBulkTagSelection()` called
5. `bulkTagSelections` updates → Visual feedback (checkmarks)
6. User saves → Loops through selections → `assignVideoToFolder()` / `unassignVideoFromFolder()`
7. Folder assignments updated → `loadVideoFolders()` refreshes store
8. Bulk tag mode exited → `setBulkTagMode(false)`, `clearBulkTagSelections()`

---

## Store Relationships

### Dependency Graph

```
layoutStore (viewMode)
    ↓
navigationStore (currentPage)
    ↓
App.jsx (renders pages)
    ↓
playlistStore (currentPlaylistItems)
    ↓
VideosPage / YouTubePlayer
    ↓
folderStore (selectedFolder, videoFolderAssignments)
    ↓
VideoCard (folder indicators)
```

### Cross-Store Dependencies

1. **playlistStore ↔ folderStore**:
   - When playlist changes → Folder assignments loaded → `folderStore.videoFolderAssignments` updated
   - When folder selected → `folderStore.selectedFolder` → VideosPage filters `playlistStore.currentPlaylistItems`

2. **playlistStore ↔ tabStore**:
   - When tab active → PlaylistsPage filters `playlistStore.allPlaylists` by `tabStore.activeTab.playlistIds`

3. **tabStore ↔ tabPresetStore**:
   - When preset active → TabBar filters `tabStore.tabs` by `tabPresetStore.activePreset.tabIds`

4. **layoutStore ↔ navigationStore**:
   - When page changes in full mode → `layoutStore.setViewMode('half')` auto-called

---

## Persistence Strategy

### Database Persistence
- Playlist data (playlists, playlist_items, video_folder_assignments)
- Watch history (watch_history)
- Video progress (video_progress)
- Sticky folders (stuck_folders)

### localStorage Persistence
- `playlistTabs` - Tab configurations
- `activeTabId` - Active tab
- `tabPresets` - Tab preset configurations
- `activePresetId` - Active preset
- `quickAssignFolder` - Quick assign folder preference
- `showColoredFolders` - Folder display toggle
- `last_video_index_{playlistId}` - Last video index per playlist
- `shuffled_order_{playlistId}` - Shuffled order per playlist
- `last_video_index_{playlistId}_{folderColor}` - Last video index per folder
- `playback_time_{videoId}` - Quick access playback time (non-authoritative)

### Session-Only State
- `pinStore.pinnedVideos` - Cleared on app restart
- `layoutStore` - All state resets on app restart
- `navigationStore` - Resets to 'playlists' on app start
- `folderStore.bulkTagMode` - Resets on mode exit
- `folderStore.bulkTagSelections` - Cleared on mode exit

---

## Common Patterns

### Pattern: Reading from Store
```javascript
const { currentPlaylistItems, currentVideoIndex } = usePlaylistStore();
```

### Pattern: Updating Store
```javascript
const { setCurrentVideoIndex } = usePlaylistStore();
setCurrentVideoIndex(newIndex);
```

### Pattern: Conditional Updates
```javascript
const { setPlaylistItems } = usePlaylistStore();
if (items.length > 0) {
  setPlaylistItems(items, playlistId);
}
```

### Pattern: Store-Dependent State
```javascript
const currentPlaylistItems = usePlaylistStore(state => state.currentPlaylistItems);
const [displayedVideos, setDisplayedVideos] = useState([]);

useEffect(() => {
  // React to store changes
  setDisplayedVideos(currentPlaylistItems);
}, [currentPlaylistItems]);
```

---

## Best Practices

1. **Use stores for global state** - Don't prop-drill deeply nested state
2. **Keep stores focused** - Each store manages one domain (playlists, folders, tabs, etc.)
3. **Persist user preferences** - Use localStorage for UI preferences (tabs, quick assign, etc.)
4. **Sync with database** - Data stores should sync with database, not duplicate it
5. **Clear session state** - Session-only state (pins, bulk selections) should clear appropriately
6. **Handle loading states** - Components should handle store state being empty/loading

---

## Troubleshooting

### State Not Updating
- Check if component is subscribed to store: `usePlaylistStore()` not just `usePlaylistStore.getState()`
- Check if store action is actually called
- Check console for errors in store actions

### Persistence Not Working
- Check localStorage quota (may be full)
- Check if key name matches between save/load
- Check if JSON parsing/serialization is working

### State Out of Sync
- Check if multiple stores need updating for one action
- Check if database operations completed before updating store
- Check if preview state needs clearing

