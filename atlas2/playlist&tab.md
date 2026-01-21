###2: Playlist & Tab Management

The Playlist & Tab Management system provides comprehensive organization of playlists through tabs, colored folders, and presets. This system allows users to group playlists into tabs, assign videos to colored folders within playlists, and save/load workspace configurations as presets.

**Related Documentation:**
- **Database Schema**: See `database-schema.md` for `playlists`, `playlist_items`, `video_folder_assignments`, and `stuck_folders` table structures
- **API Layer**: See `api-bridge.md` for playlist CRUD commands, folder assignment commands, and import/export operations
- **State Management**: See `state-management.md` for `playlistStore`, `tabStore`, `tabPresetStore`, and `folderStore` details
- **Navigation**: See `navigation-routing.md` for playlist navigation flows and folder filtering
- **Import/Export**: See `importexport.md` for detailed import/export workflows

---

#### ### 2.1 Playlists

**1: User-Perspective Description**

Users see a 3-column grid of playlist cards in the Playlists page:

- **Playlist Cards**: Each card displays:
  - **Thumbnail**: 16:9 aspect ratio image showing the first video's thumbnail from the playlist
  - **Mini Thumbnail**: Removed.
  - **Title Overlay**: Playlist name displayed at the bottom of the thumbnail with "Epic WordArt" styling (font-black, italic, text-3xl, dark blue text with white stroke and 3D sky blue shadow).
  - **Hover Overlay**: On hover, a semi-transparent overlay appears with:
    - **Preview Button** (eye icon): Opens playlist in preview mode without changing current playback
    - **Play Button** (large play icon): Loads playlist and starts playing first video
  - **Interactive Elements Overlay**:
    - **3-Dot Menu**: Positioned at the top-right of the thumbnail, visible on hover. Provides options for Expand/Collapse, Export, Add to Tab, and Delete.

- **Playlist Expansion**: When a playlist is expanded (via menu), its colored folders appear inline in the grid immediately after the playlist card. Folders show:
  - Colored left border (2px wide) matching folder color
  - Folder thumbnail (first video in folder)
  - Folder name (e.g., "Red Folder")
  - Parent playlist name
  - Video count
  - 3-dot menu with "Stick Folder" / "Unstick Folder" option

- **Sticky Folders**: Folders that are "stuck" appear in the grid even when their parent playlist is collapsed. They appear after their parent playlist card regardless of expansion state.

- **Sticky Toolbar**: A dynamic toolbar that sits below the Page Banner and sticks to the top of the viewport when scrolling.
  - **Seamless Integration**: When at the top, it visually blends with the Page Banner (`seamlessBottom` effect). When sticky, it becomes darker/blurred with square corners.
  - **Tab Bar**: Integrated into the top row of the toolbar, with the **Tab Presets Dropdown** on the right.
  - **Controls Row**: Below the tabs, displaying:
    - **Folder Toggle**: Toggles display of colored folders in the grid.
    - **Add Playlist**: Opens the Playlist Uploader modal in "Add" mode.


**2: File Manifest**

**UI/Components:**
- `src/components/PlaylistsPage.jsx`: Main playlist grid page component
- `src/components/CardMenu.jsx`: 3-dot menu component with submenu support
- `src/components/CardThumbnail.jsx`: Thumbnail display component
- `src/components/TabBar.jsx`: Tab navigation bar component
- `src/components/PlaylistUploader.jsx`: Single playlist import modal
- `src/components/BulkPlaylistImporter.jsx`: Bulk import modal
- `src/components/AddPlaylistToTabModal.jsx`: Modal for adding playlists to tabs

**State Management:**
- `src/store/playlistStore.js`:
  - `allPlaylists`: Array of all playlists
  - `setPlaylistItems(items, playlistId, folderInfo)`: Sets current playlist items
  - `setPreviewPlaylist(items, playlistId, folderInfo)`: Sets preview playlist state
