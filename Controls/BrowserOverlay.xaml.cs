using System;
using System.IO;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.Wpf;

using UserControl = System.Windows.Controls.UserControl;
using KeyEventArgs = System.Windows.Input.KeyEventArgs;

namespace Atlas3.Controls
{
    public partial class BrowserOverlay : UserControl
    {
        private string _userDataFolder;
        private TabItem? _addTabItem;
        private bool _handlingAddTabSelection;

        public event EventHandler? HideRequested;

        public BrowserOverlay()
        {
            InitializeComponent();
            _userDataFolder = Path.Combine(AppContext.BaseDirectory, "browser_profile");
            
            // Defer initialization until we are visible! 
            // WebView2 cannot initialize correctly if it is Collapsed/Hidden.
            this.IsVisibleChanged += BrowserOverlay_IsVisibleChanged;
        }

        private bool _hasInitialized = false;
        private void BrowserOverlay_IsVisibleChanged(object sender, DependencyPropertyChangedEventArgs e)
        {
            if (this.Visibility == Visibility.Visible && !_hasInitialized)
            {
                _hasInitialized = true;
                EnsureAddTabItemExists();
                AddNewTab();
            }
        }

        private void EnsureAddTabItemExists()
        {
            if (_addTabItem != null)
                return;

            _addTabItem = new TabItem
            {
                Header = "+",
                Tag = "AddTab",
                ToolTip = "New Tab"
            };

            // Always keep this as the last tab.
            BrowserTabs.Items.Add(_addTabItem);
        }

        private async void AddNewTab(string url = "https://google.com")
        {
            EnsureAddTabItemExists();

            var tab = new TabItem();
            tab.Tag = "BrowserTab";

            // Header UI: title + close button (per-tab close)
            var headerPanel = new DockPanel { LastChildFill = true };
            var closeBtn = new System.Windows.Controls.Button
            {
                Content = "x",
                Style = (Style)Resources["TabCloseButtonStyle"],
                Tag = tab,
                ToolTip = "Close Tab"
            };
            closeBtn.Click += TabClose_Click;
            DockPanel.SetDock(closeBtn, Dock.Right);

            var titleText = new TextBlock
            {
                Text = "Loading...",
                Foreground = System.Windows.Media.Brushes.White,
                TextTrimming = TextTrimming.CharacterEllipsis,
                MaxWidth = 180,
                VerticalAlignment = VerticalAlignment.Center
            };

            headerPanel.Children.Add(closeBtn);
            headerPanel.Children.Add(titleText);
            tab.Header = headerPanel;

            var webView = new WebView2();
            tab.Content = webView;

            // Insert before the "+" tab so the add-tab is always right-most.
            var insertIndex = Math.Max(0, BrowserTabs.Items.Count - 1);
            BrowserTabs.Items.Insert(insertIndex, tab);
            BrowserTabs.SelectedItem = tab; // Switch to it so it becomes visible within the TabControl

            try 
            {
                // We use the Default Environment (same as Main App) to reduce friction for now.
                // Sharing specific user data folders can be added back once stability is confirmed.
                await webView.EnsureCoreWebView2Async(null);
                
                if (webView.CoreWebView2 != null)
                {
                    webView.CoreWebView2.DocumentTitleChanged += (s, e) => 
                    {
                        Dispatcher.Invoke(() =>
                        {
                            titleText.Text = string.IsNullOrWhiteSpace(webView.CoreWebView2.DocumentTitle)
                                ? "New Tab"
                                : webView.CoreWebView2.DocumentTitle;
                        });
                    };
                    webView.SourceChanged += WebView_SourceChanged;
                    webView.NavigationCompleted += WebView_NavigationCompleted;
                    webView.CoreWebView2InitializationCompleted += WebView_CoreWebView2InitializationCompleted;
                    webView.Source = new Uri(url);
                }
            }
            catch (Exception ex)
            {
                tab.Content = new TextBlock { Text = $"Error: {ex.Message}", Foreground = System.Windows.Media.Brushes.Red, Margin = new Thickness(10) };
            }
        }

        private void WebView_SourceChanged(object? sender, CoreWebView2SourceChangedEventArgs e)
        {
            UpdateAddressBar();
        }

        private void WebView_NavigationCompleted(object? sender, CoreWebView2NavigationCompletedEventArgs e)
        {
            UpdateAddressBar();
            UpdateNavButtons();
        }

