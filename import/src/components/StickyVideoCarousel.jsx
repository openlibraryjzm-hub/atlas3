import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const StickyVideoCarousel = ({ children, title = "Stickied Videos" }) => {
    const scrollContainerRef = useRef(null);
    const [showControls, setShowControls] = useState(false);

    // Drag to scroll state
    const [isDown, setIsDown] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const isDraggingRef = useRef(false); // Ref to track if a drag occurred to prevent clicks

    const count = React.Children.count(children);

    if (count === 0) return null;

    // If 3 or fewer items, show in a standard grid (first row)
    if (count <= 3) {
        return (
            <div className="w-full mb-8 animate-fade-in px-8"> {/* Added padding to match carousel visual width if needed, or just container padding */}
                <div className="flex items-center gap-2 mb-3">
                    <SplatterIcon className="w-5 h-5 text-amber-500" />
                    <h3 className="text-lg font-bold text-[#052F4A]">{title}</h3>
                </div>
                <div className="grid grid-cols-3 gap-6">
                    {children}
                </div>
            </div>
        );
    }

    // Scroll buttons logic
    const scroll = (direction) => {
        if (scrollContainerRef.current) {
            const { clientWidth } = scrollContainerRef.current;
            const scrollAmount = clientWidth * 0.8; // Scroll 80% of width
            scrollContainerRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth',
            });
        }
    };

    // Drag to scroll handlers
    const handleMouseDown = (e) => {
        setIsDown(true);
        setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
        setScrollLeft(scrollContainerRef.current.scrollLeft);
        isDraggingRef.current = false;
        // Disable scroll snap while dragging for smoothness
        scrollContainerRef.current.style.scrollSnapType = 'none';
        scrollContainerRef.current.style.cursor = 'grabbing';
    };

    const handleMouseLeave = () => {
        setIsDown(false);
        if (scrollContainerRef.current) {
            scrollContainerRef.current.style.scrollSnapType = 'x mandatory'; // Re-enable snap
            scrollContainerRef.current.style.cursor = 'grab';
        }
    };

    const handleMouseUp = () => {
        setIsDown(false);
        if (scrollContainerRef.current) {
            scrollContainerRef.current.style.scrollSnapType = 'x mandatory'; // Re-enable snap
            scrollContainerRef.current.style.cursor = 'grab';
        }
        // Don't reset isDraggingRef immediately so click capture can check it
        setTimeout(() => {
            isDraggingRef.current = false;
        }, 100);
    };

    const handleMouseMove = (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - scrollContainerRef.current.offsetLeft;
        const walk = (x - startX) * 2; // Scroll speed multiplier
        scrollContainerRef.current.scrollLeft = scrollLeft - walk;

        if (Math.abs(walk) > 5) {
            isDraggingRef.current = true;
        }
    };

    // Prevent click if dragged
    const handleCaptureClick = (e) => {
        if (isDraggingRef.current) {
            e.preventDefault();
            e.stopPropagation();
        }
    };

    return (
        <div
            className="w-full mb-8 animate-fade-in relative px-8"
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
        >
            <div className="flex items-center gap-2 mb-3">
                <SplatterIcon className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-bold text-[#052F4A]">{title}</h3>
                <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                    Scroll to view {count} items
                </span>
            </div>

            <div className="relative -mx-4 px-4 sticky-carousel-wrapper">
                <style jsx>{`
                    .sticky-carousel-wrapper ::-webkit-scrollbar {
                        height: 8px;
                    }
                    .sticky-carousel-wrapper ::-webkit-scrollbar-track {
                        background: rgba(0, 0, 0, 0.05);
                        border-radius: 4px;
                        margin-left: 16px;
                        margin-right: 16px;
                    }
                    .sticky-carousel-wrapper ::-webkit-scrollbar-thumb {
                        background: rgba(5, 47, 74, 0.2); 
                        border-radius: 4px;
                    }
                    .sticky-carousel-wrapper ::-webkit-scrollbar-thumb:hover {
                        background: rgba(5, 47, 74, 0.5); 
                    }
                `}</style>

                {/* Left Control */}
                <button
                    onClick={() => scroll('left')}
                    className={`absolute left-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-full shadow-lg flex items-center justify-center text-[#052F4A] transition-all duration-300 ${showControls ? 'opacity-100 translate-x-1/2' : 'opacity-0 -translate-x-4 pointer-events-none'
                        }`}
                >
                    <ChevronLeft size={20} />
                </button>

                <div
                    ref={scrollContainerRef}
                    className="flex gap-6 overflow-x-auto pb-6 pt-2 snap-x snap-mandatory cursor-grab"
                    onMouseDown={handleMouseDown}
                    onMouseLeave={handleMouseLeave}
                    onMouseUp={handleMouseUp}
                    onMouseMove={handleMouseMove}
                    onClickCapture={handleCaptureClick}
                    style={{
                        scrollbarWidth: 'auto', // Ensure scrollbar is visible
                        // msOverflowStyle: 'none', // Removed hiding
                        scrollBehavior: 'auto'
                    }}
                >
                    {React.Children.map(children, (child) => (
                        <div className="w-[calc(33.333%-16px)] snap-start flex-shrink-0 select-none">
                            {child}
                        </div>
                    ))}
                </div>

                {/* Right Control */}
                <button
                    onClick={() => scroll('right')}
                    className={`absolute right-0 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-full shadow-lg flex items-center justify-center text-[#052F4A] transition-all duration-300 ${showControls ? 'opacity-100 -translate-x-1/2' : 'opacity-0 translate-x-4 pointer-events-none'
                        }`}
                >
                    <ChevronRight size={20} />
                </button>
            </div>
        </div>
    );
};

// Splatter Icon Component
const SplatterIcon = ({ className }) => (
    <svg
        viewBox="0 0 100 100"
        className={className}
        fill="currentColor"
    >
        <path d="M47.5,12.2c0,0-2.3,16.2-7.8,19.3c-5.5,3.1-17.7-6.2-17.7-6.2s3.8,11.2-1.7,16.5c-5.5,5.3-20.2-2.1-20.2-2.1
      s12.5,9.6,9.2,16.5c-3.3,6.9-10.7,5.5-10.7,5.5s12.9,5.7,12.5,14.7c-0.4,9-10.6,15.6-10.6,15.6s15.3-1.6,20.2,4.2
      c4.9,5.8-0.9,13.8-0.9,13.8s9.4-9,16.9-5.3c7.5,3.7,5.9,14.6,5.9,14.6s5.9-11.8,13.6-10.6c7.7,1.2,13.6,9.5,13.6,9.5
      s-1.8-13.6,5.3-16.7c7.1-3.1,16.5,2.7,16.5,2.7s-8.1-13.6-1.5-18.9c6.6-5.3,18.8,0.7,18.8,0.7s-13.2-8.1-11.1-16.7
      C99.2,40.4,100,28.8,100,28.8s-12,8.8-17.7,3.1c-5.7-5.7-1.3-18.8-1.3-18.8s-9,11.6-16.5,9.4c-7.5-2.2-11.1-12.2-11.1-12.2
      S50.4,14.5,47.5,12.2z" />
    </svg>
);

export default StickyVideoCarousel;
