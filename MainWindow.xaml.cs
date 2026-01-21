using System.Windows;
using System.Windows.Controls;
using Microsoft.Web.WebView2.Wpf;

namespace Atlas3;

public partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();
        InitializeWebView();
    }

    private Atlas3.Services.DatabaseService _dbService;
    private Atlas3.Bridge.AppBridge _bridge;

    private async void InitializeWebView()
    {
        // Set transparent background
        AppWebView.DefaultBackgroundColor = System.Drawing.Color.Transparent;

        // Initialize CoreWebView2
        await AppWebView.EnsureCoreWebView2Async();

        // 1. Initialize Database
        string dbPath = System.IO.Path.Combine(AppContext.BaseDirectory, "playlists.db"); // Should be copied by .csproj
        _dbService = new Atlas3.Services.DatabaseService(dbPath);

        // 2. Initialize Bridge (Connects React <-> C#)
        _bridge = new Atlas3.Bridge.AppBridge(_dbService, AppWebView.CoreWebView2);

        // 3. Point to the local index.html or Dev Server
#if DEBUG
        // DEVELOPMENT MODE: Hot Reloading from Vite
        // Ensure you run 'npm run dev' in the 'import' folder!
        try 
        {
            AppWebView.Source = new Uri("http://localhost:1420");
        }
        catch (Exception ex)
        {
             System.Windows.MessageBox.Show("Error connecting to Dev Server at http://localhost:1420. Ensure 'npm run dev' is running.\n\n" + ex.Message);
        }
#else
        // PRODUCTION MODE: Embedded Files
        string appPath = System.IO.Path.Combine(AppContext.BaseDirectory, "wwwroot", "index.html");
        
        if (System.IO.File.Exists(appPath))
        {
             AppWebView.Source = new Uri(appPath);
        }
        else 
        {
             System.Windows.MessageBox.Show($"Could not find index.html at {appPath}. Please build the frontend.");
        }
#endif
    }

    // --- MODE CONTROLS ---

    private void ModeSplit_Click(object sender, RoutedEventArgs e)
    {
        // SPLIT SCREEN FIX:
        // Instead of "Overlapping" (which causes Z-fighting flickering between the two WebView2s),
        // we will "SQUASH" the Tauri app to the left column. This is much cleaner and reliable.
        
        RightCol.Width = new GridLength(1, GridUnitType.Star); // 50/50 Split
        
        BrowserLayer.Visibility = Visibility.Visible;
        Grid.SetColumn(BrowserLayer, 1);
        Grid.SetColumnSpan(BrowserLayer, 1);
        
        // SQUASH APP TO LEFT (Column 0)
        AppWebView.Visibility = Visibility.Visible;
        Grid.SetColumn(AppWebView, 0);
        Grid.SetColumnSpan(AppWebView, 1);
    }

    private void ModeFull_Click(object sender, RoutedEventArgs e)
    {
        // FULL SCREEN BROWSER:
        // Browser takes entire grid.
        
        BrowserLayer.Visibility = Visibility.Visible;
        Grid.SetColumn(BrowserLayer, 0);
        Grid.SetColumnSpan(BrowserLayer, 2);
        
        // HIDE AppWebView to prevent Airspace bleeding
        AppWebView.Visibility = Visibility.Collapsed;
    }

    private void ModeHide_Click(object sender, RoutedEventArgs e)
    {
        BrowserLayer.Visibility = Visibility.Collapsed;
        RightCol.Width = new GridLength(0); // Collapse the column effectively
        AppWebView.Visibility = Visibility.Visible; // Show App
    }

    // --- MPV CONTROL ---

    private void ToggleMpv_Click(object sender, RoutedEventArgs e)
    {
        if (MpvLayer.Visibility == Visibility.Visible)
        {
            MpvLayer.Visibility = Visibility.Collapsed;
            // Restore visibility of underlying layers based on current mode state?
            // For simplicity, we assume the user didn't change mode while video was playing.
            // If we were in Full Mode, AppWebView is still Collapsed (good).
            // If we were in Split, AppWebView is Visible.
        }
        else
        {
            MpvLayer.Visibility = Visibility.Visible;
            // OPTIONAL: Hide underneath layers for performance/airspace safety
            // AppWebView.Visibility = Visibility.Collapsed; 
        }
    }
}