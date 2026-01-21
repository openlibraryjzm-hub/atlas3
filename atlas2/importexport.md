###3: Importing/Exporting

The Importing/Exporting system allows users to bring playlists into the application from YouTube or JSON files, and export playlists with their folder assignments for backup or sharing. The system supports both single playlist imports and bulk imports with automatic folder assignment.

**Related Documentation:**
- **API Layer**: See `api-bridge.md` for `importPlaylistFromJson` command and export function details
- **Database Schema**: See `database-schema.md` for `playlists`, `playlist_items`, and `video_folder_assignments` table structures
- **Playlist Management**: See `playlist&tab.md` Section 2.1 for playlist CRUD operations and folder system

---

#### ### 3.1 Config Playlist Modal

**1: User-Perspective Description**

Users see a unified "Config Playlist" modal when clicking the "Config Playlist" button in the Playlists or Videos page header. The modal features three top-level tabs:

- **Tabs**:
  - **Add**: Primary interface for adding videos and playlists (Unified Single & Bulk Import).
  - **Modify**: Placeholder for future batch editing features.
  - **JSON**: Advanced JSON import interface.

**"Add" Tab Features:**

- **Target Playlist Bar**:
  - **Selection Dropdown**: Select the destination playlist. Defaults to the current active playlist (if opened from Videos page) or "Unsorted".
  - **Create New (+) Button**: Toggles input mode to create a new playlist (enters Name/Description).
  
- **"All" Links Input**:
  - Large textarea for pasting mixed content:
    - YouTube Playlist URLs
    - Individual Video URLs
    - Local references
  - Supports newline, comma, pipe, or space separators.

- **Colored Folder Assignments**:
  - **Toggle**: Collapsible section to show/hide 16 colored folder fields.
  - **Folder Fields**: Grid of 16 colored textareas (Red, Orange, etc.).
  - **Function**: Links pasted into a color field are added to the target playlist AND assigned to that folder color.

- **Functionality**:
  - **Smart Parsing**: Automatically detects if a link is a playlist or single video.
  - **Deep Fetching**: Fetches all videos from playlists (handling pagination).
  - **Progress Tracking**: Shows detailed progress (Fetching X videos, Adding Y...).

**"JSON" Tab Features:**

- **JSON Input**: Textarea for raw JSON content.
- **File Upload**: Button to load JSON from file.
- **Format Support**: Supports legacy and new JSON formats with folder assignments.

**Progress & Error Display**:
- **Progress Bar**: Shows real-time completion status during import.
- **Error Box**: Displays validation or API errors.

**2: File Manifest**

**UI/Components:**
- `src/components/PlaylistUploader.jsx`: Main import modal component with YouTube and JSON support

**State Management:**
- `src/components/PlaylistUploader.jsx` (local state):
  - `uploadType`: 'youtube' or 'json'
  - `youtubeUrl`: YouTube playlist URL string
  - `jsonInput`: JSON text content
  - `playlistName`: Playlist name input value
  - `playlistDescription`: Playlist description input value
  - `loading`: Boolean for import in progress
  - `error`: Error message string (null if no error)
  - `progress`: Object with `{ current, total, message }` for progress tracking

**API/Bridge:**
- `src/api/playlistApi.js`:
  - `createPlaylist(name, description)` - Creates new playlist in database
  - `addVideoToPlaylist(playlistId, videoUrl, videoId, title, thumbnailUrl)` - Adds video to playlist
  - `assignVideoToFolder(playlistId, itemId, folderColor)` - Assigns video to folder
- External API:
  - YouTube Data API v3: `https://www.googleapis.com/youtube/v3/playlists` - Fetches playlist metadata
  - YouTube Data API v3: `https://www.googleapis.com/youtube/v3/playlistItems` - Fetches playlist videos
- `src/utils/youtubeUtils.js`:
  - `extractPlaylistId(url)` - Extracts playlist ID from YouTube URL
  - `extractVideoId(url)` - Extracts video ID from YouTube URL

**Backend:**
- `src-tauri/src/commands.rs`: Tauri command handlers for playlist/video operations
- `src-tauri/src/database.rs`: SQLite operations
- Database tables:
  - `playlists`: Playlist metadata
  - `playlist_items`: Videos in playlists
  - `video_folder_assignments`: Folder assignments

