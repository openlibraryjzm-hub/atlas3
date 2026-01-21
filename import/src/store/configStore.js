import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useConfigStore = create(
    persist(
        (set) => ({
            // Pin Track & Header
            pinAnchorX: 50,
            setPinAnchorX: (val) => set({ pinAnchorX: val }),
            pinAnchorY: 0,
            setPinAnchorY: (val) => set({ pinAnchorY: val }),
            plusButtonX: 100,
            setPlusButtonX: (val) => set({ plusButtonX: val }),
            plusButtonY: 0,
            setPlusButtonY: (val) => set({ plusButtonY: val }),
            pinToggleY: 0,
            setPinToggleY: (val) => set({ pinToggleY: val }),

            // Playlist Header
            playlistToggleX: 20,
            setPlaylistToggleX: (val) => set({ playlistToggleX: val }),
            playlistTabsX: 0,
            setPlaylistTabsX: (val) => set({ playlistTabsX: val }),
            playlistInfoX: 0,
            setPlaylistInfoX: (val) => set({ playlistInfoX: val }),
            playlistInfoWidth: 200,
            setPlaylistInfoWidth: (val) => set({ playlistInfoWidth: val }),

            // Playlist Capsule
            playlistCapsuleX: 0,
            setPlaylistCapsuleX: (val) => set({ playlistCapsuleX: val }),
            playlistCapsuleY: 0,
            setPlaylistCapsuleY: (val) => set({ playlistCapsuleY: val }),
            playlistCapsuleWidth: 74,
            setPlaylistCapsuleWidth: (val) => set({ playlistCapsuleWidth: val }),
            playlistCapsuleHeight: 32,
            setPlaylistCapsuleHeight: (val) => set({ playlistCapsuleHeight: val }),
            playlistChevronLeftX: 0,
            setPlaylistChevronLeftX: (val) => set({ playlistChevronLeftX: val }),
            playlistPlayCircleX: 0,
            setPlaylistPlayCircleX: (val) => set({ playlistPlayCircleX: val }),
            playlistChevronRightX: 0,
            setPlaylistChevronRightX: (val) => set({ playlistChevronRightX: val }),

            // Orb Image Tuning
            orbImageScale: 1.0,
            setOrbImageScale: (val) => set({ orbImageScale: val }),
            orbImageScaleW: 1.0,
            setOrbImageScaleW: (val) => set({ orbImageScaleW: val }),
            orbImageScaleH: 1.0,
            setOrbImageScaleH: (val) => set({ orbImageScaleH: val }),
            orbImageXOffset: 0,
            setOrbImageXOffset: (val) => set({ orbImageXOffset: val }),
            orbImageYOffset: 0,
            setOrbImageYOffset: (val) => set({ orbImageYOffset: val }),
            orbSize: 150,
            setOrbSize: (val) => set({ orbSize: val }),
            orbMenuGap: 30, // Gap between orb and menus
            setOrbMenuGap: (val) => set({ orbMenuGap: val }),

            // Global Layout
            menuWidth: 340,
            setMenuWidth: (val) => set({ menuWidth: val }),
            menuHeight: 102,
            setMenuHeight: (val) => set({ menuHeight: val }),

            // Video Menu Toolbar
            modeHandleSize: 20,
            setModeHandleSize: (val) => set({ modeHandleSize: val }),
            modeHandleInternalSize: 14,
            setModeHandleInternalSize: (val) => set({ modeHandleInternalSize: val }),

            // Center Cluster
            modeSwitcherX: -128, // Grid moved to between chevrons
            setModeSwitcherX: (val) => set({ modeSwitcherX: val }),
            videoChevronLeftX: -150, // Leftmost
            setVideoChevronLeftX: (val) => set({ videoChevronLeftX: val }),
            videoChevronRightX: -100, // Right of Play
            setVideoChevronRightX: (val) => set({ videoChevronRightX: val }),
            videoPlayButtonX: -65, // Nudged right (swapped with grid)
            setVideoPlayButtonX: (val) => set({ videoPlayButtonX: val }),

            // Right Side Group (Shifted for equal spacing)
            starButtonX: -19,
            setStarButtonX: (val) => set({ starButtonX: val }),
            shuffleButtonX: 22,
            setShuffleButtonX: (val) => set({ shuffleButtonX: val }),

            // Right Flank
            pinFirstButtonX: 63,
            setPinFirstButtonX: (val) => set({ pinFirstButtonX: val }),
            likeButtonX: 104,
            setLikeButtonX: (val) => set({ likeButtonX: val }),
            menuButtonX: 280, // Moved 100px right
            setMenuButtonX: (val) => set({ menuButtonX: val }),
            tooltipButtonX: 145,
            setTooltipButtonX: (val) => set({ tooltipButtonX: val }),

            // Custom Banner Image
            customBannerImage: null,
            setCustomBannerImage: (val) => set({ customBannerImage: val }),

            // Custom Orb Image & Spill
            customOrbImage: null,
            setCustomOrbImage: (val) => set({ customOrbImage: val }),
            isSpillEnabled: false,
            setIsSpillEnabled: (val) => set({ isSpillEnabled: val }),
            orbSpill: { tl: true, tr: true, bl: true, br: true },
            setOrbSpill: (val) => set({ orbSpill: val }),

            // Restored Missing Keys (Defaults)
            pinFirstButtonSize: 34,
            setPinFirstButtonSize: (val) => set({ pinFirstButtonSize: val }),


            dotMenuWidth: 240,
            setDotMenuWidth: (val) => set({ dotMenuWidth: val }),
            dotMenuHeight: 100,
            setDotMenuHeight: (val) => set({ dotMenuHeight: val }),
            dotMenuY: -80,
            setDotMenuY: (val) => set({ dotMenuY: val }),
            dotSize: 32,
            setDotSize: (val) => set({ dotSize: val }),

            playlistHandleSize: 26,
            setPlaylistHandleSize: (val) => set({ playlistHandleSize: val }),
            playlistPlayIconSize: 14,
            setPlaylistPlayIconSize: (val) => set({ playlistPlayIconSize: val }),
            playlistChevronIconSize: 14,
            setPlaylistChevronIconSize: (val) => set({ playlistChevronIconSize: val }),

            bottomBarHeight: 40,
            setBottomBarHeight: (val) => set({ bottomBarHeight: val }),

            titleFontSize: 16,
            setTitleFontSize: (val) => set({ titleFontSize: val }),
            metadataFontSize: 11,
            setMetadataFontSize: (val) => set({ metadataFontSize: val }),

            pinSize: 20,
            setPinSize: (val) => set({ pinSize: val }),
            pinWidth: 40,
            setPinWidth: (val) => set({ pinWidth: val }),
            pinHeight: 30,
            setPinHeight: (val) => set({ pinHeight: val }),

            bottomIconSize: 34,
            setBottomIconSize: (val) => set({ bottomIconSize: val }),
            navChevronSize: 20,
            setNavChevronSize: (val) => set({ navChevronSize: val }),

            orbButtonSpread: 35,
            setOrbButtonSpread: (val) => set({ orbButtonSpread: val }),

            // Quick Assign/Shuffle Colors
            quickAssignColor: null,
            setQuickAssignColor: (val) => set({ quickAssignColor: val }),
            quickShuffleColor: 'all',
            setQuickShuffleColor: (val) => set({ quickShuffleColor: val }),

            // User Profile
            userName: 'Boss',
            setUserName: (val) => set({ userName: val }),
            userAvatar: '( ͡° ͜ʖ ͡°)',
            setUserAvatar: (val) => set({ userAvatar: val }),

            // Visual Flair
            bannerPattern: 'diagonal',
            setBannerPattern: (val) => set({ bannerPattern: val }),
            customPageBannerImage: null,
            setCustomPageBannerImage: (val) => set({ customPageBannerImage: val }),

            // Player Border Pattern
            playerBorderPattern: 'diagonal',
            setPlayerBorderPattern: (val) => set({ playerBorderPattern: val }),

            // Visualizer Gradient
            visualizerGradient: true,
            setVisualizerGradient: (val) => set({ visualizerGradient: val }),

            // Audio Visualizer Tuning (Rainmeter-style)
            // NOTE: These are intentionally stored as user-tweakable config so we can dial in "feel".
            visualizerBarCount: 113,
            setVisualizerBarCount: (val) => set({ visualizerBarCount: val }),
            visualizerBarWidth: 4,
            setVisualizerBarWidth: (val) => set({ visualizerBarWidth: val }),
            visualizerRadius: 77,
            setVisualizerRadius: (val) => set({ visualizerRadius: val }),
            visualizerRadiusY: 77,
            setVisualizerRadiusY: (val) => set({ visualizerRadiusY: val }),
            visualizerMaxBarLength: 76,
            setVisualizerMaxBarLength: (val) => set({ visualizerMaxBarLength: val }),
            visualizerMinBarLength: 7,
            setVisualizerMinBarLength: (val) => set({ visualizerMinBarLength: val }),

            visualizerSmoothing: 0.75,
            setVisualizerSmoothing: (val) => set({ visualizerSmoothing: val }),
            visualizerPreAmpGain: 4.0,
            setVisualizerPreAmpGain: (val) => set({ visualizerPreAmpGain: val }),
            visualizerSensitivity: 64,
            setVisualizerSensitivity: (val) => set({ visualizerSensitivity: val }),

            // Stored in degrees for sanity; converted to radians where used.
            visualizerAngleTotalDeg: 360,
            setVisualizerAngleTotalDeg: (val) => set({ visualizerAngleTotalDeg: val }),
            visualizerAngleStartDeg: -90,
            setVisualizerAngleStartDeg: (val) => set({ visualizerAngleStartDeg: val }),
            visualizerClockwise: true,
            setVisualizerClockwise: (val) => set({ visualizerClockwise: val }),
            visualizerInward: false,
            setVisualizerInward: (val) => set({ visualizerInward: val }),

            visualizerFftSize: 2048,
            setVisualizerFftSize: (val) => set({ visualizerFftSize: val }),
            visualizerFreqMin: 60,
            setVisualizerFreqMin: (val) => set({ visualizerFreqMin: val }),
            visualizerFreqMax: 11000,
            setVisualizerFreqMax: (val) => set({ visualizerFreqMax: val }),
            visualizerUpdateRateMs: 16,
            setVisualizerUpdateRateMs: (val) => set({ visualizerUpdateRateMs: val }),

            resetVisualizerTuning: () => set({
                visualizerBarCount: 113,
                visualizerBarWidth: 4,
                visualizerRadius: 77,
                visualizerRadiusY: 77,
                visualizerMaxBarLength: 76,
                visualizerMinBarLength: 7,
                visualizerSmoothing: 0.75,
                visualizerPreAmpGain: 4.0,
                visualizerSensitivity: 64,
                visualizerAngleTotalDeg: 360,
                visualizerAngleStartDeg: -90,
                visualizerClockwise: true,
                visualizerInward: false,
                visualizerFftSize: 2048,
                visualizerFreqMin: 60,
                visualizerFreqMax: 11000,
                visualizerUpdateRateMs: 16,
            }),

            // Unified Banner State (Calculated)
            bannerHeight: 0,
            setBannerHeight: (val) => set({ bannerHeight: val }),
            bannerBgSize: '100% auto',
            setBannerBgSize: (val) => set({ bannerBgSize: val }),
        }), {
        name: 'config-storage-v10', // name of the item in the storage (must be unique)
    }
    )
);
