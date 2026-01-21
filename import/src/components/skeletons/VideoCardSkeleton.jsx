import React from 'react';

const VideoCardSkeleton = () => {
    return (
        <div className="relative rounded-lg bg-transparent">
            {/* Thumbnail Skeleton */}
            <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-800/50">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
            </div>

            {/* Content Skeleton */}
            <div className="p-0 pt-3">
                {/* Title Lines */}
                <div className="h-5 bg-slate-800/50 rounded w-3/4 mb-2 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
                </div>
                <div className="h-4 bg-slate-800/30 rounded w-1/2 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
                </div>
            </div>
        </div>
    );
};

export default VideoCardSkeleton;