**3: The Logic & State Chain**

**Trigger → Action → Persistence Flow:**

1. **Unified Add Flow (Add Tab):**
   - User inputs links in "All" or Colored fields → `parseLinks(text)` extracts valid URLs
   - User selects Target Playlist (auto-selected to match current playlist if opened from Videos page) or enters New Playlist details
   - User clicks **Import**:
     - **Create/Get Playlist**: If "Create New" → `createPlaylist()`. If existing → Uses `selectedPlaylistId`.
     - **Process Links**:
       - Iterates through all fields ("All" + 16 colors).
       - For each valid link:
         - **YouTube Playlist**: Fetches all videos via `fetchPlaylistVideos()` (Source of Truth: YouTube API). Includes channel title and view counts.
         - **Single Video**: Fetches video metadata (Title, Thumbnails, Channel, Views).
         - **Local Reference**: Resolves local items.
     - **Add Videos**:
       - Adds videos to target playlist (`addVideoToPlaylist`).
       - If link came from a colored field, assigns folder (`assignVideoToFolder`).
     - **Progress Updates**: Updates `progress` state (Current/Total) during fetch and add.
   - **Completion**: `onUploadComplete()` called → Playlist List reloads, Video Grid reloads.

2. **JSON Import Flow (New Format with Folder Assignments):**
   - User selects/pastes JSON and clicks "Import Playlist" → `handleJsonUpload()` (line 177)
   - Parses JSON → `JSON.parse(jsonInput)` → Throws error if invalid
   - Checks format → If `data.version && data.playlist && data.videos` → New format
   - Creates playlist → `createPlaylist(name, description)` → Uses user input or JSON data
   - Loops through videos → For each video in `data.videos`:
     - Adds video → `addVideoToPlaylist(dbPlaylistId, videoUrl, videoId, title, thumbnailUrl)` → Returns `itemId`
     - Restores folder assignments → If `video.folder_assignments` array exists:
       - Loops through folder colors → `assignVideoToFolder(dbPlaylistId, itemId, folderColor)`
       - Tracks folder assignment count
     - Updates progress → Shows "Added X/total videos, Y folder assignments..."
   - Shows success message → "Successfully imported X videos with Y folder assignments!"
   - Calls `onUploadComplete()` callback

3. **JSON Import Flow (Legacy Format):**
   - If JSON doesn't have `version` field → Legacy format handler (line 262)
   - Validates structure → Checks for `playlist.videos` or `videos` array
   - Creates playlist → Uses user input or JSON playlist name/description
   - Loops through videos → Supports multiple formats:
     - `{ url, videoId, title }`
     - `{ video_url, video_id, title }`
     - `{ videoUrl, videoId, title }`
   - Extracts video data → Uses `extractVideoId()` if needed
   - Adds videos → `addVideoToPlaylist()` for each video
   - No folder assignments → Legacy format doesn't support folders

4. **Add Individual Video Flow:**
   - User enters Video URL → `extractVideoId(url)` validates link
   - User selects playlist → `targetPlaylistId` state updated
   - If "Create New Playlist" selected → `createPlaylist(name, description)` called first
   - Fetches video metadata → `GET /youtube/v3/videos?part=snippet,statistics&id={videoId}`
   - Adds video → `addVideoToPlaylist(playlistId, videoUrl, videoId, title, thumbnailUrl, author, viewCount)`
   - Shows success message and refreshes

5. **File Upload Flow:**
   - User clicks "Select JSON File" → `fileInputRef.current.click()` (line 479)
   - File picker opens → Filters to `.json` files only
   - User selects file → `handleFileSelect(event)` (line 148)
   - Reads file content → `file.text()` → Async file reading
   - Parses JSON → Attempts to parse to extract playlist name/description
   - Updates state → `setJsonInput(text)`, `setPlaylistName(name)`, `setPlaylistDescription(description)`
   - Textarea updates → Shows file content

5. **Error Handling:**
   - API errors → Caught in try/catch, error message displayed in red box
   - Invalid JSON → Shows "Invalid JSON format. Please check your JSON syntax."
   - Missing videos → Shows "No videos found in JSON data"
   - YouTube API errors → Shows specific error message from API response
   - Video add failures → Logged to console, import continues with remaining videos