- `src/store/tabStore.js`:
  - `tabs`: Array of tab objects `{ id, name, playlistIds }`
  - `activeTabId`: Currently active tab ID
  - `addPlaylistToTab(tabId, playlistId)`: Adds playlist to tab
  - `removePlaylistFromTab(tabId, playlistId)`: Removes playlist from tab
- `src/store/folderStore.js`:
  - `showColoredFolders`: Boolean toggle for folder display
- `src/components/PlaylistsPage.jsx` (local state):
  - `playlists`: Array of playlist objects
  - `playlistThumbnails`: Map of playlist ID to thumbnail URL
  - `playlistItemCounts`: Map of playlist ID to video count
  - `expandedPlaylists`: Set of expanded playlist IDs
  - `playlistFolders`: Map of playlist ID to array of folder colors
  - `stuckFolders`: Set of "playlistId:folderColor" strings

**API/Bridge:**
- `src/api/playlistApi.js`:
  - `getAllPlaylists()` - Gets all playlists
  - `getPlaylistItems(playlistId)` - Gets videos in playlist
  - `deletePlaylist(playlistId)` - Deletes playlist
  - `exportPlaylist(playlistId)` - Exports playlist as JSON
  - `getFoldersForPlaylist(playlistId)` - Gets folder colors for playlist
  - `toggleStuckFolder(playlistId, folderColor)` - Toggles folder stickiness
  - `getAllStuckFolders()` - Gets all stuck folders
  - `getVideosInFolder(playlistId, folderColor)` - Gets videos in folder

**Backend:**
- `src-tauri/src/commands.rs`: Tauri command handlers
- `src-tauri/src/database.rs`: SQLite operations
- Database tables:
  - `playlists`: Playlist metadata (id, name, description, created_at, updated_at, custom_ascii)
  - `playlist_items`: Videos in playlists (id, playlist_id, video_url, video_id, title, thumbnail_url, position, added_at)
  - `stuck_folders`: Stuck folder assignments (id, playlist_id, folder_color, created_at)

**3: The Logic & State Chain**

**Trigger → Action → Persistence Flow:**

1. **Load Playlists Flow:**
   - On component mount → `loadPlaylists()` (line 102)
   - Calls `getAllPlaylists()` → Gets all playlists from database
   - For each playlist → `getPlaylistItems(playlist.id)` → Gets video count and first video
   - Generates thumbnail URL from first video → `getThumbnailUrl(firstVideo.video_id, 'medium')`
   - Stores thumbnails and counts in local state → `setPlaylistThumbnails(thumbnailMap)`, `setPlaylistItemCounts(itemCountMap)`
   - Checks for folders → `getFoldersForPlaylist(playlist.id)` → Pre-loads folder data
   - Loads stuck folders → `getAllStuckFolders()` → Stores as Set of "playlistId:folderColor" strings

2. **Click Playlist Flow:**
   - User clicks playlist card → `onClick` handler (line 593)
   - Calls `getPlaylistItems(playlist.id)` → Gets all videos
   - Calls `setPlaylistItems(items, playlist.id)` → Updates `playlistStore.currentPlaylistItems`
   - If videos exist → `onVideoSelect(items[0].video_url)` → Starts playing first video
   - Navigates to Videos page if needed

3. **Expand/Collapse Folders Flow:**
   - User clicks "Expand Folders" in menu → `togglePlaylistExpand(playlistId)` (line 289)
   - If not expanded → Adds playlist ID to `expandedPlaylists` Set
   - If folders not loaded → `getFoldersForPlaylist(playlistId)` → Stores in `playlistFolders` map
   - Grid re-renders → Folders appear inline after playlist card
   - If expanded → Removes from `expandedPlaylists` Set → Folders hidden (except stuck ones)