        private void CloseCurrentTab()
        {
            if (BrowserTabs.SelectedItem is TabItem selectedTab)
            {
                CloseTab(selectedTab);
            }
        }

        private void CloseTab(TabItem tab)
        {
            // Never close the "+" tab
            if (ReferenceEquals(tab, _addTabItem))
                return;

            if (tab.Content is WebView2 webView)
            {
                webView.Dispose();
            }

            BrowserTabs.Items.Remove(tab);

            // Ensure the "+" tab still exists
            EnsureAddTabItemExists();

            // If no real tabs left (only "+" remains), create one.
            if (BrowserTabs.Items.Count == 1 && ReferenceEquals(BrowserTabs.Items[0], _addTabItem))
            {
                AddNewTab();
            }
        }

        private WebView2? GetCurrentWebView()
        {
            if (BrowserTabs.SelectedItem is TabItem selectedTab &&
                !ReferenceEquals(selectedTab, _addTabItem) &&
                selectedTab.Content is WebView2 webView)
            {
                return webView;
            }
            return null;
        }

        private void UpdateAddressBar()
        {
            var webView = GetCurrentWebView();
            if (webView != null && webView.Source != null)
            {
                AddressBar.Text = webView.Source.ToString();
            }
        }

        private void UpdateNavButtons()
        {
            var webView = GetCurrentWebView();
            if (webView != null && webView.CoreWebView2 != null)
            {
                BtnBack.IsEnabled = webView.CoreWebView2.CanGoBack;
                BtnForward.IsEnabled = webView.CoreWebView2.CanGoForward;
            }
            else
            {
                // If CoreWebView2 is null (still initializing), disable buttons
                BtnBack.IsEnabled = false;
                BtnForward.IsEnabled = false;
            }
        }
        
        private void WebView_CoreWebView2InitializationCompleted(object? sender, CoreWebView2InitializationCompletedEventArgs e)
        {
            if (e.IsSuccess)
            {
                UpdateNavButtons();
                UpdateAddressBar();
            }
        }

        // --- Event Handlers ---

        private void BrowserTabs_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            // If the user clicks the "+" tab, immediately create a real tab and select it.
            if (!_handlingAddTabSelection &&
                BrowserTabs.SelectedItem is TabItem selected &&
                ReferenceEquals(selected, _addTabItem))
            {
                try
                {
                    _handlingAddTabSelection = true;
                    AddNewTab();
                }
                finally
                {
                    _handlingAddTabSelection = false;
                }
                return;
            }

            UpdateAddressBar();
            UpdateNavButtons();
        }

        private void Go_Click(object sender, RoutedEventArgs e)
        {
            NavigateToUrl(AddressBar.Text);
        }

        private void AddressBar_KeyDown(object sender, KeyEventArgs e)
        {
            if (e.Key == Key.Enter)
            {
                NavigateToUrl(AddressBar.Text);
            }
        }

        private void ScanBack_Click(object sender, RoutedEventArgs e)
        {
            var wv = GetCurrentWebView();
            if (wv != null && wv.CoreWebView2 != null && wv.CoreWebView2.CanGoBack)
            {
                wv.CoreWebView2.GoBack();
            }
        }

        private void ScanForward_Click(object sender, RoutedEventArgs e)
        {
            var wv = GetCurrentWebView();
            if (wv != null && wv.CoreWebView2 != null && wv.CoreWebView2.CanGoForward)
            {
                wv.CoreWebView2.GoForward();
            }
        }

        private void Reload_Click(object sender, RoutedEventArgs e)
        {
            var wv = GetCurrentWebView();
            if (wv != null)
            {
                wv.Reload();
            }
        }

        private void NavigateToUrl(string url)
        {
            var wv = GetCurrentWebView();
            if (wv != null)
            {
                if (!url.StartsWith("http://") && !url.StartsWith("https://"))
                {
                    url = "https://" + url;
                }
                
                if (Uri.TryCreate(url, UriKind.Absolute, out var uri))
                {
                    wv.Source = uri;
                }
            }
        }

        private void TabClose_Click(object sender, RoutedEventArgs e)
        {
            if (sender is System.Windows.Controls.Button btn && btn.Tag is TabItem tab)
            {
                CloseTab(tab);
            }
        }

        private void HideBrowser_Click(object sender, RoutedEventArgs e)
        {
            HideRequested?.Invoke(this, EventArgs.Empty);
        }
    }
}
