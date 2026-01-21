# Technical Roadmap: Atlas 3

## Phase 1: The Foundation (Completed)
- [x] Establish WPF Project (`Atlas3`).
- [x] Implement Triple-Layer Architecture (App, Browser, Overlay).
- [x] Implement "Mock Browser" with Tab support (WebView2).
- [x] Implement Robust Split-Screen Logic (Column Squashing).
- [x] Validate Z-Ordering and Visibility toggles.

## Phase 2: The Import (Frontend Migration)
**Goal:** Replace the `tauri.app` placeholder in Layer 1 with the actual React application.
- [x] Locate existing `dist` or source files from the legacy project.
- [x] Copy assets to a local folder (e.g., `wwwroot`).
- [x] Configure Layer 1 WebView2 to serve these local files (Development & Production modes).
- [x] Verify standard React functionality (Navigation, UI rendering) within the C# Host.

## Phase 3: The Backend (Completed)
**Goal:** Re-implement backend logic so the React App works without Rust.
- [x] **Database:** Set up `Microsoft.Data.Sqlite` in C#.
- [x] **Schema:** Port existing SQLite schema to the new C# database.
- [x] **Bridge:** Create a `Bridge` class in C# to handle messages from React.
    *   *Mechanism:* `WebView2.CoreWebView2.WebMessageReceived`.
- [x] **Commands:** Re-implement key commands (e.g., `GetVideos`, `SavePlaylist`) in C#.

## Phase 4: The Player (MPV Integration)
**Goal:** Replace the Red Placeholder with a working MPV Player.
- [ ] Download `libmpv` binaries.
- [ ] Configure `Mpv.NET` in XAML.
- [ ] Create a C# Controller to handle Play/Pause/Load URL commands.
- [ ] Implement logic to "hijack" URLs from Layer 1/2 and play them in Layer 3.
