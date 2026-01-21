import React from 'react';

const PlaylistCardSkeleton = () => {
    return (
        <div className="relative rounded-lg bg-transparent">
            {/* Thumbnail Skeleton */}
            <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-800/50">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
            </div>

            {/* Content Skeleton */}
            <div className="mt-2">
                {/* Title */}
                <div className="h-5 bg-slate-800/50 rounded w-2/3 mb-1.5 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
                </div>
                {/* Count/Info */}
                <div className="flex gap-2">
                    <div className="h-3 bg-slate-800/30 rounded w-16 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
                    </div>
                    <div className="h-3 bg-slate-800/30 rounded w-12 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlaylistCardSkeleton;
