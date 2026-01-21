import React, { useState, useEffect, useRef } from 'react';
import { Github, Twitter, MessageCircle, Video, Book, ExternalLink, ArrowRight, Heart, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { openUrl } from '@tauri-apps/plugin-opener';
import { usePlaylistStore } from '../store/playlistStore';
import { getAllPlaylists, getPlaylistItems } from '../api/playlistApi';
import { useNavigationStore } from '../store/navigationStore';

import { motion, AnimatePresence } from 'framer-motion';

export default function SupportPage({ onVideoSelect }) {
    const [hoveredIndex, setHoveredIndex] = useState(null);
    const { setPlaylistItems } = usePlaylistStore();
    const { setCurrentPage } = useNavigationStore();
    const [playlists, setPlaylists] = useState([]);

    useEffect(() => {
        const fetchPlaylists = async () => {
            try {
                const all = await getAllPlaylists();
                setPlaylists(all);
            } catch (error) {
                console.error("Failed to fetch playlists for support page:", error);
            }
        };
        fetchPlaylists();
    }, []);

    const navigateToPlaylist = async (nameKeyword) => {
        const target = playlists.find(p => p.name.toLowerCase().includes(nameKeyword.toLowerCase()));
        if (target) {
            try {
                const items = await getPlaylistItems(target.id);
                setPlaylistItems(items, target.id);
                setCurrentPage('videos');
            } catch (e) {
                console.error("Failed to load playlist items", e);
            }
        } else {
            alert(`Playlist "${nameKeyword}" not found. Please create it first.`);
        }
    };

    const items = [
        {
            id: 'code',
            label: 'Source Code',
            sublabel: 'Open Source & Free',
            icon: Github,
            color: 'from-slate-700 to-slate-900',
            textColor: 'text-slate-200',
            action: () => openUrl('https://github.com/your-repo'), // Placeholder
            description: 'Dive into the entire codebase. Completely open-source and free to use.'
        },
        {
            id: 'twitter',
            label: 'Developer',
            sublabel: 'Connect on X',
            icon: Twitter,
            color: 'from-blue-400 to-blue-600',
            textColor: 'text-blue-100',
            action: () => openUrl('https://x.com'), // Placeholder
            description: 'Follow the head developer for updates and behind-the-scenes content.'
        },
        {
            id: 'discord',
            label: 'Community',
            sublabel: 'Join Discord',
            icon: MessageCircle,
            color: 'from-indigo-500 to-indigo-700',
            textColor: 'text-indigo-100',
            action: () => openUrl('https://discord.com'), // Placeholder
            description: 'Join our vibrant community. Get help, share ideas, and chat with others.'
        },
        {
            id: 'promo',
            label: 'Future Plans',
            sublabel: 'Promo Videos',
            icon: Video,
            color: 'from-rose-400 to-rose-600',
            textColor: 'text-rose-100',
            action: () => navigateToPlaylist('Promo'),
            description: 'Watch promotional videos detailing future projects and ambitions.'
        },
        {
            id: 'resources',
            label: 'Resources',
            sublabel: 'For Developers',
            icon: Book,
            color: 'from-emerald-400 to-emerald-600',
            textColor: 'text-emerald-100',
            action: () => navigateToPlaylist('Resources'),
            description: 'Curated resources to help 0-code vibe coders use this project.'
        }
    ];

    // State to track the last hovered item for the banner display (Defaults to 0 = Source Code)
    const [displayIndex, setDisplayIndex] = useState(0);

    // Derived active item: either currently hovered, or the last hovered (displayIndex), or default to first item
    const activeItem = (hoveredIndex !== null && items[hoveredIndex])
        ? items[hoveredIndex]
        : (items[displayIndex] || items[0]);

    // State for random thumbnails
    const [thumbnails, setThumbnails] = useState([]);

    useEffect(() => {
        const fetchThumbnails = async () => {
            try {
                const all = await getAllPlaylists();
                if (all.length > 0) {
                    const playlistId = all[0].id; // Use first playlist
                    const items = await getPlaylistItems(playlistId);
                    // Get 5 random items or just first 5
                    const thumbs = items.slice(0, 5).map(i => i.thumbnail_url || `https://img.youtube.com/vi/${i.video_id}/maxresdefault.jpg`);
                    setThumbnails(thumbs);
                }
            } catch (e) {
                console.error("Failed to load thumbnails", e);
            }
        };
        fetchThumbnails();
    }, []);

    const activeIndex = (hoveredIndex !== null) ? hoveredIndex : (displayIndex !== null ? displayIndex : -1);
    const currentThumbnail = (activeIndex >= 0 && thumbnails[activeIndex]) ? thumbnails[activeIndex] : (thumbnails[0] || null);

    const isSocial = ['code', 'twitter', 'discord'].includes(activeItem.id);

    return (
        <div className="w-full h-full flex flex-col items-center justify-start pt-4 bg-transparent relative overflow-hidden p-8 gap-0">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_2px,transparent_2px),linear-gradient(90deg,rgba(0,0,0,0.02)_2px,transparent_2px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)] pointer-events-none"></div>

            {/* Tabs Navigation - Above Banner */}
            <div className="flex flex-wrap justify-center gap-3 mb-8 z-50 relative">
                {items.map((item, index) => {
                    const isSelected = activeItem.id === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => {
                                setDisplayIndex(index);
                            }}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold tracking-wide transition-all duration-300 border backdrop-blur-md ${isSelected
                                ? 'bg-white text-slate-900 border-white shadow-[0_0_20px_rgba(255,255,255,0.3)] scale-105'
                                : 'bg-black/20 text-slate-400 border-white/5 hover:bg-white/10 hover:text-white hover:border-white/20'
                                }`}
                        >
                            {React.createElement(item.icon, { size: 16, strokeWidth: 2.5 })}
                            {item.label}
                        </button>
                    );
                })}
            </div>

            {/* Top Banner - Horizontal - Clickable to Activate */}
            {/* Top Banner - Horizontal - Static (No Interaction) */}
            <div
                className={`w-full max-w-4xl h-32 rounded-2xl relative overflow-hidden transition-all duration-300 shadow-xl group shrink-0 z-20 border border-white/10`}
            >
                {/* Background Layer - Animated */}
                <AnimatePresence mode="popLayout" initial={false}>
                    <motion.div
                        key={activeItem.id}
                        className="absolute inset-0 w-full h-full"
                        initial={{ x: "-100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ type: "spring", stiffness: 200, damping: 25 }}
                    >
                        <div className={`absolute inset-0 bg-gradient-to-r ${activeItem.color}`}></div>

                        {/* Abstract Shapes for Texture - Inside the moving background so they move with it */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none group-hover:scale-110 transition-transform duration-1000"></div>
                    </motion.div>
                </AnimatePresence>

                {/* Content Container - Animated using Framer Motion */}
                <AnimatePresence mode="popLayout" initial={false}>
                    <motion.div
                        key={activeItem.id}
                        initial={{ x: "-150%", opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: "150%", opacity: 0 }}
                        transition={{ type: "spring", stiffness: 200, damping: 25 }}
                        className="relative z-10 h-full flex items-center justify-between px-10 w-full"
                    >
                        <div className="flex flex-col max-w-2xl">
                            <h1 className={`text-4xl font-black tracking-tighter text-white drop-shadow-sm`}>
                                {activeItem.label}
                            </h1>
                            <p className="text-white/80 font-bold tracking-widest uppercase text-sm mt-1">
                                {activeItem.sublabel}
                            </p>
                            <p className="text-white/70 text-sm mt-2 font-medium leading-relaxed">
                                {activeItem.description}
                            </p>
                        </div>

                        {/* Icon in Banner */}
                        <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner group-hover:rotate-6 transition-transform duration-500 shrink-0 ml-4">
                            {React.createElement(activeItem.icon, {
                                size: 32,
                                className: "text-white drop-shadow-md",
                                strokeWidth: 2.5
                            })}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>



            {/* Bottom: Split View - Left Video | Right GIF */}
            <div className="relative w-full max-w-7xl h-[400px] px-8 pb-12 z-10 flex gap-8 items-center mt-12">

                {/* Left Side: Video Preview - Kept at smaller "current" size (approx 500x300) */}
                <div
                    onClick={() => activeItem.action()}
                    className="w-[500px] h-[300px] shrink-0 rounded-3xl overflow-hidden shadow-2xl border-4 border-white/10 bg-slate-900 group relative flex items-center justify-center cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform duration-300 hover:border-white/30"
                >
                    <AnimatePresence mode="popLayout">
                        {isSocial ? (
                            <motion.div
                                key={activeItem.id}
                                initial={{ opacity: 0, scale: 0.5, rotate: -180 }}
                                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                exit={{ opacity: 0, scale: 0.5, rotate: 180 }}
                                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                                className="absolute inset-0 w-full h-full flex flex-col items-center justify-center gap-4"
                            >
                                <div className={`absolute inset-0 opacity-20 bg-gradient-to-br ${activeItem.color} blur-3xl rounded-full scale-150 animate-pulse`}></div>

                                {React.createElement(activeItem.icon, {
                                    size: 100,
                                    className: "text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] relative z-10",
                                    strokeWidth: 1.5
                                })}

                                <div className="relative z-10 text-center">
                                    <h3 className="text-2xl font-black text-white tracking-tight uppercase drop-shadow-lg">{activeItem.label}</h3>
                                    <p className={`text-sm font-bold opacity-80 ${activeItem.textColor}`}>{activeItem.sublabel}</p>
                                </div>

                                {/* External Link Indicator - Bottom Right */}
                                <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                                    <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 text-white shadow-lg">
                                        <ExternalLink size={24} />
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            currentThumbnail && (
                                <motion.div
                                    key={activeItem.id}
                                    initial={{ opacity: 0, scale: 1.05 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.5 }}
                                    className="absolute inset-0 w-full h-full"
                                >
                                    <img
                                        src={currentThumbnail}
                                        alt="Preview"
                                        className="w-full h-full object-cover opacity-60 group-hover:opacity-90 transition-opacity duration-700"
                                    />
                                    {/* Overlay info */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-wrap content-end p-8">
                                        <div className="w-full">
                                            <span className="text-xs font-bold text-white/70 tracking-widest uppercase mb-2 block">Featured Content</span>
                                            <h3 className="text-white font-black text-2xl leading-tight drop-shadow-xl mb-3">
                                                {activeItem.sublabel}
                                            </h3>
                                            <p className="text-white/60 text-sm line-clamp-2">
                                                Check out this featured video.
                                            </p>
                                        </div>
                                    </div>
                                    {/* Play Button Overlay */}
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/20 backdrop-blur-[2px]">
                                        <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center pl-2 border border-white/40 shadow-2xl hover:scale-110 transition-transform cursor-pointer">
                                            <Video size={40} className="text-white fill-white" />
                                        </div>
                                    </div>
                                </motion.div>
                            )
                        )}
                    </AnimatePresence>
                </div>

                {/* Right Side: Grok GIF - Expanded to fill remaining space (Larger) */}
                <div className="flex-1 h-full rounded-3xl overflow-hidden shadow-2xl border-4 border-white/10 bg-slate-900 group relative">
                    <img
                        src="/grok-video-11b464e2-7bbc-478e-876a-940b9b44db5a1-ezgif.com-video-to-gif-converter.gif" // User provided filename
                        alt="AI Showcase"
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500"
                    />
                </div>

            </div>
        </div>
    );
}
