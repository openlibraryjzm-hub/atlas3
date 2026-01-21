# Navigation & Routing

This document explains how navigation works throughout the application, including page routing, playlist navigation, video navigation, and preview navigation flows.

**Related Documentation:**
- **Player Controller**: See `advanced-player-controller.md` for navigation controls and preview system implementation
- **UI Pages**: See `ui.md` for page components (PlaylistsPage, VideosPage, HistoryPage) that respond to navigation
- **State Management**: See `state-management.md` for stores that manage navigation state (`navigationStore`, `playlistStore`, `folderStore`)
- **Playlist Management**: See `playlist&tab.md` for playlist selection and folder filtering flows

## Overview

The application has multiple navigation systems that work together:

1. **Page Navigation** - Switching between Playlists/Videos/History pages (with Back history)
2. **Playlist Navigation** - Moving between playlists and folders
3. **Video Navigation** - Moving between videos within a playlist
4. **Preview Navigation** - Previewing playlists/videos without changing playback
5. **Folder Navigation** - Filtering videos by folder color

## Page Navigation

### Page Types

The application has three main pages:
- **Playlists Page** (`currentPage === 'playlists'`) - Grid of playlist cards
- **Videos Page** (`currentPage === 'videos'`) - Grid of video cards from current playlist
- **History Page** (`currentPage === 'history'`) - Grid of watch history cards
- **Likes Page** (`currentPage === 'likes'`) - Grid of liked video cards
- **Pins Page** (`currentPage === 'pins'`) - Grid of pinned video cards
- **Settings Page** (`currentPage === 'settings'`) - Configuration and theming
- **Support Page** (`currentPage === 'support'`) - Tabbed support hub

### Navigation Flow

**Trigger**: User clicks tab in `TopNavigation` component

**Flow:**
1. User clicks tab → `handleTabClick(tabId)` (TopNavigation.jsx)
2. `setCurrentPage(tabId)` called → Updates `navigationStore.currentPage`
3. If in full mode → `setViewMode('half')` → Auto-switches to show side menu
4. `App.jsx` checks `currentPage` → Conditionally renders page component:
   ```javascript
   {currentPage === 'playlists' && <PlaylistsPage />}
   {currentPage === 'videos' && <VideosPage />}
   {currentPage === 'history' && <HistoryPage />}
   {currentPage === 'likes' && <LikesPage />}
   {currentPage === 'pins' && <PinsPage />}
   {currentPage === 'settings' && <SettingsPage />}
   {currentPage === 'support' && <SupportPage />}
   ```
5. Page component mounts → Loads data, displays grid

**State Management:**
- `navigationStore.currentPage` - Source of Truth for active page
- `navigationStore.history` - Stack of visited pages for back navigation
- Persistence: None - resets to 'playlists' on app start

**Dependencies:**
- When `currentPage` changes → Different page component rendered
- When `currentPage` changes → Different page component rendered
- When page changes in full mode → View mode auto-switches to half

### Back Button Navigation

**Trigger**: User clicks Back button in TopNavigation (top-left of side menu)

**Flow:**
1. User clicks Back button → `goBack()` called (TopNavigation.jsx)
2. `navigationStore` pops last page from `history` stack
3. Sets `currentPage` to previous page
4. `TopNavigation` updates → Back button visibility depends on `history.length > 0`

**Logic:**
- `setCurrentPage(page)`: Pushes current page to `history` stack before changing (unless strictly replacing).
- `goBack()`: Restores previous page, removes from history.
- Preview Mode: If user is previewing a playlist/video, clicking Back may also trigger `clearPreview()` if implemented to exit preview context.


---

## Playlist Navigation

### Hierarchical Navigation System

Playlists and folders are organized in a flat `navigationItems` array that represents a hierarchical structure:

```
[Playlist1, Playlist1-FolderA, Playlist1-FolderB, Playlist2, Playlist2-FolderA, ...]
```

**Structure:**
- Each item has `type: 'playlist' | 'folder'`
- Playlists appear first, followed by their folders
- Folders are interleaved with their parent playlists

### Navigation Flow

**Trigger**: User clicks next/prev playlist buttons in PlayerController

**Flow:**
1. User clicks next/prev → `nextPlaylist()` or `previousPlaylist()` called
2. Function gets current `navigationItems` and `currentNavigationIndex`
3. Calculates next/prev index → Wraps around if at end/start
4. Gets next/prev item from `navigationItems`
5. Updates state based on item type:
   - **Playlist**: Sets `currentPlaylistIndex`, clears `currentFolder`
   - **Folder**: Sets `currentFolder`, sets `currentPlaylistIndex` to -1