**Source of Truth:**
- Database `playlists` table - Source of Truth for playlist data
- Database `playlist_items` table - Source of Truth for video data
- Database `video_folder_assignments` table - Source of Truth for folder assignments
- YouTube Data API v3 - Source of Truth for YouTube playlist metadata and videos

**State Dependencies:**
- When `uploadType` changes → UI switches between YouTube and JSON input fields
- When file selected → `jsonInput` updated → Textarea shows file content, playlist name/description pre-filled
- When import starts → `loading: true` → Submit button disabled, progress bar appears
- When progress updates → Progress bar width recalculates → Visual feedback updates
- When import completes → `onUploadComplete()` called → PlaylistsPage refreshes, new playlist appears in grid
- When error occurs → `error` state set → Red error box appears, import stops

---

#### ### 3.2 Bulk Import (Legacy/Integrated)

> [!NOTE]
> The Bulk Import functionality has been fully integrated into the **Add** tab of the **Config Playlist Modal** (Section 3.1). The logic below describes the underlying mechanism which is preserved, but the standalone modal is replaced by the unified interface.

**1: User-Perspective Description**

Users see a full-screen modal when clicking "Bulk Import" button in the Playlists page header:

- **Header**: "Bulk Import Playlists" title with close button (X) in top-right

- **Instructions**: Text at top explaining: "All playlists will be combined into a single playlist. Paste YouTube playlist URLs in the fields below. Links can be separated by newlines, commas, or spaces. Videos from playlists in folder-specific fields will be automatically assigned to that folder."

- **Playlist Metadata**:
  - **Playlist Name** input: Required field (red asterisk), destination playlist name
  - **Description** textarea: Optional, destination playlist description

- **Input Fields Grid**: 3-column grid (responsive: 1 column on mobile, 2 on tablet, 3 on desktop) with 17 fields:
  - **"All (No Folder)"** field: Textarea for playlists that won't be assigned to any folder
  - **16 Folder Color Fields**: One for each folder color (Red, Orange, Amber, Yellow, Lime, Green, Emerald, Teal, Cyan, Sky, Blue, Indigo, Violet, Purple, Fuchsia, Pink)
  - Each folder field shows:
    - Colored dot indicator (matching folder color)
    - Folder name (e.g., "Red")
    - Link count in parentheses (e.g., "(3 links)")
    - Plus button (+) to add existing playlists/folders
    - Textarea with colored border (when content exists, border matches folder color)
    - Placeholder: "Paste playlist URLs here or click + to add existing..."

- **Add Existing Playlists/Folders Modal** (when plus button clicked):
  - Modal overlay with list of all playlists
  - Each playlist shows:
    - Playlist name and description
    - Folder count (e.g., "3 folders available")
    - Expand/collapse button (chevron) if folders exist
    - Checkmark when selected
  - When expanded, shows folders with:
    - Colored dot matching folder color
    - Folder name (e.g., "Red Folder")
    - Video count
    - Checkmark when selected
  - "Add (X)" button at bottom (disabled if nothing selected)
  - Selected items added to the field that opened the modal

- **Progress Display** (during import):
  - Progress message: Current step (e.g., "Fetching videos from 2/5...", "Adding videos... 150/200")
  - Progress counter: Shows either "X/Y playlists" or "X/Y videos" depending on phase
  - Current playlist name: Shows which playlist/folder is being processed
  - Progress bar: Blue bar showing percentage completion
  - Two-phase progress:
    - Phase 1: Fetching from playlists (shows playlist count)
    - Phase 2: Adding videos (shows video count)

- **Error Display**: Red error box with multi-line error messages (shows up to 5 errors, then "... and X more")

- **Footer Buttons**:
  - **Cancel** button: Closes modal
  - **Import All Playlists** button: Starts bulk import (disabled during import, shows "Importing..." when loading)

**2: File Manifest**

**UI/Components:**
- `src/components/BulkPlaylistImporter.jsx`: Main bulk import modal component
- `src/components/PlaylistFolderSelector.jsx`: Modal for selecting existing playlists/folders to add

