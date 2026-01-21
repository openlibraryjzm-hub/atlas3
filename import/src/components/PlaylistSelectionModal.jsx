import React, { useState, useEffect } from 'react';
import { getAllPlaylists } from '../api/playlistApi';

const PlaylistSelectionModal = ({ isOpen, onClose, onSelect, title = 'Select Playlist' }) => {
    const [playlists, setPlaylists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            loadPlaylists();
        }
    }, [isOpen]);

    const loadPlaylists = async () => {
        try {
            setLoading(true);
            const data = await getAllPlaylists();
            setPlaylists(data);
        } catch (err) {
            console.error('Failed to load playlists:', err);
            setError('Failed to load playlists');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-md border border-slate-700 max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-700">
                    <h3 className="text-lg font-semibold text-white">{title}</h3>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-2">
                    {loading ? (
                        <div className="flex items-center justify-center p-8">
                            <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : error ? (
                        <div className="p-4 text-center text-red-400">
                            {error}
                            <button
                                onClick={loadPlaylists}
                                className="block mx-auto mt-2 text-sm text-sky-400 hover:text-sky-300 underline"
                            >
                                Retry
                            </button>
                        </div>
                    ) : playlists.length === 0 ? (
                        <div className="p-8 text-center text-slate-400">
                            No playlists found.
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {playlists.map((playlist) => (
                                <button
                                    key={playlist.id}
                                    onClick={() => onSelect(playlist.id)}
                                    className="w-full text-left px-4 py-3 rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-3 group"
                                >
                                    <div className="w-8 h-8 rounded bg-slate-600 flex items-center justify-center flex-shrink-0 text-slate-300 group-hover:text-white group-hover:bg-slate-500 transition-colors">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                        </svg>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-white font-medium truncate">{playlist.name}</h4>
                                        {playlist.description && (
                                            <p className="text-xs text-slate-400 truncate">{playlist.description}</p>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-700 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors font-medium text-sm"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PlaylistSelectionModal;
