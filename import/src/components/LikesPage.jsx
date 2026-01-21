import React, { useState, useEffect, useMemo } from 'react';
import { usePlaylistStore } from '../store/playlistStore';
import { getAllPlaylists, getPlaylistItems, createPlaylist, getPlaylistsForVideoIds } from '../api/playlistApi';
import VideoCard from './VideoCard';
import PageBanner from './PageBanner';
import { useLayoutStore } from '../store/layoutStore';
import PieGraph from './PieGraph';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const COLORS = [
    '#3b82f6', // blue-500
    '#ef4444', // red-500
    '#10b981', // emerald-500
    '#f59e0b', // amber-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
    '#06b6d4', // cyan-500
    '#84cc16', // lime-500
    '#f43f5e', // rose-500
    '#6366f1', // indigo-500
    '#14b8a6', // teal-500
    '#d946ef', // fuchsia-500
];

const ITEMS_PER_PAGE = 24;

const LikesPage = ({ onVideoSelect }) => {
    const [likesPlaylistId, setLikesPlaylistId] = useState(null);
    const [likedVideos, setLikedVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);

    // Distribution state
    const [distribution, setDistribution] = useState([]);
    const [distLoading, setDistLoading] = useState(false);

    const { currentVideoIndex, currentPlaylistItems } = usePlaylistStore();
    const { inspectMode } = useLayoutStore();

    useEffect(() => {
        const initLikes = async () => {
            setLoading(true);
            try {
                const playlists = await getAllPlaylists();
                let likesPlaylist = playlists.find(p => p.name === 'Likes');

                // Create if doesn't exist (consistency with PlayerController)
                if (!likesPlaylist) {
                    const newId = await createPlaylist('Likes', 'Videos you have liked');
                    setLikesPlaylistId(newId);
                    setLikedVideos([]);
                } else {
                    setLikesPlaylistId(likesPlaylist.id);
                    const items = await getPlaylistItems(likesPlaylist.id);
                    setLikedVideos(items || []);
                }
            } catch (error) {
                console.error('Failed to load likes:', error);
            } finally {
                setLoading(false);
            }
        };
        initLikes();
    }, []);

    // Pagination Logic
    const totalPages = Math.ceil(likedVideos.length / ITEMS_PER_PAGE);
    const currentItems = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return likedVideos.slice(start, start + ITEMS_PER_PAGE);
    }, [likedVideos, currentPage]);

    // Fetch Distribution for CURRENT PAGE
    useEffect(() => {
        const fetchDistribution = async () => {
            if (currentItems.length === 0) {
                setDistribution([]);
                return;
            }

            setDistLoading(true);
            try {
                const videoIds = currentItems.map(v => v.video_id);
                const map = await getPlaylistsForVideoIds(videoIds);

                // Process map to count playlist occurrences
                const counts = {};
                Object.values(map).flat().forEach(playlistName => {
                    if (playlistName === 'Likes') return; // Exclude 'Likes' itself
                    counts[playlistName] = (counts[playlistName] || 0) + 1;
                });

                // Track videos with NO other playlist
                // Check if video_id has entries in map excluding 'Likes'
                let uncategorizedCount = 0;
                videoIds.forEach(id => {
                    const playlists = map[id] || [];
                    const otherPlaylists = playlists.filter(p => p !== 'Likes');
                    if (otherPlaylists.length === 0) {
                        uncategorizedCount++;
                    }
                });

                if (uncategorizedCount > 0) {
                    counts['Uncategorized'] = uncategorizedCount;
                }

                // Convert to array
                const data = Object.entries(counts)
                    .map(([name, value], index) => ({
                        name,
                        value,
                        color: name === 'Uncategorized' ? '#475569' : COLORS[index % COLORS.length]
                    }))
                    .sort((a, b) => b.value - a.value);

                setDistribution(data);
            } catch (error) {
                console.error('Failed to fetch distribution:', error);
            } finally {
                setDistLoading(false);
            }
        };

        fetchDistribution();
    }, [currentItems]);

    // Render video cards
    const renderVideos = () => {
        if (loading) {
            return (
                <div className="flex items-center justify-center p-12 text-slate-400">
                    <p>Loading liked videos...</p>
                </div>
            );
        }

        if (!likedVideos || likedVideos.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                    <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <h3 className="text-xl font-medium mb-2">No Liked Videos</h3>
                    <p>Videos you like will appear here.</p>
                </div>
            );
        }

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {currentItems.map((video, index) => {
                    const isCurrentlyPlaying = currentPlaylistItems?.[currentVideoIndex]?.id === video.id;
                    const displayIndex = (currentPage - 1) * ITEMS_PER_PAGE + index;

                    return (
                        <VideoCard
                            key={video.id || `liked-${index}`}
                            video={video}
                            index={displayIndex}
                            originalIndex={displayIndex}
                            isSelected={false}
                            isCurrentlyPlaying={isCurrentlyPlaying}
                            videoFolders={[]}
                            onVideoSelect={onVideoSelect}
                            onVideoClick={() => onVideoSelect(video.video_url)}
                        />
                    );
                })}
            </div>
        );
    };

    return (
        <div className="w-full h-full flex flex-col bg-transparent">
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <PageBanner
                    title="Liked Videos"
                    description="Your collection of liked videos."
                    color={null}
                    isEditable={false}
                >
                    {/* Graph in Banner */}
                    {distribution.length > 0 && !loading && (
                        <div className="flex justify-center">
                            <PieGraph data={distribution} size={160} />
                        </div>
                    )}
                </PageBanner>

                <div className="p-6 space-y-8">



                    {/* Pagination Controls (Top) */}
                    {totalPages > 1 && (
                        <div className="flex justify-between items-center bg-slate-900/40 p-3 rounded-lg border border-white/5 backdrop-blur-sm">
                            <div className="text-sm text-slate-400">
                                Page <span className="text-white font-medium">{currentPage}</span> of <span className="text-white font-medium">{totalPages}</span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    )}

                    {renderVideos()}

                    {/* Pagination Controls (Bottom) */}
                    {totalPages > 1 && (
                        <div className="flex justify-center mt-8 pb-4">
                            <div className="flex items-center gap-2 bg-slate-900/60 rounded-full px-4 py-2 border border-white/10 backdrop-blur-md shadow-lg">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-full hover:bg-white/10 disabled:opacity-30 transition-colors"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>

                                <div className="flex gap-1">
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let pageNum = i + 1;
                                        if (totalPages > 5) {
                                            if (currentPage > 3) {
                                                pageNum = currentPage - 2 + i;
                                            }
                                            if (pageNum > totalPages) {
                                                pageNum = totalPages - 4 + i;
                                            }
                                        }

                                        if (pageNum < 1) pageNum = i + 1;

                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => setCurrentPage(pageNum)}
                                                className={`w-8 h-8 rounded-full text-xs font-medium transition-all ${currentPage === pageNum
                                                    ? 'bg-blue-500 text-white shadow-lg scale-110'
                                                    : 'text-slate-400 hover:bg-white/10 hover:text-white'
                                                    }`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                </div>

                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded-full hover:bg-white/10 disabled:opacity-30 transition-colors"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LikesPage;
