import React from 'react';

const SideMenuScrollControls = () => {
    const getScrollContainer = () => {
        // Strategy: Look for the specific scrollable container used in pages
        // It's usually the direct child of the page component with 'overflow-y-auto'
        // We scope search to side-menu-content
        const root = document.querySelector('.layout-shell__side-menu-content');
        if (!root) return null;

        // First try finding the standard scroll container class used in pages
        // Note: PlaylistsPage/VideosPage use 'flex-1 overflow-y-auto'
        const scrollable = root.querySelector('.overflow-y-auto');
        if (scrollable) return scrollable;

        // Fallback: check if the root itself is scrollable
        return root;
    };

    const scrollToTop = (e) => {
        e.stopPropagation();
        const container = getScrollContainer();
        if (container) {
            container.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const scrollToBottom = (e) => {
        e.stopPropagation();
        const container = getScrollContainer();
        if (container) {
            container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        }
    };

    const scrollToActive = (e) => {
        e.stopPropagation();
        const container = getScrollContainer();
        if (!container) return;

        // Strategy to find the "active" item:
        // 1. Look for the red ring class (currently playing video or active playlist)
        // 2. Look for explicit sticky/selected states

        // Selector for the Red Ring (Video Card active state)
        // Based on VideoCard.jsx: 'ring-4 ring-red-500'
        let activeElement = container.querySelector('.ring-red-500');

        // Note: For playlists, we previously attempted to add this ring but reverted it.
        // If we re-implement active playlist styling later, we should ensure it uses a detectable class.

        if (!activeElement) {
            // 2. Look for active playlist marker
            activeElement = container.querySelector('.active-playlist-marker') || container.querySelector('[data-active-playlist="true"]');
        }

        if (activeElement) {
            // Scroll the element into view, centered
            activeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            console.log("No active element found to scroll to.");
        }
    };

    return (
        <div className="side-menu-scroll-controls">
            <button
                className="scroll-control-btn scroll-control-btn--up"
                onClick={scrollToTop}
                title="Scroll to Top"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="18 15 12 9 6 15"></polyline>
                </svg>
            </button>

            <button
                className="scroll-control-dot-btn group"
                onClick={scrollToActive}
                title="Scroll to Active/Playing"
            >
                <div className="scroll-control-dot group-hover:scale-150 transition-transform"></div>
            </button>

            <button
                className="scroll-control-btn scroll-control-btn--down"
                onClick={scrollToBottom}
                title="Scroll to Bottom"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </button>
        </div>
    );
};

export default SideMenuScrollControls;