6. Updates `currentNavigationIndex` → Tracks position in navigation
7. Loads items for playlist/folder → `getPlaylistItems()` or `getVideosInFolder()`
8. Sets playlist items → `setPlaylistItems(items, playlistId, folderInfo)`
9. Starts playing first video → `onVideoSelect(firstVideo.video_url)`

**State Management:**
- `playlistStore.navigationItems` - Flat array of playlists and folders
- `playlistStore.currentNavigationIndex` - Current position in navigationItems
- `playlistStore.currentPlaylistIndex` - Index in allPlaylists array
- `playlistStore.currentFolder` - Current folder context `{ playlist_id, folder_color }`

**Building Navigation Items:**
- `buildNavigationItems(playlists, folders)` - Creates flat array
- Called when playlists/folders load → Updates `navigationItems`
- Includes stuck folders even when `showColoredFolders` is off

---

## Video Navigation

### Within Playlist Navigation

**Trigger**: User clicks next/prev video buttons in PlayerController

**Flow:**
1. User clicks next/prev → `nextVideo()` or `previousVideo()` called
2. Function gets `currentPlaylistItems` and `currentVideoIndex`
3. Calculates next/prev index → Wraps around if at end/start
4. Updates `currentVideoIndex` → Saves to localStorage
5. Gets video from `currentPlaylistItems[currentVideoIndex]`
6. Calls `onVideoSelect(video.video_url)` → Player starts playing new video
7. Watch history recorded → `addToWatchHistory()` called

**State Management:**
- `playlistStore.currentPlaylistItems` - Videos in current playlist
- `playlistStore.currentVideoIndex` - Index of currently playing video
- Persistence: `last_video_index_{playlistId}` saved to localStorage

**Shuffle Navigation:**
- When playlist is shuffled → `shuffled_order_{playlistId}` saved to localStorage
- Navigation uses shuffled order instead of original order
- Shuffled order restored when playlist loads

---

## Preview Navigation

### Preview System Overview

Preview navigation allows users to browse playlists/videos without interrupting current playback. Users can commit or revert changes.

### Playlist Preview Flow

**Trigger**: User clicks preview button or navigates playlist in preview mode

**Flow:**
1. User enters preview → `setPreviewPlaylist(items, playlistId, folderInfo)` called
2. `playlistStore` updates:
   - `previewPlaylistItems` = items
   - `previewPlaylistId` = playlistId
   - `previewFolderInfo` = folderInfo
3. Checkpoint saved → `setPlaylistCheckpoint()` saves current state
4. `VideosPage` detects preview → Shows `previewPlaylistItems` instead of `currentPlaylistItems`
5. User can browse preview items → Navigation doesn't affect actual playback
6. User commits → `handleCommit('playlist')`:
   - Loads preview items → `setPlaylistItems(previewPlaylistItems, previewPlaylistId)`
   - Updates navigation index → Syncs with preview position
   - Starts playing first video → `onVideoSelect(firstVideo.video_url)`
   - Clears preview state → `clearPreview()`
7. User reverts → `handleRevert('playlist')`:
   - Restores checkpoint → `setPlaylistItems(checkpoint.items, checkpoint.playlistId)`
   - Clears preview state → `clearPreview()`

### Video Preview Flow

**Trigger**: User navigates videos in preview mode

**Flow:**
1. User enters video preview → `setPreviewVideoIndex(index)` called
2. Checkpoint saved → `setVideoCheckpoint()` saves current video index
3. Preview video highlighted → Visual indicator shows preview
4. User commits → `handleCommit('video')`:
   - Sets video index → `setCurrentVideoIndex(previewVideoIndex)`
   - Starts playing video → `onVideoSelect(video.video_url)`
   - Clears preview state
5. User reverts → `handleRevert('video')`:
   - Restores checkpoint → `setCurrentVideoIndex(checkpoint)`
   - Clears preview state

**State Management:**
- `playlistStore.previewPlaylistItems` - Preview playlist items (null when not previewing)
- `playlistStore.previewPlaylistId` - Preview playlist ID
- `playlistStore.previewFolderInfo` - Preview folder info
- Local component state: `previewNavigationIndex`, `previewVideoIndex`, checkpoints

---

## Folder Navigation

### Folder Filtering Flow

**Trigger**: User clicks folder color dot in FolderSelector

