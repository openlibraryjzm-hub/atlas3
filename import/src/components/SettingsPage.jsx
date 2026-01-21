import React, { useState } from 'react';
import { Palette, User, Smile, ExternalLink, Copy, Check, Image, Layout, Music, Box, Volume2 } from 'lucide-react';
import { openUrl } from '@tauri-apps/plugin-opener';
import { useConfigStore } from '../store/configStore';
import { THEMES } from '../utils/themes';
import PageBanner from './PageBanner';

const AVATARS = [
    '( ͡° ͜ʖ ͡°)',
    '( ͠° ͟ʖ ͡°)',
    '( ͡~ ͜ʖ ͡°)',
    '( . •́ _ʖ •̀ .)',
    '( ಠ ͜ʖ ಠ)',
    '( ͡o ͜ʖ ͡o)',
    '( ͡◉ ͜ʖ ͡◉)',
    '( ͡☉ ͜ʖ ͡☉)',
    '( ͡⚆ ͜ʖ ͡⚆)',
    '( ͡◎ ͜ʖ ͡◎)',
    '( ✧≖ ͜ʖ≖)',
    '( ง ͠° ͟ل͜ ͡°) ง',
    '( ͡° ͜V ͡°)',
    '¯\\_(ツ)_/¯',
    '(>_>)',
    '(^_^)',
    '(¬_¬)',
    `
   /\\
  /  \\
  |  |
  |  |
 / == \\
 |/**\\|
`,
    `
 .--.
|o_o |
|:_/ |
//   \\ \\
(|     | )
/'\\_   _/\`\\
\\___)=(___/
`,
    'custom'
];

