import React, { useState } from 'react';
import { useNavigationStore } from '../store/navigationStore';
import { useLayoutStore } from '../store/layoutStore';
import { usePlaylistStore } from '../store/playlistStore';
import useBrowserStore from '../store/browserStore';
import { ChevronLeft, Heart, Pin, Settings, Clock, Cat, Monitor } from 'lucide-react';
import { THEMES } from '../utils/themes';
import { setBrowserMode } from '../api/playlistApi';

import SideMenuScrollControls from './SideMenuScrollControls';

const TopNavigation = () => {
    const { currentPage, setCurrentPage, history, goBack } = useNavigationStore();
    const { viewMode, setViewMode, inspectMode } = useLayoutStore();
    const { previewPlaylistId, clearPreview } = usePlaylistStore();
    const { isBrowserVisible, showBrowser, hideBrowser } = useBrowserStore();
    const [currentThemeId] = useState('blue'); // Defaulting to blue theme for consistency, could be lifted to store if fully dynamic theming is required here

    const theme = THEMES[currentThemeId];

    // Helper to get inspect label
    const getInspectTitle = (label) => inspectMode ? label : undefined;

    const tabs = [
        { id: 'playlists', label: 'Playlists' },
        { id: 'videos', label: 'Videos' },
        { id: 'history', label: 'History', icon: <Clock size={16} /> },
        { id: 'likes', label: 'Likes', icon: <Heart size={16} /> },
        { id: 'pins', label: 'Pins', icon: <Pin size={16} /> },
        { id: 'settings', label: 'Settings', icon: <Settings size={16} /> },
        { id: 'support', label: 'Support', icon: <Cat size={16} /> },
    ];

    const handleTabClick = (tabId) => {
        setCurrentPage(tabId);
        // Auto-switch to half mode when clicking tabs if in full mode
        const isNavigationTab = ['playlists', 'videos', 'history', 'likes', 'pins', 'settings', 'support'].includes(tabId);
        if (isNavigationTab && viewMode === 'full') {
            setViewMode('half');
        }
        // Hide browser when navigating to any page
        if (isBrowserVisible) {
            hideBrowser();
            setBrowserMode('hide').catch(err => console.error('Failed to hide browser:', err));
        }
    };

    const handleBrowserClick = async () => {
        try {
            // Show browser in split mode and hide video app UI
            await setBrowserMode('split');
            showBrowser();
            // Hide side menu to give more space/focus to player
            setViewMode('full');
        } catch (error) {
            console.error('Failed to set browser mode:', error);
        }
    };

    return (
        <div className={`w-full flex-col gap-2 rounded-xl backdrop-blur-md shadow-lg border p-2 mb-2 transition-all duration-300 ${theme.menuBg} ${theme.menuBorder}`}>
            {/* Tabs row */}
            <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth">
                    {tabs.map((tab) => {
                        const isIconOnly = ['history', 'likes', 'pins', 'settings', 'support'].includes(tab.id);
                        const isActive = currentPage === tab.id;

                        return (
                            <button
                                key={tab.id}
                                onClick={() => handleTabClick(tab.id)}
                                className={`rounded-full flex items-center justify-center border-2 shadow-sm transition-all duration-200 ${isActive
                                    ? 'bg-white border-sky-500 text-sky-600 transform scale-105'
                                    : 'bg-white border-[#334155] text-slate-600 hover:bg-slate-50 active:scale-95'
                                    } ${isIconOnly ? 'w-9 h-9 p-0' : 'px-4 h-9 gap-1.5'}`}
                                title={getInspectTitle(`${tab.label} tab`) || tab.label}
                            >
                                {tab.icon && <span className={isActive ? 'opacity-100' : 'opacity-80'}>{tab.icon}</span>}
                                {!isIconOnly && <span className="font-bold text-xs uppercase tracking-wide">{tab.label}</span>}
                            </button>
                        );
                    })}
                </div>

                {/* Right side actions */}
                <div className="flex items-center gap-2 pl-2 border-l border-sky-300/30">
                    {/* Scroll Controls */}
                    <SideMenuScrollControls />

                    {/* Browser Button */}
                    <button
                        onClick={handleBrowserClick}
                        className="flex items-center justify-center w-7 h-7 rounded-full shadow-sm border transition-all hover:scale-105 active:scale-90 bg-white border-sky-500 text-sky-600 hover:bg-sky-50"
                        title={getInspectTitle('Show Browser (Split)') || 'Show Browser (Split)'}
                    >
                        <Monitor size={16} />
                    </button>

                    {/* Back Button */}
                    {(history.length > 0 || previewPlaylistId) && (
                        <button
                            onClick={() => {
                                if (previewPlaylistId) {
                                    clearPreview();
                                }
                                if (history.length > 0) {
                                    goBack();
                                } else if (previewPlaylistId) {
                                    // Fallback if previewing but no history (e.g. direct load)
                                    setCurrentPage('playlists');
                                }
                            }}
                            className={`flex items-center justify-center w-7 h-7 rounded-full shadow-sm border transition-all hover:scale-105 active:scale-90 ${theme.tabInactive}`}
                            title={getInspectTitle('Go Back') || 'Go Back'}
                        >
                            <ChevronLeft size={16} />
                        </button>
                    )}

                    {/* Close Side Menu Button */}
                    <button
                        onClick={() => setViewMode('full')}
                        className="flex items-center justify-center w-7 h-7 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-colors shadow-md border border-rose-400 active:scale-90"
                        title={getInspectTitle('Close menu (Full screen)') || 'Close menu (Full screen)'}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>
        </div >
    );
};

export default TopNavigation;