4. **Sticky Folder Flow:**
   - User clicks "Stick Folder" in folder menu → `toggleStuckFolder(playlistId, folderColor)` (line 969)
   - API call toggles database record in `stuck_folders` table
   - Returns new stuck status → Updates local `stuckFolders` Set
   - Stuck folders appear in grid even when parent playlist is collapsed
   - Stuck folders filtered out from global folder display (when `showColoredFolders` is on)

5. **Tab Filtering Flow:**
   - User clicks tab → `setActiveTab(tabId)` → Updates `tabStore.activeTabId`
   - Playlists filtered by active tab → `playlists.filter()` checks if playlist ID in `activeTab.playlistIds`
   - If `activeTabId === 'all'` → Shows all playlists
   - Grid re-renders with filtered playlists

6. **Export Playlist Flow:**
   - User clicks "Export Playlist" → `handleExportPlaylist(playlistId, playlistName)` (line 263)
   - Calls `exportPlaylist(playlistId)` → Gets playlist data, videos, and folder assignments
   - Creates JSON string → `JSON.stringify(exportData, null, 2)`
   - Creates Blob and downloads file → Browser download triggered
   - File name: `{playlistName}_export.json` (sanitized)

7. **Delete Playlist Flow:**
   - User clicks "Delete" → Confirmation dialog appears
   - If confirmed → `deletePlaylist(playlistId)` → Deletes from database
   - If deleted playlist was current → `setPlaylistItems([])` clears current items
   - Reloads playlists → `loadPlaylists()` refreshes grid

**Source of Truth:**
- Database `playlists` table - Source of Truth for playlist data
- `playlistStore.allPlaylists` - Cached playlist array (refreshed on load)
- `tabStore.tabs` - Source of Truth for tab organization (persisted to localStorage)
- `tabStore.activeTabId` - Currently active tab (persisted to localStorage)
- Database `stuck_folders` table - Source of Truth for sticky folder assignments

**State Dependencies:**
- When `activeTabId` changes → Playlists filtered → Grid shows only playlists in active tab
- When `showColoredFolders` changes → Folders loaded/unloaded → Folder cards appear/disappear in grid
- When playlist expanded → `expandedPlaylists` Set updated → Folders appear inline after playlist
- When folder stuck → `stuckFolders` Set updated → Folder appears even when playlist collapsed
- When playlist deleted → `loadPlaylists()` called → Grid refreshes, playlist removed
- When playlist imported → `loadPlaylists()` called → New playlist appears in grid

---

#### ### 2.2 Colored Folders

**1: User-Perspective Description**

Users see colored folders as a way to organize videos within playlists:

- **16 Folder Colors**: Red, Orange, Amber, Yellow, Lime, Green, Emerald, Teal, Cyan, Sky, Blue, Indigo, Violet, Purple, Fuchsia, Pink
- **Folder Display Modes**:
  - **Global Display** (when toggle is on): All folders appear as separate cards in the playlist grid, showing:
    - Colored left border (2px) matching folder color
    - Folder thumbnail (first video in folder)
    - Folder name (default "Red Folder" or custom name from `folder_metadata`)
    - Custom ASCII Banner (if configured in `folder_metadata`)
    - Parent playlist name
    - Video count
    - Stuck folders are excluded from global display (shown in playlist section instead)
  - **Inline Display** (when playlist expanded): Folders appear inline after their parent playlist card
  - **Sticky Display**: Stuck folders always appear after their parent playlist, even when collapsed

- **Folder Card Features**:
  - **Click Behavior**: Clicking a folder loads that folder's videos and starts playing the first video
  - **3-Dot Menu**: "Stick Folder" / "Unstick Folder" option toggles folder stickiness
  - **Visual Indicator**: Colored dot and left border clearly identify folder color

- **Folder Assignment**: Videos are assigned to folders via:
  - Star button in PlayerController (quick assign)
  - 3-dot menu on video cards (assign to folder submenu)
  - Bulk tag mode (hover over video to show color grid)