**State Management:**
- `src/components/BulkPlaylistImporter.jsx` (local state):
  - `playlistName`: Destination playlist name
  - `playlistDescription`: Destination playlist description
  - `playlistLinks`: Object mapping field IDs to link strings:
    - `all`: Links for videos with no folder assignment
    - `{colorId}`: Links for videos to assign to that folder color
  - `loading`: Boolean for import in progress
  - `error`: Error message string (null if no error)
  - `showSelector`: Boolean for showing PlaylistFolderSelector modal
  - `selectorField`: Field ID that opened the selector ('all' or color ID)
  - `progress`: Object with `{ current, total, message, currentPlaylist, videosProcessed, totalVideos }`
- `src/components/PlaylistFolderSelector.jsx` (local state):
  - `playlists`: Array of all playlists
  - `folders`: Array of all folders
  - `expandedPlaylists`: Set of expanded playlist IDs
  - `selectedItems`: Array of selected identifiers (e.g., `["local:playlist:1", "local:folder:1:red"]`)

**API/Bridge:**
- `src/api/playlistApi.js`:
  - `createPlaylist(name, description)` - Creates destination playlist
  - `addVideoToPlaylist(playlistId, videoUrl, videoId, title, thumbnailUrl)` - Adds video to playlist
  - `assignVideoToFolder(playlistId, itemId, folderColor)` - Assigns video to folder
  - `getPlaylistItems(playlistId)` - Gets videos from local playlist
  - `getVideosInFolder(playlistId, folderColor)` - Gets videos from local folder
  - `getAllPlaylists()` - Gets all playlists for selector
  - `getAllFoldersWithVideos()` - Gets all folders for selector
- External API:
  - YouTube Data API v3: Same endpoints as single import
- `src/utils/youtubeUtils.js`:
  - `extractPlaylistId(url)` - Extracts playlist ID from YouTube URL
- `src/utils/folderColors.js`:
  - `FOLDER_COLORS` - Array of 16 folder color definitions

**Backend:**
- `src-tauri/src/commands.rs`: Tauri command handlers
- `src-tauri/src/database.rs`: SQLite operations
- Database tables: Same as single import

**3: The Logic & State Chain**

**Trigger → Action → Persistence Flow:**

1. **Link Parsing Flow:**
   - User pastes links in textarea → `parseLinks(text)` (line 32) called on blur/change
   - Splits by newlines first → `text.split(/\n/)`
   - Then splits by commas → If line contains `,`, splits by comma
   - Then splits by semicolons → If line contains `;`, splits by semicolon
   - Then splits by pipes → If line contains `|`, splits by pipe
   - Finally splits by whitespace → `line.split(/\s+/)`
   - Filters valid links → Accepts:
     - YouTube URLs (contains `youtube.com/playlist`, `youtu.be`, or `youtube.com/watch` with `list=`)
     - Local references: `local:playlist:{id}` or `local:folder:{playlistId}:{color}`
   - Removes duplicates → Filters array to unique values
   - Returns array of valid links

2. **Add Existing Playlists/Folders Flow:**
   - User clicks plus button on field → `handleAddButtonClick(field)` (line 389)
   - Sets `selectorField` to field ID → Stores which field opened the selector
   - Opens `PlaylistFolderSelector` modal → `setShowSelector(true)`
   - User selects playlists/folders → Toggles selection in `selectedItems` array
   - Identifiers format:
     - Playlist: `local:playlist:{playlistId}`
     - Folder: `local:folder:{playlistId}:{folderColor}`
   - User clicks "Add" → `handleSelectorSelect(selectedItems)` (line 394)
   - Converts identifiers to newline-separated string → `selectedItems.join('\n')`
   - Appends to field's current value → `currentValue ? `${currentValue}\n${newItems}` : newItems`
   - Updates `playlistLinks[selectorField]` → Field textarea updates with new links
   - Closes selector modal

