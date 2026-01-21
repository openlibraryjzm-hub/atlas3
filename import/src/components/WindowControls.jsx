import React from 'react';
import { X, Minus, Square } from 'lucide-react';

const WindowControls = () => {
    const postToHost = (command, payload = {}) => {
        if (window.chrome?.webview) {
            window.chrome.webview.postMessage({
                command,
                payload,
                requestId: crypto.randomUUID()
            });
            return true;
        }
        return false;
    };

    const handleMinimize = () => {
        if (!postToHost('window_minimize')) {
            console.warn('window_minimize: no host available');
        }
    };

    const handleMaximizeToggle = () => {
        if (!postToHost('window_toggle_maximize')) {
            console.warn('window_toggle_maximize: no host available');
        }
    };

    const handleClose = () => {
        if (!postToHost('window_close')) {
            // Dev fallback
            window.close();
        }
    };

    const handleDragMouseDown = (e) => {
        if (e.button !== 0) return; // left-click only
        postToHost('window_drag');
    };

    return (
        <div className="absolute top-0 left-0 right-0 h-8 z-[99999] flex items-center select-none pointer-events-auto">
            {/* Dedicated drag strip (transparent / see-through) */}
            <div
                className="flex-1 h-full"
                onMouseDown={handleDragMouseDown}
                onDoubleClick={handleMaximizeToggle}
                title="Drag to move • Double-click to maximize"
            />

            {/* Window buttons (no-drag) */}
            <div className="flex items-center gap-1 pr-2 text-white/50 hover:text-white/90 transition-colors no-drag">
                <button
                    onClick={handleMinimize}
                    className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
                    title="Minimize"
                >
                    <Minus size={18} strokeWidth={3} />
                </button>
                <button
                    onClick={handleMaximizeToggle}
                    className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
                    title="Maximize / Restore"
                >
                    <Square size={16} strokeWidth={3} />
                </button>
                <button
                    onClick={handleClose}
                    className="p-1.5 hover:bg-rose-500/20 hover:text-rose-400 rounded-full transition-colors"
                    title="Close"
                >
                    <X size={18} strokeWidth={3} />
                </button>
            </div>
        </div>
    );
};

export default WindowControls;
