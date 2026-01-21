# Atlas 3: Layer 2 - The Mock Browser

## Overview
Layer 2 of Atlas 3 is a fully functional web browser environment designed to run alongside the main application (Layer 1). It allows users to browse the web (e.g., Google, YouTube) without leaving the Atlas environment, supporting distinct use cases like managing playlists while browsing.

## Architecture
The browser is implemented as a standalone WPF UserControl to maintain separation of concerns from the main window logic.
*   **Component**: `Atlas3.Controls.BrowserOverlay`
*   **Hosting**: It is hosted in `MainWindow.xaml`'s `BrowserLayer` Grid.
*   **Underlying Tech**: Microsoft WebView2 (Edge Chromium).

### Key Features
1.  **Tabbed Browsing**:
    *   Uses a standard WPF `TabControl`.
    *   Each tab hosts its own independent `WebView2` instance.
    *   Tabs show the current page title dynamically.
2.  **Persistent Sessions**:
    *   All WebView2 instances share a persistent User Data Folder located at `browser_profile/` in the application root.
    *   **Benefit**: Cookies, logins (Gmail, YouTube), and cache are preserved between app restarts.
3.  **Navigation Controls**:
    *   Back / Forward (State-aware, enabled only when history exists).
    *   Reload.
    *   Address Bar (Enter key or Go button).
4.  **Deferred Initialization (Crucial)**:
    *   WebView2 **cannot** initialize correctly if it is created while invisible (Collapsed).
    *   **Solution**: The `BrowserOverlay` listens for `IsVisibleChanged`. It only spawns the initial tab/WebView when the layer is visibly toggled on by the user.

## File Structure

### `Controls/BrowserOverlay.xaml`
The visual layout of the browser.
*   **Toolbar (Row 0)**: Contains navigation buttons and the address bar.
*   **TabControl (Row 1)**: The container for browser tabs.

### `Controls/BrowserOverlay.xaml.cs`
The code-behind logic.
*   **`AddNewTab(string url)`**: Creates a new TabItem, initializes a WebView2 with the shared environment, and sets up event listeners.
*   **`UpdateNavButtons()`**: Checks `CoreWebView2.CanGoBack` / `CanGoForward` to toggle button states.
*   **`BrowserOverlay_IsVisibleChanged`**: The entry point that triggers the first tab creation.

## "Memory" and Persistence
To ensure users stay logged in:
```csharp
_userDataFolder = Path.Combine(AppContext.BaseDirectory, "browser_profile");
var env = await CoreWebView2Environment.CreateAsync(null, _userDataFolder);
await webView.EnsureCoreWebView2Async(env);
```
This forces all tabs to write to the same disk location, effectively mimicking a standard browser profile.

## Future Roadmap (Agent Onboarding)
*   **Extensions**: To add Chrome-like extensions, you will interact with `CoreWebView2.Profile.AddBrowserExtensionAsync`.
*   **Script Injection**: Use `CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync` to inject JS into every page (e.g., for ad-blocking or custom controls).
*   **Downloads**: Hook into `CoreWebView2.DownloadStarting` to manage file downloads customly.