- **Folder Filtering**: On Videos page, users can filter by folder using the FolderSelector component:
  - **16 Colored Dots**: Each dot displays the count of videos assigned to that folder.
  - **All Button**: Shows all videos (displays total count).
  - **Unsorted Button**: Shows videos not assigned to any folder (displays count).
 
- **Start-of-List Sticky Videos**:
  - Each specific colored folder view supports its own set of "Sticky Videos" (see `ui.md` 4.1.2).
  - Videos stickied while viewing a folder will only appear in that folder's sticky carousel, not in other folders or the main view.
  - **Filter Immunity**: Videos in these sticky carousels are immune to watch time filters, ensuring visibility regardless of watch status.
 
**2: File Manifest**

**UI/Components:**
- `src/components/PlaylistsPage.jsx` (lines 411-523): Global folder card rendering
- `src/components/PlaylistsPage.jsx` (lines 812-990): Inline folder card rendering (when playlist expanded)
- `src/components/FolderCard.jsx`: Folder card component (used in PlaylistList sidebar, may be deprecated)
- `src/components/FolderSelector.jsx`: 16-color folder filter selector
- `src/components/BulkTagColorGrid.jsx`: Color grid for bulk tagging
- `src/components/VideoCard.jsx`: Video card with folder assignment UI

**State Management:**
- `src/store/folderStore.js`:
  - `selectedFolder`: Currently selected folder color filter (null = all videos)
  - `showColoredFolders`: Boolean toggle for global folder display
  - `videoFolderAssignments`: Map of video ID to array of folder colors
  - `quickAssignFolder`: Default folder color for quick assign (persisted to localStorage)
  - `bulkTagMode`: Boolean for bulk tagging mode
  - `bulkTagSelections`: Map of video ID to Set of folder colors
- `src/components/PlaylistsPage.jsx` (local state):
  - `folders`: Array of folder objects from `getAllFoldersWithVideos()`
  - `stuckFolders`: Set of "playlistId:folderColor" strings
  - `playlistFolders`: Map of playlist ID to array of folder colors

**API/Bridge:**
- `src/api/playlistApi.js`:
  - `getAllFoldersWithVideos()` - Gets all folders with video counts and thumbnails
  - `getFoldersForPlaylist(playlistId)` - Gets folder colors for a specific playlist
  - `getVideosInFolder(playlistId, folderColor)` - Gets videos assigned to a folder
  - `assignVideoToFolder(playlistId, itemId, folderColor)` - Assigns video to folder
  - `unassignVideoFromFolder(playlistId, itemId, folderColor)` - Removes folder assignment
  - `getVideoFolderAssignments(playlistId, itemId)` - Gets all folder assignments for a video
  - `toggleStuckFolder(playlistId, folderColor)` - Toggles folder stickiness
  - `getAllStuckFolders()` - Gets all stuck folder assignments

**Backend:**
- `src-tauri/src/commands.rs`: Tauri command handlers
- `src-tauri/src/database.rs`: SQLite operations
- Database tables:
  - `video_folder_assignments`: Folder assignments (id, playlist_id, item_id, folder_color, created_at)
  - `stuck_folders`: Stuck folder assignments (id, playlist_id, folder_color, created_at)
  - `folder_metadata`: Custom folder names/descriptions/banners (id, playlist_id, folder_color, custom_name, description, custom_ascii, created_at, updated_at)

**3: The Logic & State Chain**

**Trigger → Action → Persistence Flow:**

1. **Load Folders Flow:**
   - On mount and when `showColoredFolders` changes → `loadFolders()` (line 67)
   - Calls `getAllFoldersWithVideos()` → Gets all folders with video counts and first video thumbnails
   - Stores in local state → `setFolders(foldersData)`
   - Always loads folders (even when toggle off) to support stuck folders

