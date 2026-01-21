import React from 'react';
import { FOLDER_COLORS } from '../utils/folderColors';
import { Pen, Play } from 'lucide-react';
import { getThumbnailUrl } from '../utils/youtubeUtils';


import UnifiedBannerBackground from './UnifiedBannerBackground';
import { useConfigStore } from '../store/configStore';

const PageBanner = ({ title, description, folderColor, onEdit, videoCount, countLabel = 'Video', creationYear, author, avatar, continueVideo, onContinue, children, childrenPosition = 'right', topRightContent, seamlessBottom = false }) => {
    const { bannerPattern, customPageBannerImage, bannerBgSize, setBannerHeight, setBannerBgSize } = useConfigStore();

    // Find color config if folderColor is provided
    // If folderColor is 'unsorted', distinct gray style
    const isUnsorted = folderColor === 'unsorted';

    const colorConfig = (!isUnsorted && folderColor)
        ? FOLDER_COLORS.find(c => c.id === folderColor)
        : null;

    // Determine gradient styles
    let gradientStyle;
    let shadowColor;

    // Measure height and calculate background size for Unified Banner
    const bannerRef = React.useRef(null);

    React.useEffect(() => {
        if (!bannerRef.current) return;

        const updateDimensions = () => {
            const banner = bannerRef.current;
            if (!banner) return;

            const width = banner.offsetWidth;
            const height = banner.offsetHeight;

            // If no custom image, just report height
            if (!customPageBannerImage) {
                setBannerHeight(height);
                return;
            }

            // Just report height for PageBanner spacing, we use cover/center now.
            setBannerHeight(height);
        };


        const observer = new ResizeObserver(updateDimensions);
        observer.observe(bannerRef.current);

        // Also listen to window resize for horizontal changes
        window.addEventListener('resize', updateDimensions);

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', updateDimensions);
        };
    }, [customPageBannerImage, setBannerHeight, setBannerBgSize]);

    if (customPageBannerImage) {
        gradientStyle = {
            backgroundImage: `url(${customPageBannerImage})`,
            backgroundSize: 'cover', // Standard cover
            backgroundPositionY: 'center',
            backgroundPositionX: '0px', // Allow animation to take over X axis
            backgroundRepeat: 'repeat-x', // Repeat horizontally for scroll
            // backgroundAttachment: 'fixed', // Removed fixed to basic absolute stitching
        };
        // Use a neutral or dominant color for shadow if possible, or fallback
        shadowColor = colorConfig?.hex || '#3b82f6';
    } else if (isUnsorted) {
        gradientStyle = {
            background: 'linear-gradient(135deg, #64748b 0%, #475569 100%)' // Slate/Gray
        };
        shadowColor = '#64748b';
    } else if (colorConfig) {
        gradientStyle = {
            background: `linear-gradient(135deg, ${colorConfig.hex}DD 0%, ${colorConfig.hex} 100%)`
        };
        shadowColor = colorConfig.hex;
    } else {
        // Default Playlist Blue
        gradientStyle = {
            background: 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)' // Sky to Blue
        };
        shadowColor = '#3b82f6';
    }

    // Check if custom image is a GIF
    const isGif = customPageBannerImage?.startsWith('data:image/gif');

    return (
        <div ref={bannerRef} className={`w-full relative animate-fade-in group mx-auto h-[220px] ${seamlessBottom ? 'mb-0' : 'mb-8'}`}>

            {/* Background Layer - Hides overflow for shapes/patterns/images */}
            <div
                className={`absolute inset-0 overflow-hidden ${seamlessBottom ? 'rounded-t-2xl rounded-b-none shadow-none' : 'rounded-2xl shadow-lg'}`}
                style={{
                    // Gradient styles only when NO custom image (fallback)
                    ...(!customPageBannerImage ? gradientStyle : {}),
                    boxShadow: seamlessBottom ? 'none' : `0 10px 25px -5px ${shadowColor}50`
                }}
            >
                {/* Unified GPU Banner */}
                {customPageBannerImage && (
                    <UnifiedBannerBackground
                        image={customPageBannerImage}
                        bgSize="cover"
                        yOffset="center"
                        isGif={isGif}
                    />
                )}

                {/* Animated Pattern Overlay */}
                {!customPageBannerImage && (
                    <div className={`absolute inset-0 pointer-events-none z-0 pattern-${bannerPattern || 'diagonal'}`} />
                )}



                {/* Abstract Background Shapes */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none transform group-hover:scale-110 transition-transform duration-1000 ease-in-out" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-2xl -ml-16 -mb-16 pointer-events-none" />
            </div>

            {/* Edit Button - Visible on hover if onEdit is provided */}
            {onEdit && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onEdit();
                    }}
                    className="absolute top-4 left-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-300 transform hover:scale-105 z-20"
                    title="Edit Details"
                >
                    <Pen size={18} />
                </button>
            )}

            {/* Top Right Content */}
            {topRightContent && (
                <div className="absolute top-4 right-4 z-30">
                    {topRightContent}
                </div>
            )}

            {/* Content Container - Allow overflow for dropdowns */}
            <div className="relative z-10 flex items-start h-full gap-8 w-full px-8 pt-4">
                {/* Avatar Section (Optional) */}
                {avatar && (
                    <div className="shrink-0 hidden md:flex flex-col items-center gap-1 animate-in fade-in slide-in-from-left-4 duration-700 mt-8">
                        {avatar.includes('\n') ? (
                            <pre className="font-mono text-[4px] leading-none whitespace-pre text-white/90 drop-shadow-md select-none opacity-90 mix-blend-overlay" style={{ textShadow: '-0.5px -0.5px 0 #000, 0.5px -0.5px 0 #000, -0.5px 0.5px 0 #000, 0.5px 0.5px 0 #000, 0 1px 2px rgba(0,0,0,1)' }}>
                                {avatar}
                            </pre>
                        ) : (
                            // Single line avatars (Lenny) are larger
                            <div className="font-mono text-3xl font-bold text-white/90 drop-shadow-md whitespace-nowrap opacity-90 mix-blend-overlay" style={{ textShadow: '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 4px 8px rgba(0,0,0,0.8)' }}>
                                {avatar}
                            </div>
                        )}
                    </div>
                )}

                <div className={`flex flex-col justify-start min-w-0 ${continueVideo ? 'pr-64' : ''}`}>
                    <h1 className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tight drop-shadow-md truncate" style={{ textShadow: '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, 0 4px 8px rgba(0,0,0,0.8)' }}>
                        {title}
                    </h1>

                    {/* Metadata Row */}
                    <div className="flex items-center gap-3 text-white/80 font-medium text-sm md:text-base mb-4" style={{ textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 2px 4px rgba(0,0,0,0.9)' }}>
                        {videoCount !== undefined && (
                            <span>{videoCount} {videoCount === 1 ? countLabel : `${countLabel}s`}</span>
                        )}
                        {(videoCount !== undefined && (creationYear || author)) && (
                            <span className="w-1 h-1 rounded-full bg-white/60 shadow-sm" />
                        )}
                        {creationYear && (
                            <span>{creationYear}</span>
                        )}
                        {(creationYear && author) && (
                            <span className="w-1 h-1 rounded-full bg-white/60 shadow-sm" />
                        )}
                        {author && (
                            <span>{author}</span>
                        )}
                    </div>

                    {description && (
                        <p className="text-sm md:text-base text-white/90 font-medium max-w-4xl leading-relaxed drop-shadow-sm opacity-90 line-clamp-2" style={{ textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 2px 4px rgba(0,0,0,0.8)' }}>
                            {description}
                        </p>
                    )}

                    {/* Bottom Content (e.g. Tabs) */}
                    {children && childrenPosition === 'bottom' && (
                        <div className="mt-4">
                            {children}
                        </div>
                    )}
                </div>

                {/* Right Content */}
                {children && childrenPosition === 'right' && (
                    <div className="ml-auto pl-8">
                        {children}
                    </div>
                )}
            </div>

            {/* Continue Section - Bottom Right */}
            {continueVideo && (
                <div
                    className="absolute top-12 right-6 flex flex-col items-end gap-2 group/continue cursor-pointer z-20"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (onContinue) onContinue();
                    }}
                >
                    <span className="text-white/80 font-bold text-sm tracking-wider group-hover/continue:text-white transition-colors" style={{ textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 2px 4px rgba(0,0,0,0.8)' }}>
                        CONTINUE?
                    </span>
                    <div className="relative h-24 aspect-video rounded-lg overflow-hidden shadow-lg border-2 border-white/20 group-hover/continue:border-white transition-all transform group-hover/continue:scale-105">
                        <img
                            src={getThumbnailUrl(continueVideo.video_id, 'medium')}
                            alt={continueVideo.title}
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover/continue:opacity-100 transition-opacity">
                            <Play className="text-white fill-white" size={24} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


export default PageBanner;
