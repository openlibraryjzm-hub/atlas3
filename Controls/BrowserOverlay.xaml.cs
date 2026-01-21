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
                AddNewTab();
            }
        }

        private async void AddNewTab(string url = "https://google.com")
        {
            var tab = new TabItem();
            tab.Header = "Loading...";

            var webView = new WebView2();
            tab.Content = webView;
            BrowserTabs.Items.Add(tab);
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
                        tab.Header = webView.CoreWebView2.DocumentTitle;
                    };
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
                if (selectedTab.Content is WebView2 webView)
                {
                    webView.Dispose();
                }
                
                BrowserTabs.Items.Remove(selectedTab);
                
                // If no tabs left, create one
                if (BrowserTabs.Items.Count == 0)
                {
                    AddNewTab();
                }
            }
        }

        private WebView2? GetCurrentWebView()
        {
            if (BrowserTabs.SelectedItem is TabItem selectedTab && selectedTab.Content is WebView2 webView)
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

        private void NewTab_Click(object sender, RoutedEventArgs e)
        {
            AddNewTab();
        }

        private void CloseTab_Click(object sender, RoutedEventArgs e)
        {
            CloseCurrentTab();
        }

        private void BrowserTabs_SelectionChanged(object sender, SelectionChangedEventArgs e)
        {
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
    }
}
