import React, { useEffect, useState } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minimize, Maximize, X, Minus, Square } from 'lucide-react';

const WindowControls = () => {
    const [isMaximized, setIsMaximized] = useState(false);

    useEffect(() => {
        const updateState = async () => {
            try {
                const win = getCurrentWindow();
                setIsMaximized(await win.isMaximized());
            } catch (e) {
                console.error('Failed to get window state:', e);
            }
        };

        updateState();

        // Listen for resize events to update maximized state logic if needed
        // For now, simpler is better.
        const handleResize = () => updateState();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleMinimize = async () => {
        try {
            await getCurrentWindow().minimize();
        } catch (e) { console.error(e); }
    };

    const handleMaximize = async () => {
        try {
            const win = getCurrentWindow();
            const max = await win.isMaximized();
            if (max) {
                await win.unmaximize();
                setIsMaximized(false);
            } else {
                await win.maximize();
                setIsMaximized(true);
            }
        } catch (e) { console.error(e); }
    };

    const handleClose = async () => {
        try {
            await getCurrentWindow().close();
        } catch (e) { console.error(e); }
    };

    return (
        <div className="flex items-center gap-1 z-[99999] absolute top-2 right-2 text-white/50 hover:text-white/90 transition-colors pointer-events-auto no-drag">
            <button
                onClick={handleMinimize}
                className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
                title="Minimize"
            >
                <Minus size={18} strokeWidth={3} />
            </button>
            <button
                onClick={handleMaximize}
                className="p-1.5 hover:bg-white/10 rounded-full transition-colors"
                title={isMaximized ? "Restore" : "Maximize"}
            >
                {isMaximized ? <Minimize size={18} strokeWidth={3} /> : <Square size={16} strokeWidth={3} />}
            </button>
            <button
                onClick={handleClose}
                className="p-1.5 hover:bg-rose-500/20 hover:text-rose-400 rounded-full transition-colors"
                title="Close"
            >
                <X size={18} strokeWidth={3} />
            </button>
        </div>
    );
};

export default WindowControls;
