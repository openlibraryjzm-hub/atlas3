import React from 'react';

/**
 * A GPU-accelerated background layer for the Unified Banner system.
 * Uses transform: translate3d for smooth 60fps scrolling without main-thread jank.
 * 
 * Update: Uses two side-by-side divs to ensure '100%' background-size corresponds
 * to one viewport width, preventing accidental 2x zoom.
 * 
 * @param {string} image - The background image URL
 * @param {string} bgSize - The background-size property (e.g., '100% auto')
 * @param {number|string} yOffset - The vertical offset for stitching ('top', 'center', or negative px value)
 * @param {boolean} isGif - If true, disables animation
 */
const UnifiedBannerBackground = ({ image, bgSize, yOffset, isGif = false }) => {
    if (!image) return null;

    const backgroundStyle = {
        backgroundImage: `url(${image})`,
        backgroundSize: bgSize || 'cover',
        backgroundPositionX: 'left',
        backgroundPositionY: typeof yOffset === 'number' ? `${yOffset}px` : yOffset,
        backgroundRepeat: 'repeat-x',
    };

    if (isGif) {
        return (
            <div
                className="absolute inset-0 z-0 pointer-events-none"
                style={{
                    ...backgroundStyle,
                    backgroundPosition: 'center center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: 'cover'
                }}
            />
        );
    }

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            {/* 
                Container is 200% width, sliding from 0 to -50% (one viewport width).
            */}
            <div
                className="absolute top-0 left-0 h-full w-[200%] flex animate-gpu-scroll"
            >
                {/* 
                   First Copy: Covers the initial view.
                   Width is 50% of parent (== 100% of viewport).
                   This ensures 'background-size: 100%' works as expected.
                */}
                <div
                    className="w-1/2 h-full"
                    style={backgroundStyle}
                />

                {/* 
                   Second Copy: seamless loop partner.
                */}
                <div
                    className="w-1/2 h-full"
                    style={backgroundStyle}
                />
            </div>
        </div>
    );
};

export default React.memo(UnifiedBannerBackground);