2. **Toggle Folder Display Flow:**
   - User clicks folder toggle button → `setShowColoredFolders(!showColoredFolders)` (line 360)
   - Updates `folderStore.showColoredFolders` → Persisted to localStorage (via folderStore)
   - Grid re-renders → If on, shows all folders as separate cards (except stuck ones)
   - If off, folders only shown inline when playlists expanded, or as stuck folders

3. **Assign Video to Folder Flow:**
   - User assigns video (via star button or menu) → `assignVideoToFolder(playlistId, itemId, folderColor)`
   - API call inserts record into `video_folder_assignments` table
   - Local state updated → `setVideoFolders(videoId, [...folders, folderColor])`
   - If viewing that folder → `getVideosInFolder()` refreshes displayed videos
   - Folder card video count updates on next load

4. **Sticky Folder Flow:**
   - User clicks "Stick Folder" in folder menu → `toggleStuckFolder(playlistId, folderColor)` (line 969)
   - API call toggles record in `stuck_folders` table (inserts if not exists, deletes if exists)
   - Returns new stuck status → Updates local `stuckFolders` Set
   - Stuck folders appear in playlist section even when parent is collapsed
   - Stuck folders excluded from global folder display (line 416)

5. **Click Folder Flow:**
   - User clicks folder card → `onClick` handler (line 431 or 825)
   - Calls `getVideosInFolder(playlistId, folderColor)` → Gets videos in folder
   - Calls `setPlaylistItems(items, playlistId, { playlist_id, folder_color })` → Sets current folder context
   - If videos exist → `onVideoSelect(firstVideo.video_url)` → Starts playing first video
   - Navigates to Videos page → Folder filter automatically applied

6. **Folder Filtering Flow:**
   - User clicks folder color in FolderSelector → `setSelectedFolder(folderColor)` (line 33)
   - Updates `folderStore.selectedFolder` → VideosPage filters videos
   - Calls `getVideosInFolder(playlistId, folderColor)` → Gets only videos in that folder
   - Grid updates → Shows only filtered videos
   - User clicks "All" button → `setSelectedFolder(null)` → Shows all videos
   - User clicks "Unsorted" button → `setSelectedFolder('unsorted')` → Shows videos with no folder assignments

**Source of Truth:**
- Database `video_folder_assignments` table - Source of Truth for folder assignments
- Database `stuck_folders` table - Source of Truth for sticky folder assignments
- `folderStore.selectedFolder` - Currently selected folder filter (null = all)
- `folderStore.showColoredFolders` - Global folder display toggle (persisted to localStorage)

**State Dependencies:**
- When `showColoredFolders` changes → Folders loaded → Global folder cards appear/disappear
- When folder assigned → `video_folder_assignments` table updated → Folder video count increases
- When folder unassigned → Record deleted → Folder video count decreases (folder may disappear if count reaches 0)
- When folder stuck → `stuck_folders` table updated → Folder appears in playlist section regardless of expansion
- When `selectedFolder` changes → VideosPage filters videos → Only videos in that folder shown
- When playlist expanded → Folders for that playlist loaded → Inline folders appear

---

#### ### 2.3 Tabs

**1: User-Perspective Description**

Users see a horizontal tab bar integrated into the Sticky Toolbar on the Playlists page:

- **Tab Buttons**: Each tab displays:
  - Tab name (e.g., "All", "Work", "Personal")
  - Playlist count in parentheses (e.g., "(5)" for tabs with 5 playlists)
  - Active tab highlighted in blue background
  - Inactive tabs in gray background
  - Hover effects on inactive tabs

- **"All" Tab**: Special default tab that shows all playlists. Cannot be deleted, renamed, or have playlists added to it.

- **Custom Tabs**: User-created tabs that filter playlists:
  - **Add Button** (+): Appears next to each custom tab. Clicking opens modal to select playlists to add.
  - **Delete Button** (X): Appears on hover. Clicking deletes the tab (playlists are not deleted, just removed from tab).
  - **Double-Click to Rename**: Double-clicking a tab name enters edit mode with text input.

