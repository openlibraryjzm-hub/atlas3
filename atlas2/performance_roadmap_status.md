### Phase 1: Batch Data Fetching (High Impact) - **COMPLETED**
**Goal:** Reduce 50+ database calls to **1** call per page load.
**Implementation:**
- **Backend (Rust)**:
  - Added `get_all_folder_assignments_for_playlist` (returns map of video_id -> folders).
  - Added `get_all_playlist_metadata` (returns count, thumbnail, recent video for ALL playlists).
- **Frontend (React)**:
  - Refactored `VideosPage.jsx` to use single batch fetch.
  - Refactored `PlaylistsPage.jsx` to load all grid data in parallel.

### Phase 2: Optimistic UI & Transition (Perceived Speed) - **COMPLETED**
**Goal:** Make the UI feel instant even while data is loading.
**Implementation:**
- **Skeleton Components**: Created `VideoCardSkeleton` and `PlaylistCardSkeleton`.
- **Animations**: Added `shimmer` (css keyframes) and `gpu-scroll`.
- **Integration**: `VideosPage` and `PlaylistsPage` now display skeletons immediately on mount/load.