**Flow:**
1. User clicks folder color → `setSelectedFolder(folderColor)` called
2. `folderStore.selectedFolder` updates
3. `VideosPage` detects change → `useEffect` triggers
4. If `selectedFolder === null` → Shows all videos from `currentPlaylistItems`
5. If `selectedFolder` set → Calls `getVideosInFolder(playlistId, folderColor)`
6. Updates `displayedVideos` → Grid shows only folder videos
7. Folder assignments loaded → `loadVideoFolders(assignments)` updates store

**State Management:**
- `folderStore.selectedFolder` - Currently selected folder (null = all)
- `VideosPage.displayedVideos` - Filtered videos array

**Dependencies:**
- When `selectedFolder` changes → Videos filtered → Grid updates
- When playlist changes → `selectedFolder` reset to null → Shows all videos

---

## Navigation State Preservation

### Video Index Preservation

When navigating between playlists, the last video index is preserved:

1. **On Playlist Load**: 
   - Checks localStorage: `last_video_index_{playlistId}`
   - If exists and valid → Restores video index
   - If not exists → Starts at index 0

2. **On Video Change**:
   - Saves to localStorage: `last_video_index_{playlistId}`
   - Also saves for folders: `last_video_index_{playlistId}_{folderColor}`

3. **On Shuffle**:
   - Shuffled order saved: `shuffled_order_{playlistId}`
   - Original order preserved for restoration

### Playlist Context Preservation

When navigating playlists:
- `currentPlaylistId` preserved → Used for folder assignments, progress tracking
- `currentPlaylistIndex` preserved → Used for next/prev navigation
- `currentFolder` preserved → Used for folder-specific navigation

---

## Navigation Entry Points

### Entry Point 1: Playlist Card Click

**Flow:**
1. User clicks playlist card → `onClick` handler (PlaylistsPage.jsx)
2. Calls `getPlaylistItems(playlistId)` → Gets videos
3. Calls `setPlaylistItems(items, playlistId)` → Updates store
4. Calls `onVideoSelect(firstVideo.video_url)` → Starts playing
5. Navigates to Videos page → `setCurrentPage('videos')` (if not already there)

### Entry Point 2: Support Hub Navigation

**Flow (Promo/Resources Links):**
1. User clicks content link (Future Plans / Resources) → `navigateToPlaylist(keyword)` (SupportPage.jsx)
2. Searches loaded playlists for name match
3. Calls `getPlaylistItems(playlistId)` → Gets videos
4. Calls `setPlaylistItems(items, playlistId)` → Updates store
5. Navigates to Videos page → `setCurrentPage('videos')`

### Entry Point 3: Folder Card Click

**Flow:**
1. User clicks folder card → `onClick` handler
2. Calls `getVideosInFolder(playlistId, folderColor)` → Gets folder videos
3. Calls `setPlaylistItems(items, playlistId, { playlist_id, folder_color })` → Updates store with folder context
4. Calls `onVideoSelect(firstVideo.video_url)` → Starts playing
5. Navigates to Videos page → `setCurrentPage('videos')`

### Entry Point 4: Video Card Click

**Flow:**
1. User clicks video card → `handleVideoClick(video, index)` (VideosPage.jsx)
2. Finds original index → `activePlaylistItems.findIndex()`
3. Updates `selectedVideoIndex` → Card highlights
4. Calls `onVideoSelect(video.video_url)` → Starts playing
5. `App.jsx` routes to main player via `handleVideoSelect()`:
   - Checks if video is in `currentPlaylistItems` → If found, sets `currentVideoIndex` and plays
   - If not in current playlist → Searches through all playlists to find containing playlist
   - When found → Loads playlist items, sets playlist context, sets video index, starts playing
6. Video starts playing → Updates `currentVideoIndex`

### Entry Point 5: History Card Click

**Flow:**
1. User clicks history card → `handleVideoClick(item)` (HistoryPage.jsx)
2. Calls `onVideoSelect(item.video_url)` → Starts playing
3. `App.jsx` searches for video in playlists → Finds containing playlist
4. Loads playlist → `setPlaylistItems(items, playlistId)`
5. Sets video index → `setCurrentVideoIndex(index)`
6. Video starts playing → Watch history may be updated

### Entry Point 6: PlayerController Navigation

**Flow:**
1. User clicks next/prev playlist → `nextPlaylist()` / `previousPlaylist()`
2. Gets next/prev item from `navigationItems`
3. Loads items → `getPlaylistItems()` or `getVideosInFolder()`
4. Sets playlist items → `setPlaylistItems(items, playlistId, folderInfo)`
5. Starts playing first video → `onVideoSelect(firstVideo.video_url)`