export default function SettingsPage({ currentThemeId, onThemeChange }) {
    const [activeTab, setActiveTab] = useState('theme');
    // Actual Store State
    const {
        userName, setUserName, userAvatar, setUserAvatar,
        customOrbImage, setCustomOrbImage,
        isSpillEnabled, setIsSpillEnabled,
        orbSpill, setOrbSpill,
        orbImageScale, setOrbImageScale,
        bannerPattern, setBannerPattern,
        customBannerImage, setCustomBannerImage,
        customPageBannerImage, setCustomPageBannerImage,
        playerBorderPattern, setPlayerBorderPattern,
        visualizerGradient, setVisualizerGradient
    } = useConfigStore();
    const [customAvatar, setCustomAvatar] = useState('');
    const [copied, setCopied] = useState(false);

    // Mock State for new representative options
    const [mockAppBanner, setMockAppBanner] = useState('default');
    const [mockVideoBanner, setMockVideoBanner] = useState('diagonal');
    const [mockBorder, setMockBorder] = useState('neon');
    const [mockVisualizer, setMockVisualizer] = useState('bars');
    const [mockVisColor, setMockVisColor] = useState('theme');

    const promptText = 'maintain style as much as possible. dont change anything about original image. im looking for a "zoom out" so that I can [insert desired changes]. reference the single primary color markings which mark out how I want things expanded. remove single primary color markings from final image.';

    const handleCopyPrompt = () => {
        navigator.clipboard.writeText(promptText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleAvatarSelect = (avatar) => {
        if (avatar === 'custom') {
            setUserAvatar(customAvatar || 'Custom');
        } else {
            setUserAvatar(avatar.trim());
        }
    };

    const handleOrbImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setCustomOrbImage(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleBannerUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setCustomBannerImage(reader.result);
                setMockAppBanner('uploaded');
            };
            reader.readAsDataURL(file);
        }
    };

    const handlePageBannerUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setCustomPageBannerImage(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const toggleSpillQuadrant = (q) => {
        setOrbSpill({ ...orbSpill, [q]: !orbSpill[q] });
    };

    const isMultiLine = (text) => text.includes('\n');

    return (
        <div className="w-full h-full flex flex-col bg-transparent">
            <div className="flex-1 overflow-y-auto p-6 text-slate-800 space-y-6">
                <PageBanner
                    title="Settings"
                    description={null}
                    color={null}
                    isEditable={false}
                    childrenPosition="bottom"
                >
                    <div className="flex p-1 bg-black/20 backdrop-blur-md rounded-xl w-fit flex-wrap gap-1 mt-4 border border-white/10">
                        <button
                            onClick={() => setActiveTab('theme')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'theme'
                                ? 'bg-white/20 text-white shadow-sm'
                                : 'text-white/60 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            <Palette size={16} /> Appearance
                        </button>
                        <button
                            onClick={() => setActiveTab('visualizer')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'visualizer'
                                ? 'bg-white/20 text-white shadow-sm'
                                : 'text-white/60 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            <Music size={16} /> Visualizer
                        </button>
                        <button
                            onClick={() => setActiveTab('orb')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'orb'
                                ? 'bg-white/20 text-white shadow-sm'
                                : 'text-white/60 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            <Smile size={16} /> Orb
                        </button>
                        <button
                            onClick={() => setActiveTab('profile')}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'profile'
                                ? 'bg-white/20 text-white shadow-sm'
                                : 'text-white/60 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            <User size={16} /> Signature
                        </button>
                    </div>
                </PageBanner>

                <div className="space-y-8 pb-20">
                    {activeTab === 'theme' ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <ConfigSection title="Color Palette" icon={Palette}>
                                <div className="grid grid-cols-2 gap-3">
                                    {Object.entries(THEMES).map(([id, theme]) => (
                                        <button
                                            key={id}
                                            onClick={() => onThemeChange && onThemeChange(id)}
                                            className={`p-3 rounded-xl text-xs font-bold uppercase transition-all border-2 text-left flex flex-col gap-2 ${currentThemeId === id
                                                ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-md ring-2 ring-sky-200'
                                                : 'border-slate-100 bg-white text-slate-400 hover:border-sky-200 hover:text-sky-600 hover:shadow-sm'
                                                }`}
                                        >
                                            <div className={`w-full h-12 rounded-lg bg-gradient-to-br ${theme.bg.replace('from-', 'from-').replace('via-', 'via-').replace('to-', 'to-')} shadow-inner`}></div>
                                            <span className="px-1">{theme.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </ConfigSection>

                            <ConfigSection title="App Banner" icon={Image}>
                                {/* Current Banner Display */}
                                <div className="space-y-3 pb-4 border-b border-slate-100">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-xs font-bold uppercase text-slate-400">Current App Banner</label>
                                        <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full uppercase tracking-wider">Active</span>
                                    </div>
                                    <div className="w-full h-32 rounded-xl overflow-hidden shadow-sm border-2 border-slate-100 relative group bg-slate-50">
                                        <img
                                            src={customBannerImage || "/banner.PNG"}
                                            alt="Current Banner"
                                            className="w-full h-full object-cover"
                                        />
                                        {!customBannerImage && (
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-60"></div>
                                        )}
                                        <div className="absolute bottom-3 left-3 text-white text-xs font-bold drop-shadow-md">
                                            {customBannerImage ? "Custom Upload" : "/public/banner.PNG"}
                                        </div>
                                        {customBannerImage && (
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                <button
                                                    onClick={() => {
                                                        setCustomBannerImage(null);
                                                        setMockAppBanner('default');
                                                    }}
                                                    className="px-4 py-2 bg-red-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-red-600 transition-colors shadow-lg"
                                                >
                                                    Remove Custom Banner
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Presets */}
                                <div className="space-y-3 pt-2">
                                    <label className="text-xs font-bold uppercase text-slate-400 ml-1">Presets</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        {['Default', 'Cosmic', 'Nature', 'Industrial'].map((name) => {
                                            const id = name.toLowerCase();
                                            return (
                                                <button
                                                    key={id}
                                                    onClick={() => {
                                                        setMockAppBanner(id);
                                                        if (id === 'default') {
                                                            setCustomBannerImage(null);
                                                        }
                                                        // Future: Set other presets if we have assets
                                                    }}
                                                    className={`p-2 rounded-xl text-xs font-bold uppercase transition-all border-2 flex flex-col gap-2 items-center ${mockAppBanner === id
                                                        ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-md'
                                                        : 'border-slate-100 bg-white text-slate-400 hover:border-sky-200 hover:text-sky-600'
                                                        }`}
                                                >
                                                    <div className="w-full h-16 bg-slate-100 rounded-lg overflow-hidden relative">
                                                        {/* Representational placeholder visuals */}
                                                        {id === 'default' && <div className="absolute inset-0 bg-gradient-to-r from-sky-400 to-blue-600 opacity-50" />}
                                                        {id === 'cosmic' && <div className="absolute inset-0 bg-gradient-to-tr from-purple-800 via-indigo-900 to-black opacity-80" />}
                                                        {id === 'nature' && <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-green-800 opacity-60" />}
                                                        {id === 'industrial' && <div className="absolute inset-0 bg-gradient-to-bl from-slate-600 to-zinc-900 opacity-70" />}
                                                        <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white/50">IMG</span>
                                                    </div>
                                                    <span>{name}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Upload Action */}
                                <div className="pt-2 border-t border-slate-100">
                                    <label className="w-full py-3 bg-white border-2 border-dashed border-slate-300 rounded-xl text-xs font-bold uppercase text-slate-500 hover:bg-sky-50 hover:border-sky-400 hover:text-sky-600 hover:shadow-sm transition-all flex items-center justify-center gap-2 group cursor-pointer relative overflow-hidden">
                                        <div className="p-1 bg-slate-100 rounded-md group-hover:bg-white transition-colors">
                                            <Image size={14} />
                                        </div>
                                        Upload Custom Banner
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleBannerUpload}
                                            className="hidden"
                                        />
                                    </label>
                                    <p className="text-[10px] text-slate-400 text-center mt-2">
                                        Supports PNG, JPG, WEBP. Recommended size: 1920x200px.
                                    </p>
                                </div>
                            </ConfigSection>

                            <ConfigSection title="Page Banner" icon={Layout}>
                                {/* Live Preview */}
                                <div className="mb-4 space-y-2">
                                    <label className="text-xs font-bold uppercase text-slate-400 ml-1">Live Preview</label>
                                    <div className="w-full h-24 bg-gradient-to-r from-sky-400 to-blue-600 rounded-xl overflow-hidden relative shadow-inner border-2 border-slate-100 flex items-center justify-center group">
                                        {customPageBannerImage ? (
                                            <>
                                                <div
                                                    className="absolute inset-0 bg-cover bg-center"
                                                    style={{ backgroundImage: `url(${customPageBannerImage})` }}
                                                />

                                                <span className="relative z-10 text-white font-black text-2xl tracking-widest drop-shadow-md uppercase opacity-90">
                                                    CUSTOM
                                                </span>
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-20">
                                                    <button
                                                        onClick={() => setCustomPageBannerImage(null)}
                                                        className="px-4 py-2 bg-red-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-red-600 transition-colors shadow-lg"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className={`absolute inset-0 pattern-${bannerPattern || 'diagonal'}`}></div>
                                                <span className="relative z-10 text-white font-black text-2xl tracking-widest drop-shadow-md uppercase opacity-90">
                                                    {bannerPattern === 'waves' ? 'MESH' : bannerPattern || 'DIAGONAL'}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {['Diagonal', 'Dots', 'Mesh', 'Solid'].map((name) => {
                                        // Map 'Mesh' to the 'waves' ID for compatibility with existing CSS
                                        const id = name === 'Mesh' ? 'waves' : name.toLowerCase();

                                        return (
                                            <button
                                                key={id}
                                                onClick={() => {
                                                    setBannerPattern(id);
                                                    setCustomPageBannerImage(null); // Clear custom image when selecting a pattern
                                                }}
                                                className={`p-2 rounded-xl text-xs font-bold uppercase transition-all border-2 flex flex-col gap-2 items-center ${bannerPattern === id && !customPageBannerImage
                                                    ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-md'
                                                    : 'border-slate-100 bg-white text-slate-400 hover:border-sky-200 hover:text-sky-600'
                                                    }`}
                                            >
                                                <div className="w-full h-12 bg-gradient-to-r from-sky-400 to-blue-600 rounded-lg overflow-hidden relative shadow-inner">
                                                    <div className={`absolute inset-0 pattern-${id}`}></div>
                                                </div>
                                                <span>{name}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Upload Action */}
                                <div className="pt-2 border-t border-slate-100 mt-2">
                                    <label className="w-full py-3 bg-white border-2 border-dashed border-slate-300 rounded-xl text-xs font-bold uppercase text-slate-500 hover:bg-sky-50 hover:border-sky-400 hover:text-sky-600 hover:shadow-sm transition-all flex items-center justify-center gap-2 group cursor-pointer relative overflow-hidden">
                                        <div className="p-1 bg-slate-100 rounded-md group-hover:bg-white transition-colors">
                                            <Image size={14} />
                                        </div>
                                        Upload Custom Pattern
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handlePageBannerUpload}
                                            className="hidden"
                                        />
                                    </label>
                                    <p className="text-[10px] text-slate-400 text-center mt-2">
                                        RECOMMENDED: Seamless textures or wide banners.
                                    </p>
                                </div>
                            </ConfigSection>

                            <ConfigSection title="Player Borders" icon={Box}>
                                <div className="grid grid-cols-2 gap-3">
                                    {['Diagonal', 'Dots', 'Mesh', 'Solid'].map((name) => {
                                        const id = name === 'Mesh' ? 'waves' : name.toLowerCase();
                                        return (
                                            <button
                                                key={id}
                                                onClick={() => setPlayerBorderPattern(id)}
                                                className={`p-3 rounded-xl text-xs font-bold uppercase transition-all border-2 text-left flex items-center justify-between ${playerBorderPattern === id
                                                    ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-md'
                                                    : 'border-slate-100 bg-white text-slate-400 hover:border-sky-200 hover:text-sky-600'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-[#052F4A] relative overflow-hidden shadow-sm border border-slate-200">
                                                        <div className={`absolute inset-0 pattern-${id}`}></div>
                                                    </div>
                                                    <span>{name}</span>
                                                </div>
                                                {playerBorderPattern === id && <Check size={14} />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </ConfigSection>
                        </div>

                    ) : activeTab === 'visualizer' ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <ConfigSection title="Visualizer Style" icon={Volume2}>
                                <div className="grid grid-cols-2 gap-4">
                                    {['Frequency Bars', 'Digital Wave', 'Particle Storm', 'Retro Lines'].map((name) => {
                                        const id = name.toLowerCase().split(' ')[0];
                                        return (
                                            <button
                                                key={id}
                                                onClick={() => setMockVisualizer(id)}
                                                className={`p-4 rounded-xl text-xs font-bold uppercase transition-all border-2 flex flex-col gap-3 relative overflow-hidden group ${mockVisualizer === id
                                                    ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-md'
                                                    : 'border-slate-100 bg-white text-slate-400 hover:border-sky-200 hover:text-sky-600'
                                                    }`}
                                            >
                                                <div className="w-full h-24 bg-slate-900 rounded-lg relative overflow-hidden flex items-center justify-center">
                                                    {/* Visualizer Mocks */}
                                                    {id === 'frequency' && (
                                                        <div className="flex items-end gap-1 h-12">
                                                            {[...Array(10)].map((_, i) => (
                                                                <div key={i} className="w-2 bg-sky-400 rounded-t-sm animate-pulse" style={{ height: `${Math.random() * 100}%`, animationDelay: `${i * 0.1}s` }}></div>
                                                            ))}
                                                        </div>
                                                    )}
                                                    {id === 'digital' && (
                                                        <svg viewBox="0 0 100 40" className="w-full h-full stroke-sky-400 fill-none stroke-2 opacity-80">
                                                            <path d="M0 20 Q 25 5, 50 20 T 100 20" />
                                                        </svg>
                                                    )}
                                                    {id === 'particle' && (
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <div className="w-2 h-2 bg-sky-400 rounded-full shadow-[0_0_10px_rgba(56,189,248,0.8)] animate-ping"></div>
                                                        </div>
                                                    )}
                                                    {id === 'retro' && (
                                                        <div className="w-full h-full border-b-2 border-sky-400 flex items-end justify-between px-4 pb-2">
                                                            <div className="text-[10px] font-mono text-sky-400">L</div>
                                                            <div className="text-[10px] font-mono text-sky-400">R</div>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center justify-between w-full">
                                                    <span>{name}</span>
                                                    {mockVisualizer === id && <Check size={14} className="text-sky-500" />}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </ConfigSection>

                            <ConfigSection title="Visualizer Effects" icon={Volume2}>
                                <div className="flex items-center justify-between p-4 rounded-xl border-2 border-slate-100 bg-white">
                                    <div className="space-y-1">
                                        <span className="text-sm font-bold text-slate-700 block">Distance-Based Transparency</span>
                                        <p className="text-xs text-slate-400">
                                            Bars fade out as they extend outward from the orb.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setVisualizerGradient(!visualizerGradient)}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${visualizerGradient ? 'bg-sky-500' : 'bg-slate-200'}`}
                                    >
                                        <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${visualizerGradient ? 'left-7 shadow-sm' : 'left-1'}`} />
                                    </button>
                                </div>
                            </ConfigSection>

                            <ConfigSection title="Color Mode" icon={Palette}>
                                <div className="grid grid-cols-3 gap-3">
                                    {['Theme Match', 'Rainbow', 'Custom'].map((name) => {
                                        const id = name.toLowerCase().split(' ')[0];
                                        return (
                                            <button
                                                key={id}
                                                onClick={() => setMockVisColor(id)}
                                                className={`p-3 rounded-xl text-xs font-bold uppercase transition-all border-2 ${mockVisColor === id
                                                    ? 'border-sky-500 bg-sky-50 text-sky-700'
                                                    : 'border-slate-100 bg-white text-slate-400 hover:border-sky-200'
                                                    }`}
                                            >
                                                {name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </ConfigSection>

                            <div className="p-4 bg-sky-50 rounded-xl border border-sky-100 text-sky-800 text-xs font-medium leading-relaxed">
                                <h4 className="font-bold flex items-center gap-2 mb-1"><Box size={14} /> Border Integration</h4>
                                The selected visualizer will automatically integrate with the "Border Style" chosen in the Appearance tab, overflowing onto the video player when "Spill" is enabled in Orb settings.
                            </div>
                        </div>

                    ) : activeTab === 'orb' ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <ConfigSection title="Orb Configuration" icon={Smile}>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase text-slate-400 ml-1">Custom Orb Image</label>
                                        <div className="flex items-center gap-4">
                                            <div className="w-24 h-24 rounded-full border-4 border-slate-100 overflow-hidden flex items-center justify-center bg-slate-50 relative group">
                                                {customOrbImage ? (
                                                    <img src={customOrbImage} alt="Orb" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="text-slate-300 text-xs text-center p-2">No Image</div>
                                                )}
                                                <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white cursor-pointer transition-opacity">
                                                    <span className="text-xs font-bold">Change</span>
                                                    <input type="file" onChange={handleOrbImageUpload} accept="image/*" className="hidden" />
                                                </label>
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                <p className="text-xs text-slate-500 leading-relaxed">
                                                    Upload a custom image for the central orb. You can enable "Spill" to let the image break out of the circle in specific corners.
                                                </p>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => setIsSpillEnabled(!isSpillEnabled)}
                                                        className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border-2 ${isSpillEnabled
                                                            ? 'bg-sky-500 border-sky-500 text-white shadow-md'
                                                            : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}
                                                    >
                                                        {isSpillEnabled ? 'Spill Enabled' : 'Spill Disabled'}
                                                    </button>
                                                    {customOrbImage && (
                                                        <button
                                                            onClick={() => setCustomOrbImage(null)}
                                                            className="px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider text-rose-500 hover:bg-rose-50 transition-colors"
                                                        >
                                                            Remove Image
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Image Scale Slider */}
                                    {customOrbImage && isSpillEnabled && (
                                        <div className="space-y-2 border-t border-slate-100 pt-4">
                                            <div className="flex justify-between items-center px-1">
                                                <label className="text-xs font-bold uppercase text-slate-400">Image Scale</label>
                                                <span className="text-xs font-mono font-bold text-sky-600">{orbImageScale.toFixed(2)}x</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] font-bold text-slate-300">0.5x</span>
                                                <input
                                                    type="range"
                                                    min="0.5"
                                                    max="3.0"
                                                    step="0.05"
                                                    value={orbImageScale}
                                                    onChange={(e) => setOrbImageScale(parseFloat(e.target.value))}
                                                    className="flex-1 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-sky-500 hover:accent-sky-400 transition-all border border-slate-200"
                                                />
                                                <span className="text-[10px] font-bold text-slate-300">3.0x</span>
                                            </div>
                                        </div>
                                    )}

                                    {customOrbImage && isSpillEnabled && (
                                        <div className="space-y-2 border-t border-slate-100 pt-4">
                                            <label className="text-xs font-bold uppercase text-slate-400 ml-1">Spill Areas</label>
                                            <div className="flex gap-8">
                                                {/* Interactive Visualizer */}
                                                <div className="relative w-48 h-48 border-2 border-slate-100 rounded-xl overflow-hidden bg-slate-50 mx-auto select-none">
                                                    {/* The Image Background */}
                                                    <img
                                                        src={customOrbImage}
                                                        className="absolute inset-0 w-full h-full object-cover opacity-50 grayscale transition-transform duration-300 origin-center"
                                                        style={{ transform: `scale(${orbImageScale})` }}
                                                        alt=""
                                                    />

                                                    {/* The Circle Mask (Inverse) */}
                                                    <div className="absolute inset-0 pointer-events-none z-10">
                                                        <svg width="100%" height="100%" viewBox="0 0 100 100">
                                                            <defs>
                                                                <mask id="circleMask">
                                                                    <rect width="100" height="100" fill="white" />
                                                                    <circle cx="50" cy="50" r="35" fill="black" />
                                                                </mask>
                                                            </defs>
                                                            <rect width="100" height="100" fill="rgba(0,0,0,0.6)" mask="url(#circleMask)" />
                                                        </svg>
                                                    </div>

                                                    {/* Quadrant Toggles */}
                                                    <div className="absolute inset-0 z-20 grid grid-cols-2 grid-rows-2">
                                                        {['tl', 'tr', 'bl', 'br'].map((q) => (
                                                            <button
                                                                key={q}
                                                                onClick={() => toggleSpillQuadrant(q)}
                                                                className={`
                                                                relative border-dashed border-white/30 transition-all duration-200 hover:bg-sky-500/20 active:scale-95 flex items-center justify-center
                                                                ${q === 'tl' ? 'border-r border-b rounded-tl-xl' : ''}
                                                                ${q === 'tr' ? 'border-l border-b rounded-tr-xl' : ''}
                                                                ${q === 'bl' ? 'border-r border-t rounded-bl-xl' : ''}
                                                                ${q === 'br' ? 'border-l border-t rounded-br-xl' : ''}
                                                                ${orbSpill[q] ? 'bg-sky-500/30' : ''}
                                                            `}
                                                            >
                                                                {orbSpill[q] && (
                                                                    <div className="p-1 bg-sky-500 rounded-full text-white shadow-sm">
                                                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                                                                            <polyline points="20 6 9 17 4 12" />
                                                                        </svg>
                                                                    </div>
                                                                )}
                                                            </button>
                                                        ))}
                                                    </div>

                                                    {/* Center Label */}
                                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                                                        <div className="bg-black/50 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
                                                            ORB
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex-1 text-xs text-slate-500 space-y-2 py-2">
                                                    <p>Click the quadrants to toggle spill for that area.</p>
                                                    <ul className="list-disc pl-4 space-y-1">
                                                        <li><span className="font-bold text-sky-600">Selected:</span> Image overflows the circle in this corner.</li>
                                                        <li><span className="font-bold text-slate-400">Unselected:</span> Image is clipped to the circle in this corner.</li>
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </ConfigSection>

                            {/* Background Removal Banner */}
                            <button
                                onClick={() => openUrl('https://www.remove.bg/upload')}
                                className="w-full p-6 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 rounded-2xl shadow-lg shadow-teal-200 group hover:shadow-xl hover:shadow-teal-300 transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                                <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>

                                <div className="relative z-10 flex items-center justify-between">
                                    <div className="text-left space-y-1">
                                        <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                                            Make it Pop
                                            <span className="px-2 py-0.5 bg-white/20 rounded-full text-[10px] uppercase tracking-wider font-bold">Free Tool</span>
                                        </h3>
                                        <p className="text-emerald-50 text-xs font-medium max-w-sm leading-relaxed">
                                            Use <span className="font-bold text-white underline decoration-white/50 underline-offset-2">remove.bg</span> to clear image backgrounds. This creates a stunning 3D pop-out effect when using spilled corners on your Orb!
                                        </p>
                                    </div>
                                    <div className="p-3 bg-white/10 rounded-xl group-hover:bg-white/20 transition-colors backdrop-blur-sm">
                                        <ExternalLink className="text-white" size={20} />
                                    </div>
                                </div>
                            </button>

                            {/* Pro Tip Section */}
                            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                        <span className="bg-amber-400 text-white px-2 py-0.5 rounded text-[10px]">PRO TIP</span>
                                        Handling Cropped Images
                                    </h3>
                                </div>
                                <div className="p-6 space-y-6">
                                    <div className="flex gap-6 items-start">
                                        <img
                                            src="/tip.png"
                                            alt="Tip: Extending cropped images"
                                            className="w-32 h-32 object-contain rounded-lg border border-slate-100 bg-slate-50 shadow-sm"
                                        />
                                        <div className="space-y-2 text-xs text-slate-500 leading-relaxed">
                                            <p className="font-bold text-slate-700">Image cut off? No problem.</p>
                                            <p>
                                                Sometimes an image is too zoomed in or cropped awkwardly for the orb. You can use Generative Fill tools (like in Photoshop or online AI editors) to "zoom out" and extend the artwork.
                                            </p>
                                            <p>
                                                Mark the area you want to expand with a primary color (like red) and use the prompt below to generate the missing parts while keeping the original style.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="bg-slate-900 rounded-xl p-4 relative group">
                                        <div className="absolute top-3 right-3">
                                            <button
                                                onClick={handleCopyPrompt}
                                                className={`
                                                flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all
                                                ${copied
                                                        ? 'bg-emerald-500 text-white'
                                                        : 'bg-white/10 text-slate-400 hover:bg-white/20 hover:text-white'
                                                    }
                                            `}
                                            >
                                                {copied ? (
                                                    <>
                                                        <Check size={12} /> Copied!
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy size={12} /> Copy Prompt
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                        <div className="text-xs font-mono text-emerald-400 mb-2 select-none opacity-50">GEN FILL PROMPT</div>
                                        <p className="font-mono text-xs text-slate-300 pr-24 leading-relaxed selection:bg-emerald-500/30 selection:text-emerald-200">
                                            {promptText}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                            <ConfigSection title="Pseudonym" icon={User}>
                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        value={userName}
                                        onChange={(e) => setUserName(e.target.value)}
                                        className="w-full p-3 bg-white border-2 border-slate-100 rounded-xl font-bold text-slate-700 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition-all placeholder:text-slate-300"
                                        placeholder="Enter your name..."
                                    />
                                </div>
                            </ConfigSection>

                            <ConfigSection title="Signature" icon={Smile}>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {AVATARS.map((avatar, index) => {
                                        const isCustom = avatar === 'custom';
                                        const isSelected = isCustom ? !AVATARS.slice(0, -1).includes(userAvatar) : userAvatar === avatar.trim();
                                        const multiline = isMultiLine(avatar);

                                        return (
                                            <button
                                                key={index}
                                                onClick={() => handleAvatarSelect(avatar)}
                                                className={`p-4 rounded-xl text-sm font-medium transition-all border-2 flex items-center justify-center min-h-[64px] ${isSelected
                                                    ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-md ring-2 ring-sky-200'
                                                    : 'border-slate-100 bg-white text-slate-500 hover:border-sky-200 hover:text-sky-600 hover:shadow-sm'
                                                    }`}
                                            >
                                                {isCustom ? (
                                                    <span className="italic opacity-50">Custom...</span>
                                                ) : (
                                                    <span className={`font-mono text-xs ${multiline ? 'text-[4px] leading-none whitespace-pre text-left' : 'text-lg'}`}>{avatar.trim()}</span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Custom Avatar Input - Shown if Custom is selected or user types in it */}
                                <div className={`mt-4 space-y-2 transition-all duration-300 ${!AVATARS.slice(0, -1).map(a => a.trim()).includes(userAvatar) ? 'opacity-100 translate-y-0' : 'opacity-50 grayscale'}`}>
                                    <label className="text-xs font-bold uppercase text-slate-400 ml-1">Custom ASCII Avatar (Multi-line supported)</label>
                                    <textarea
                                        value={AVATARS.slice(0, -1).map(a => a.trim()).includes(userAvatar) ? customAvatar : userAvatar}
                                        onChange={(e) => {
                                            setCustomAvatar(e.target.value);
                                            setUserAvatar(e.target.value);
                                        }}
                                        className="w-full p-3 bg-white border-2 border-slate-100 rounded-xl font-mono text-slate-700 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition-all min-h-[120px] text-xs leading-tight whitespace-pre"
                                        placeholder="Paste your ASCII art here..."
                                    />
                                </div>
                            </ConfigSection>

                            {/* Preview */}
                            <div className="mt-8 p-6 bg-gradient-to-br from-sky-400 to-blue-500 rounded-2xl shadow-lg text-white">
                                <h3 className="text-xs font-black uppercase tracking-widest text-sky-100 mb-4 opacity-70 text-center">Banner Preview</h3>
                                <div className="flex items-center gap-6 justify-center">
                                    {/* Auto-detect Layout wrapped in flexible container */}
                                    {isMultiLine(userAvatar) ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="text-2xl font-black tracking-tight drop-shadow-md opacity-90">
                                                <span>{userName}</span>
                                            </div>
                                            <pre className="font-mono text-[4px] leading-none whitespace-pre text-white/90 drop-shadow-md">
                                                {userAvatar}
                                            </pre>
                                        </div>
                                    ) : (
                                        <div className="text-3xl font-black tracking-tight drop-shadow-md">
                                            <span className="mr-2 opacity-90">{userAvatar}</span>
                                            <span>{userName}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* External Link Banner */}
                            <button
                                onClick={() => openUrl('https://emojicombos.com/')}
                                className="w-full p-6 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl shadow-lg shadow-purple-200 group hover:shadow-xl hover:shadow-purple-300 transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                                <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>

                                <div className="relative z-10 flex items-center justify-between">
                                    <div className="text-left space-y-1">
                                        <h3 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                                            Need more ASCII art?
                                            <span className="px-2 py-0.5 bg-white/20 rounded-full text-[10px] uppercase tracking-wider font-bold">Recommended</span>
                                        </h3>
                                        <p className="text-indigo-50 text-xs font-medium max-w-sm leading-relaxed">
                                            Visit <span className="font-bold text-white underline decoration-white/50 underline-offset-2">EmojiCombos.com</span> to find the perfect text art collection or draw your own masterpiece.
                                        </p>
                                    </div>
                                    <div className="p-3 bg-white/10 rounded-xl group-hover:bg-white/20 transition-colors backdrop-blur-sm">
                                        <ExternalLink className="text-white" size={20} />
                                    </div>
                                </div>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function ConfigSection({ title, icon: Icon, children }) {
    return (
        <div className="space-y-4 border-t border-sky-50 pt-6 first:border-0 first:pt-0 bg-white/50 p-4 rounded-2xl">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">{Icon && <Icon size={14} />} {title}</h3>
            <div className="space-y-4 px-1">{children}</div>
        </div>
    );
}