- **Create Tab Button**: Plus button at the end of the tab bar. Clicking creates a new tab with an input field for the name.

- **Tab Presets Dropdown**: Dropdown button at the start of the tab bar showing the active preset name. Clicking opens a dropdown menu to select/switch presets.

- **Tab Filtering**: When a tab is active, only playlists assigned to that tab are shown in the grid. The "All" tab shows all playlists regardless of tab assignments.

**2: File Manifest**

**UI/Components:**
- `src/components/TabBar.jsx`: Main tab bar component with create, rename, delete functionality
- `src/components/AddPlaylistToTabModal.jsx`: Modal for selecting playlists to add to a tab
- `src/components/TabPresetsDropdown.jsx`: Preset selector dropdown (also handles preset management)

**State Management:**
- `src/store/tabStore.js`:
  - `tabs`: Array of tab objects `{ id, name, playlistIds: [] }`
  - `activeTabId`: Currently active tab ID
  - `createTab(name)`: Creates new tab, returns tab ID
  - `deleteTab(tabId)`: Deletes tab (cannot delete "all")
  - `renameTab(tabId, newName)`: Renames tab
  - `setActiveTab(tabId)`: Sets active tab
  - `addPlaylistToTab(tabId, playlistId)`: Adds playlist to tab
  - `removePlaylistFromTab(tabId, playlistId)`: Removes playlist from tab
  - All tab operations persist to localStorage (`playlistTabs` key)

**API/Bridge:**
- No Tauri commands - tabs are client-side only, stored in localStorage

**Backend:**
- No database tables - tabs stored in browser localStorage

**3: The Logic & State Chain**

**Trigger → Action → Persistence Flow:**

1. **Create Tab Flow:**
   - User clicks plus button → `setShowCreateTab(true)` → Input field appears
   - User types name and presses Enter → `handleCreateTab()` (line 21)
   - Calls `createTab(newTabName.trim())` → Creates tab object with unique ID (`tab-${Date.now()}`)
   - Adds to `tabs` array → `saveTabs(updatedTabs)` saves to localStorage
   - Sets as active tab → `setActiveTabId(newTab.id)` → Saves active tab to localStorage
   - Grid re-renders → Shows playlists in new tab (initially empty)

2. **Add Playlist to Tab Flow:**
   - User clicks add button (+) on tab → `handleOpenAddModal(tabId, e)` (line 48)
   - Opens `AddPlaylistToTabModal` → Shows all playlists with checkboxes
   - User selects playlists → `selectedPlaylistIds` Set updated
   - User clicks "Add" → `handleAdd(tabId, playlistId)` called for each selected playlist
   - Calls `addPlaylistToTab(tabId, playlistId)` → Updates tab's `playlistIds` array
   - Saves to localStorage → `saveTabs(updatedTabs)`
   - Grid re-renders → Playlists now appear when tab is active

3. **Switch Tab Flow:**
   - User clicks tab button → `setActiveTab(tabId)` (line 112)
   - Updates `tabStore.activeTabId` → Saves to localStorage (`activeTabId` key)
   - PlaylistsPage filters playlists → `playlists.filter()` checks if playlist ID in `activeTab.playlistIds`
   - Grid re-renders → Shows only playlists in active tab

4. **Rename Tab Flow:**
   - User double-clicks tab → `handleStartEdit(tab)` (line 29)
   - Sets `editingTabId` and `editTabName` → Input field replaces tab button
   - User edits name and presses Enter or blurs → `handleSaveEdit(tabId)` (line 35)
   - Calls `renameTab(tabId, editTabName.trim())` → Updates tab name in array
   - Saves to localStorage → `saveTabs(updatedTabs)`
   - Tab button re-renders with new name

