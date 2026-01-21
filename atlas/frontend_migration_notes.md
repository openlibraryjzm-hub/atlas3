# Frontend Migration Notes

## Overview
Successfully ported the React/Vite/Tailwind frontend from the legacy Tauri project into the Atlas 3 C# Triple-Layer Architecture.

## Key Achievements
1.  **Hybrid Hosting Model**:
    *   **Development**: connects to `http://localhost:1420` (Vite Hot Module Reloading) when running in Debug configuration.
    *   **Production**: Serves static files from `wwwroot` when running in Release configuration.
2.  **Tailwind CSS v4 Integration**:
    *   Solved critical styling issues by migrating to the new `@tailwindcss/postcss` plugin architecture.
    *   Configured `postcss.config.js` properly for the new ecosystem.
    *   Updated CSS imports to use standard `@import "tailwindcss";`.
3.  **Tauri Polyfill**:
    *    injected a temporary standard shim for `window.__TAURI__` to prevent crash-on-load behavior, allowing the UI to render before the C# backend bridge is fully implemented.

## Configuration Details

### PostCSS (v4 compatible)
```javascript
export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}
```

### C# WebView2 Initialization
The host now intelligently switches between local content and the dev server:

```csharp
#if DEBUG
    // Hot Reloading
    AppWebView.Source = new Uri("http://localhost:1420");
#else
    // Production Assets
    string appPath = System.IO.Path.Combine(AppContext.BaseDirectory, "wwwroot", "index.html");
    AppWebView.Source = new Uri(appPath);
#endif
```