3. **Bulk Import Flow:**
   - User clicks "Import All Playlists" → `handleBulkImport()` (line 172)
   - Validates playlist name → Throws error if empty
   - Collects all links from all fields → Loops through `playlistLinks`:
     - Parses links from "all" field → `parseLinks(playlistLinks.all)`
     - Adds to `playlistsToImport` array with `folderColor: null`
     - Parses links from each folder field → `parseLinks(playlistLinks[color.id])`
     - Adds to array with `folderColor: color.id`
   - Creates destination playlist → `createPlaylist(playlistName, playlistDescription)` → Returns `dbPlaylistId`
   - Phase 1: Fetch videos from all playlists → Loops through `playlistsToImport`:
     - Updates progress → Shows "Fetching videos from X/Y..."
     - Determines source type:
       - If `url.startsWith('local:playlist:')` → `fetchLocalPlaylistVideos(playlistId)` (line 141)
       - If `url.startsWith('local:folder:')` → `fetchLocalFolderVideos(playlistId, folderColor)` (line 157)
       - Otherwise → `fetchPlaylistVideos(url)` (YouTube URL) (line 74)
     - Fetches videos → Returns `{ sourcePlaylistName, videos }`
     - Adds folder color to each video → `videos.forEach(video => allVideosWithFolders.push({ ...video, folderColor }))`
     - Tracks total videos → `totalVideos += videos.length`
     - Updates progress → Shows "Fetched X videos from 'Playlist Name'"
     - Handles errors → Logs error, continues with next playlist
   - Phase 2: Add all videos to destination playlist → Loops through `allVideosWithFolders`:
     - Updates progress → Shows "Adding videos... X/Y"
     - Adds video → `addVideoToPlaylist(dbPlaylistId, videoUrl, videoId, title, thumbnailUrl)` → Returns `itemId`
     - Assigns to folder if specified → `assignVideoToFolder(dbPlaylistId, itemId, folderColor)`
     - Tracks counts → `videosAdded++`, `foldersAssigned++`
     - Updates progress → Shows video count progress
   - Shows final results → "Import complete! X videos added, Y assigned to folders, Z playlists failed"
   - Displays errors if any → Shows up to 5 errors, then "... and X more"
   - Calls `onImportComplete()` callback → Closes modal, refreshes playlist list

4. **Local Playlist/Folder Fetching:**
   - **Local Playlist**: `fetchLocalPlaylistVideos(playlistId)` (line 141)
     - Calls `getPlaylistItems(parseInt(playlistId))` → Gets all videos from local playlist
     - Maps to format → `{ videoId, videoUrl, title, thumbnailUrl }`
     - Returns `{ sourcePlaylistName: "Local Playlist {id}", videos }`
   - **Local Folder**: `fetchLocalFolderVideos(playlistId, folderColor)` (line 157)
     - Calls `getVideosInFolder(parseInt(playlistId), folderColor)` → Gets videos in folder
     - Maps to format → Same as local playlist
     - Returns `{ sourcePlaylistName: "Local {color} Folder", videos }`

5. **YouTube Playlist Fetching** (same as single import):
   - Extracts playlist ID → `extractPlaylistId(playlistUrl)`
   - Fetches playlist metadata → Gets playlist name
   - Fetches all videos (paginated) → Handles `nextPageToken` for large playlists
   - Converts to format → `{ videoId, videoUrl, title, thumbnailUrl }`
   - Returns `{ sourcePlaylistName, videos }`

6. **Error Handling:**
   - Invalid playlist name → Shows error, stops import
   - No valid links → Shows error, stops import
   - Playlist fetch failures → Logged, import continues with remaining playlists
   - Video add failures → Logged, import continues with remaining videos
   - Folder assignment failures → Logged, video still added (just without folder)
   - Final error summary → Shows all errors at end (up to 5, then count)

**Source of Truth:**
- Database `playlists` table - Source of Truth for playlist data
- Database `playlist_items` table - Source of Truth for video data
- Database `video_folder_assignments` table - Source of Truth for folder assignments
- YouTube Data API v3 - Source of Truth for YouTube playlist metadata and videos
- Local database - Source of Truth for local playlist/folder references

**State Dependencies:**
- When links pasted in field → `parseLinks()` called → Link count updates in field label
- When plus button clicked → `showSelector: true` → PlaylistFolderSelector modal opens
- When items selected in selector → `playlistLinks[selectorField]` updated → Field textarea shows new links
- When import starts → `loading: true` → Buttons disabled, progress bar appears
- When progress updates → Progress bar width recalculates → Visual feedback updates
- When import completes → `onImportComplete()` called → PlaylistsPage refreshes, new playlist appears in grid
- When error occurs → `error` state set → Red error box appears, import continues with remaining items