### Entry Point 7: Play Button Folder Cycle

**Flow:**
1. User clicks Play Button (center of navigation controls) → `handlePlayButtonToggle()`
2. Logic determines next colored folder in sequence (or 'All')
3. Loads items:
   - If 'All': `getPlaylistItems(currentPlaylistId)`
   - If 'Folder': `getVideosInFolder(currentPlaylistId, nextColor)`
4. Sets playlist items → `setPlaylistItems(newItems, currentPlaylistId, folderInfo)`
5. Checks if `activeVideoItem` exists in new list:
   - If yes: Continues playing current video
   - If no: Auto-plays first video of new list → `setCurrentVideoIndex(0)`

---

### Entry Point 8: Browser Integration Navigation
 
+**Flow (Opening Browser):**
+1. User clicks **Monitor icon** in Top Navigation → `handleBrowserClick()` (TopNavigation.jsx)
+2. Sends `set_browser_mode('split')` to C# → App squashed to left, Browser visible on right
+3. Sets `viewMode` to `full` → Hides Layer 1 side menu (Playlists/Videos Grid)
+4. Calls `showBrowser()` → Updates `browserStore` visibility state
+
+**Flow (Closing/Hiding Browser):**
+1. User clicks any navigation tab (Playlists, Videos, etc.) or a grid button in PlayerController
+2. Handler detects `isBrowserVisible` is true
+3. Calls `hideBrowser()` → Updates store
+4. Sends `set_browser_mode('hide')` to C# → Browser collapses, App takes full window
+5. If clicking a navigation tab → Sets `viewMode` to `half` → Restores the side menu visibility
+
+---
+
+## Navigation State Dependencies

### Dependency Chain

```
navigationStore.currentPage
    ↓
App.jsx (renders page)
    ↓
playlistStore.currentPlaylistItems
    ↓
VideosPage (displays videos)
    ↓
folderStore.selectedFolder
    ↓
displayedVideos (filtered)
```

### Cascading Updates

1. **Playlist Change**:
   - `currentPlaylistItems` changes
   - `currentPlaylistId` changes
   - `selectedFolder` reset to null
   - Folder assignments reloaded
   - Video index restored from localStorage

2. **Folder Selection**:
   - `selectedFolder` changes
   - `displayedVideos` filtered
   - Grid re-renders with filtered videos

3. **Video Change**:
   - `currentVideoIndex` changes
   - Video URL recalculated
   - YouTubePlayer receives new video
   - Watch history recorded
   - Progress saved

---

## Navigation Modes

### Mode 1: Direct Navigation
- User clicks playlist/video → Immediately loads and plays
- No preview, no checkpoint
- State updates immediately

### Mode 2: Preview Navigation
- User enters preview mode → Checkpoint saved
- User browses preview items → No playback change
- User commits → Checkpoint applied, playback changes
- User reverts → Checkpoint restored, no playback change

### Mode 3: Folder Navigation
- User selects folder → Videos filtered
- User navigates within folder → Uses folder's video list
- User deselects folder → Shows all videos

---

## Best Practices

1. **Always save checkpoints** - Before entering preview mode, save current state
2. **Clear preview state** - After commit/revert, always clear preview state
3. **Reset folder filter** - When playlist changes, reset `selectedFolder` to null
4. **Preserve video index** - Save video index to localStorage for resume playback
5. **Handle empty states** - Check if items exist before navigation
6. **Update navigation index** - Keep `currentNavigationIndex` in sync with actual position

---

## Troubleshooting

### Navigation Not Working
- Check if `navigationItems` is populated → Call `buildNavigationItems()`
- Check if `currentNavigationIndex` is valid → Should be >= 0 and < navigationItems.length
- Check if playlist items loaded → `currentPlaylistItems.length > 0`

### Preview Not Clearing
- Check if `clearPreview()` is called after commit/revert
- Check if preview state is checked in components → `previewPlaylistItems || currentPlaylistItems`

### Folder Filter Not Working
- Check if `selectedFolder` is set → Should be folder color ID or null
- Check if `getVideosInFolder()` returns videos → May be empty if no assignments
- Check if folder assignments loaded → `videoFolderAssignments` should be populated

### Video Index Wrong
- Check localStorage for saved index → `last_video_index_{playlistId}`
- Check if shuffled order exists → May need to use shuffled index
- Check if index is within bounds → `index < currentPlaylistItems.length`