5. **Delete Tab Flow:**
   - User clicks delete button (X) on hover → `deleteTab(tabId)` (line 145)
   - Removes tab from `tabs` array → `saveTabs(updatedTabs)`
   - If deleted tab was active → Sets active tab to "all"
   - Saves new active tab to localStorage
   - Grid re-renders → Tab removed, playlists still exist but not in any tab

6. **Tab Persistence:**
   - On store initialization → `loadTabs()` reads from localStorage (`playlistTabs` key)
   - If no stored tabs → Returns default `[{ id: 'all', name: 'All', playlistIds: [] }]`
   - On any tab change → `saveTabs(tabs)` writes to localStorage
   - Active tab also persisted separately → `localStorage.setItem('activeTabId', tabId)`

**Source of Truth:**
- `tabStore.tabs` - Array of tab objects (Source of Truth, persisted to localStorage)
- `tabStore.activeTabId` - Currently active tab (persisted to localStorage)

**State Dependencies:**
- When `activeTabId` changes → PlaylistsPage filters playlists → Grid shows only playlists in active tab
- When tab's `playlistIds` changes → Grid updates → Playlists appear/disappear based on tab membership
- When tab created → Added to `tabs` array → Tab button appears in tab bar
- When tab deleted → Removed from `tabs` array → Tab button removed, playlists unaffected
- When tab renamed → Tab name updated in array → Tab button shows new name
- When preset active → `TabBar` filters visible tabs → Only tabs in preset shown (except "All" tab)

---

#### ### 2.4 Tab Presets

**1: User-Perspective Description**

Users see a dropdown button on the right side of the Tab Bar (within the Sticky Toolbar) labeled with the current preset name:

- **Preset Dropdown**: Clicking opens a dropdown menu showing:
  - List of all presets with name and tab count
  - Active preset highlighted with blue background
  - Edit button (pencil icon) on hover for each preset
  - Delete button (X) on hover for each preset
  - "Create Preset" button at bottom

- **"All" Preset**: Special default preset that shows all tabs. Cannot be deleted or edited.

- **Create Preset Modal**: When "Create Preset" is clicked, a modal appears with:
  - Preset name input field
  - List of all tabs (except "All") with checkboxes
  - User selects which tabs to include in preset
  - "Create" button (disabled until name and at least one tab selected)

- **Edit Preset**: Clicking edit button opens the same modal pre-filled with preset name and selected tabs. User can modify and save.

- **Preset Functionality**: When a preset is active, the tab bar only shows tabs included in that preset (plus the "All" tab which always shows). This allows users to create different workspace configurations.

- **Preset Switching**: Clicking a preset in the dropdown immediately switches to that preset, filtering the visible tabs.


**2: File Manifest**

**UI/Components:**
- `src/components/TabPresetsDropdown.jsx`: Preset selector dropdown with create/edit/delete functionality
- `src/components/TabBar.jsx` (lines 66-73): Tab filtering based on active preset

**State Management:**
- `src/store/tabPresetStore.js`:
  - `presets`: Array of preset objects `{ id, name, tabIds: [] }`
  - `activePresetId`: Currently active preset ID
  - `createPreset(name, tabIds)`: Creates new preset
  - `deletePreset(presetId)`: Deletes preset (cannot delete "all")
  - `updatePreset(presetId, name, tabIds)`: Updates preset
  - `setActivePreset(presetId)`: Sets active preset
  - All preset operations persist to localStorage (`tabPresets` key)

**API/Bridge:**
- No Tauri commands - presets are client-side only, stored in localStorage

**Backend:**
- No database tables - presets stored in browser localStorage

**3: The Logic & State Chain**

**Trigger → Action → Persistence Flow:**

