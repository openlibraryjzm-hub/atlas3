# Frontend to C# WebView2 Porting Guide

This document outlines the structure of the **React Frontend** ("Group 1 files") and provides instructions for integrating it into a C# WPF/WebView2 application.

## 1. File Structure Overview

These files constitute the entire "View" layer of the application. They are designed to be served by the Vite development server (during dev) or compiled into static HTML/JS/CSS (for production).

### Root Configuration
*   **`index.html`**: The entry point. This is the file you will load into `WebView2`.
*   **`package.json`**: Defines dependencies and scripts.
    *   **Dev Command**: `npm run dev` (starts server at `http://localhost:1420`)
    *   **Build Command**: `npm run build` (outputs to `dist/` folder)
*   **`vite.config.js`**: Configures the build tool.
    *   **Port**: Defaults to `1420`.
    *   **Plugins**: Configured for React.
*   **`tailwind.config.js` / `postcss.config.js`**: Handles the utility-first CSS styling.

### Source Code (`src/`)
*   **`src/main.jsx`**: The React bootstrapping logic. Finds `<div id="root">` in `index.html` and renders the App.
*   **`src/App.jsx`**: The main application component.
*   **`src/LayoutShell.jsx`**: A high-level layout component likely acting as the window frame (check for window drag regions).
*   **`src/components/`**: Contains all UI widgets (Player, Playlist Grids, Sidebars, etc.).
*   **`src/api/`**: **CRITICAL**. This constitutes the bridge to the backend.
*   **`src/store/`**: State management (Zustand). Holds data in memory on the JS side.

## 2. Integration Strategy for C#

### Step A: Hosting the Frontend
You have two modes of operation:

1.  **Development Mode (Hot Reloading)**
    *   Run `npm run dev` in the frontend directory.
    *   Initialize WebView2 Source: `webview.Source = new Uri("http://localhost:1420");`
    *   *benefit*: Changes to `.jsx` files update the UI instantly without restarting the C# app.

2.  **Production Mode (Embedded)**
    *   Run `npm run build`.
    *   Copy the contents of the `dist/` folder to your C# application's output directory (e.g., `bin/Debug/net8.0/wwwroot`).
    *   Initialize WebView2 Source: `webview.Source = new Uri(Path.Combine(AppContext.BaseDirectory, "wwwroot", "index.html"));`

### Step B: The "Seam" (replacing Tauri)

The frontend currently uses Tauri's generic `invoke` function to talk to Rust. You must intercept or replace this to talk to C#.

**Target File:** `src/api/playlistApi.js`

**Current Logic:**
```javascript
import { invoke } from '@tauri-apps/api/core';

export const getAllPlaylists = async () => {
  return await invoke('get_all_playlists');
};
```

**Required C# Logic:**
You need to bridge `invoke` to `window.chrome.webview.postMessage` or a `hostObject`.

**Option 1: Polyfill `invoke` (Recommended)**
Inject a Javascript shim that redefines `invoke` to send messages to C#, so you don't have to rewrite every API call in React.
```javascript
window.__TAURI__ = {
    invoke: function(command, args) {
        return window.chrome.webview.hostObjects.dotnetBridge.Invoke(command, args);
    }
};
```

**Option 2: Rewrite `playlistApi.js`**
Modify the file to use your C# bridge directly.

## 3. Necessary Backend Handlers
The C# backend must implement handlers for the following commands found in `playlistApi.js`. These map 1:1 to the Rust `commands.rs` logic.

**Playlist Management**
*   `create_playlist`
*   `get_all_playlists`
*   `get_all_playlist_metadata`
*   `get_playlist`
*   `update_playlist`
*   `delete_playlist`

**Video/Item Management**
*   `add_video_to_playlist`
*   `get_playlist_items`
*   `remove_video_from_playlist`
*   `reorder_playlist_item`

**Features**
*   `assign_video_to_folder` / `get_video_folder_assignments`
*   `update_video_progress` / `get_all_video_progress`
*   `get_watch_history` / `add_to_watch_history`
*   `export_playlist` / `import_playlist`

## 4. Layering & Transparency
To achieve the "HUD" effect over other WebView2 instances (Mock Browser / MPV):

1.  **Frontend CSS**: Ensure `html` and `body` have `background-color: transparent`.
2.  **C# Config**: Set `webview.DefaultBackgroundColor = System.Drawing.Color.Transparent;`
