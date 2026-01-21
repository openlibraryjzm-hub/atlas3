using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Interop;
using System.Runtime.InteropServices;
using Microsoft.Web.WebView2.Wpf;

namespace Atlas3;

public partial class MainWindow : Window
{
    private HwndSource? _hwndSource;

    public MainWindow()
    {
        InitializeComponent();
        SourceInitialized += (_, _) =>
        {
            InitializeWindowHitTesting();
            DisableDwmNonClientRendering();
        };

        InitializeWebView();
    }

    private Atlas3.Services.DatabaseService? _dbService;
    private Atlas3.Bridge.AppBridge? _bridge;

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
        
        // Subscribe to browser mode changes from React
        _bridge.BrowserModeChanged += OnBrowserModeChanged;
        _bridge.WindowCommandRequested += OnWindowCommandRequested;

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

    private void OnBrowserModeChanged(object? sender, string mode)
    {
        // Dispatch to UI thread since this comes from WebView2 message handler
        Dispatcher.Invoke(() =>
        {
            switch (mode.ToLower())
            {
                case "split":
                    ModeSplit_Click(this, new RoutedEventArgs());
                    break;
                case "full":
                    ModeFull_Click(this, new RoutedEventArgs());
                    break;
                case "hide":
                    ModeHide_Click(this, new RoutedEventArgs());
                    break;
            }
        });
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

    private void BrowserLayer_HideRequested(object? sender, EventArgs e)
    {
        // Browser overlay requested to hide itself (top-right "×" in Layer 2 toolbar)
        ModeHide_Click(this, new RoutedEventArgs());
    }

    // --- WINDOW CHROME (controlled from Layer 1 UI) ---

    private void ToggleMaximizeRestore()
    {
        WindowState = WindowState == WindowState.Maximized
            ? WindowState.Normal
            : WindowState.Maximized;
    }

    private void OnWindowCommandRequested(object? sender, string command)
    {
        Dispatcher.Invoke(() =>
        {
            switch (command)
            {
                case "minimize":
                    WindowState = WindowState.Minimized;
                    break;
                case "toggle_maximize":
                    ToggleMaximizeRestore();
                    break;
                case "close":
                    Close();
                    break;
                case "drag":
                    try { DragMove(); } catch { }
                    break;
            }
        });
    }

    /// <summary>
    /// Borderless windows can maximize to full screen bounds (covering the taskbar),
    /// which makes bottom UI (e.g. YouTube scrub controls) appear "cut off".
    /// This constrains Maximized size to the current monitor's work area.
    /// </summary>
    private void UpdateMaximizedBounds()
    {
        if (WindowState != WindowState.Maximized)
        {
            MaxWidth = double.PositiveInfinity;
            MaxHeight = double.PositiveInfinity;
            return;
        }

        var hwnd = new WindowInteropHelper(this).Handle;
        if (hwnd == IntPtr.Zero)
            return;

        var screen = System.Windows.Forms.Screen.FromHandle(hwnd);
        var waPx = screen.WorkingArea; // pixels

        var dpi = System.Windows.Media.VisualTreeHelper.GetDpi(this);
        MaxWidth = waPx.Width / dpi.DpiScaleX;
        MaxHeight = waPx.Height / dpi.DpiScaleY;

        // Also align the window to the work area origin (important on multi-monitor setups).
        Left = waPx.Left / dpi.DpiScaleX;
        Top = waPx.Top / dpi.DpiScaleY;
    }

    // --- CLIENT-AREA RESIZE HIT TESTING (removes 7px "gaps") ---

    private const int WM_NCHITTEST = 0x0084;
    private const int WM_GETMINMAXINFO = 0x0024;
    private const int HTCLIENT = 1;
    private const int HTLEFT = 10;
    private const int HTRIGHT = 11;
    private const int HTTOP = 12;
    private const int HTTOPLEFT = 13;
    private const int HTTOPRIGHT = 14;
    private const int HTBOTTOM = 15;
    private const int HTBOTTOMLEFT = 16;
    private const int HTBOTTOMRIGHT = 17;
    private const uint MONITOR_DEFAULTTONEAREST = 2;

    [StructLayout(LayoutKind.Sequential)]
    private struct POINT
    {
        public int x;
        public int y;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct MINMAXINFO
    {
        public POINT ptReserved;
        public POINT ptMaxSize;
        public POINT ptMaxPosition;
        public POINT ptMinTrackSize;
        public POINT ptMaxTrackSize;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct RECT
    {
        public int left;
        public int top;
        public int right;
        public int bottom;
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Auto)]
    private struct MONITORINFO
    {
        public int cbSize;
        public RECT rcMonitor;
        public RECT rcWork;
        public uint dwFlags;
    }

    [DllImport("user32.dll")]
    private static extern IntPtr MonitorFromWindow(IntPtr hwnd, uint dwFlags);

    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    private static extern bool GetMonitorInfo(IntPtr hMonitor, ref MONITORINFO lpmi);

    private void InitializeWindowHitTesting()
    {
        _hwndSource = PresentationSource.FromVisual(this) as HwndSource;
        _hwndSource?.AddHook(WndProc);
    }

    private IntPtr WndProc(IntPtr hwnd, int msg, IntPtr wParam, IntPtr lParam, ref bool handled)
    {
        if (msg == WM_GETMINMAXINFO)
        {
            WmGetMinMaxInfo(hwnd, lParam);
            handled = true;
            return IntPtr.Zero;
        }

        if (msg != WM_NCHITTEST)
            return IntPtr.Zero;

        // Don't resize when maximized/minimized
        if (WindowState != WindowState.Normal)
            return IntPtr.Zero;

        // lParam: screen coords in pixels (low/high word)
        var lParamInt = unchecked((int)lParam.ToInt64());
        var x = unchecked((short)(lParamInt & 0xFFFF));
        var y = unchecked((short)((lParamInt >> 16) & 0xFFFF));

        var mouseScreen = new System.Windows.Point(x, y);
        var mouseWindow = PointFromScreen(mouseScreen); // DIPs

        // How close to the edge counts as resize zone (DIPs)
        const double resizeBorder = 8.0;

        bool left = mouseWindow.X >= 0 && mouseWindow.X <= resizeBorder;
        bool right = mouseWindow.X <= ActualWidth && mouseWindow.X >= ActualWidth - resizeBorder;
        bool top = mouseWindow.Y >= 0 && mouseWindow.Y <= resizeBorder;
        bool bottom = mouseWindow.Y <= ActualHeight && mouseWindow.Y >= ActualHeight - resizeBorder;

        int ht =
            top && left ? HTTOPLEFT :
            top && right ? HTTOPRIGHT :
            bottom && left ? HTBOTTOMLEFT :
            bottom && right ? HTBOTTOMRIGHT :
            left ? HTLEFT :
            right ? HTRIGHT :
            top ? HTTOP :
            bottom ? HTBOTTOM :
            HTCLIENT;

        if (ht != HTCLIENT)
        {
            handled = true;
            return new IntPtr(ht);
        }

        return IntPtr.Zero;
    }

    /// <summary>
    /// Ensure borderless maximize respects taskbar (work area), not full monitor bounds.
    /// </summary>
    private static void WmGetMinMaxInfo(IntPtr hwnd, IntPtr lParam)
    {
        var mmi = Marshal.PtrToStructure<MINMAXINFO>(lParam);

        var monitor = MonitorFromWindow(hwnd, MONITOR_DEFAULTTONEAREST);
        if (monitor != IntPtr.Zero)
        {
            var monitorInfo = new MONITORINFO { cbSize = Marshal.SizeOf<MONITORINFO>() };
            if (GetMonitorInfo(monitor, ref monitorInfo))
            {
                var rcWork = monitorInfo.rcWork;
                var rcMonitor = monitorInfo.rcMonitor;

                // Position is relative to the monitor's top-left
                mmi.ptMaxPosition.x = rcWork.left - rcMonitor.left;
                mmi.ptMaxPosition.y = rcWork.top - rcMonitor.top;
                mmi.ptMaxSize.x = rcWork.right - rcWork.left;
                mmi.ptMaxSize.y = rcWork.bottom - rcWork.top;
            }
        }

        Marshal.StructureToPtr(mmi, lParam, true);
    }

    // --- OPTIONAL: Remove DWM shadow/"desktop gap" around borderless window ---

    private const int DWMWA_NCRENDERING_POLICY = 2;
    private const int DWMNCRP_DISABLED = 1;

    [DllImport("dwmapi.dll", PreserveSig = true)]
    private static extern int DwmSetWindowAttribute(IntPtr hwnd, int dwAttribute, ref int pvAttribute, int cbAttribute);

    private void DisableDwmNonClientRendering()
    {
        var hwnd = new WindowInteropHelper(this).Handle;
        if (hwnd == IntPtr.Zero)
            return;

        try
        {
            int policy = DWMNCRP_DISABLED;
            _ = DwmSetWindowAttribute(hwnd, DWMWA_NCRENDERING_POLICY, ref policy, Marshal.SizeOf<int>());
        }
        catch
        {
            // If DWM APIs aren't available, ignore.
        }
    }
}