1. **Create Preset Flow:**
   - User clicks "Create Preset" → `handleStartCreate()` (line 42)
   - Opens modal → `setShowCreateModal(true)`, clears `selectedTabIds`
   - User enters name and selects tabs → `selectedTabIds` Set updated via `handleToggleTab()` (line 48)
   - User clicks "Create" → `handleCreatePreset()` (line 33)
   - Calls `createPreset(newPresetName.trim(), Array.from(selectedTabIds))` → Creates preset with unique ID
   - Adds to `presets` array → `savePresets(updatedPresets)` saves to localStorage
   - Sets as active preset → `setActivePreset(newPreset.id)` → Saves to localStorage
   - Tab bar re-renders → Only tabs in preset shown

2. **Switch Preset Flow:**
   - User clicks preset in dropdown → `setActivePreset(preset.id)` (line 118)
   - Updates `tabPresetStore.activePresetId` → Saves to localStorage (`activePresetId` key)
   - `TabBar` filters visible tabs → `visibleTabs` calculated based on preset's `tabIds` (line 71-73)
   - If preset is "all" or has empty `tabIds` → Shows all tabs
   - Otherwise → Shows only tabs in `activePreset.tabIds` (plus "All" tab)
   - Tab bar re-renders → Only selected tabs visible

3. **Edit Preset Flow:**
   - User clicks edit button → `handleEditPreset(preset)` (line 60)
   - Opens modal pre-filled → `setEditingPresetId(preset.id)`, `setNewPresetName(preset.name)`, `setSelectedTabIds(new Set(preset.tabIds))`
   - User modifies name/tabs → State updated
   - User clicks "Save" → `handleSaveEdit()` (line 68)
   - Calls `updatePreset(editingPresetId, newPresetName.trim(), Array.from(selectedTabIds))` → Updates preset in array
   - Saves to localStorage → `savePresets(updatedPresets)`
   - If edited preset is active → Tab bar re-renders with new tab selection

4. **Delete Preset Flow:**
   - User clicks delete button → `handleDeletePreset(presetId, e)` (line 78)
   - Confirmation dialog → `window.confirm('Are you sure...')`
   - If confirmed → `deletePreset(presetId)` → Removes preset from array
   - Saves to localStorage → `savePresets(updatedPresets)`
   - If deleted preset was active → Sets active preset to "all"
   - Tab bar re-renders → Shows all tabs

5. **Preset Persistence:**
   - On store initialization → `loadPresets()` reads from localStorage (`tabPresets` key)
   - If no stored presets → Returns default `[{ id: 'all', name: 'All', tabIds: [] }]`
   - On any preset change → `savePresets(presets)` writes to localStorage
   - Active preset also persisted separately → `localStorage.setItem('activePresetId', presetId)`

**Source of Truth:**
- `tabPresetStore.presets` - Array of preset objects (Source of Truth, persisted to localStorage)
- `tabPresetStore.activePresetId` - Currently active preset (persisted to localStorage)

**State Dependencies:**
- When `activePresetId` changes → `TabBar` filters visible tabs → Only tabs in preset shown
- When preset's `tabIds` changes → `TabBar` recalculates `visibleTabs` → Tab visibility updates
- When preset created → Added to `presets` array → Preset appears in dropdown
- When preset deleted → Removed from `presets` array → Preset removed from dropdown
---

#### ### 2.5 Moving & Copying Videos

**1: User-Perspective Description**

Users can move or copy videos between playlists using the context menu on video cards.

- **Move to Playlist**: Removes the video from the current playlist and adds it to the selected destination playlist.
- **Copy to Playlist**: Keeps the video in the current playlist and adds a duplicate to the selected destination playlist.

**2: Logic Flow**

1. **Initiation**: User selects action from video menu.
2. **Selection**: `PlaylistSelectionModal` appears (see `ui.md` 4.1.4).
3. **Execution**:
   - **Copy**: `addVideoToPlaylist` called for destination.
   - **Move**: `addVideoToPlaylist` called for destination, then `removeVideoFromPlaylist` called for source.
4. **UI Update**:
   - if **Move**: Video removed from current grid.
   - Success message (console) / Feedback.
