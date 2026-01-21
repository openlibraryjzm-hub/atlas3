import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const PieGraph = ({ data, size = 200, innerRadius = 40, outerRadius = 80 }) => {
    const [hoveredIndex, setHoveredIndex] = useState(null);

    const total = useMemo(() => data.reduce((acc, item) => acc + item.value, 0), [data]);

    const items = useMemo(() => {
        let cumulativeAngle = 0;
        return data.map((item, index) => {
            const angle = (item.value / total) * 360;
            const startAngle = cumulativeAngle;
            cumulativeAngle += angle;

            return {
                ...item,
                startAngle,
                endAngle: cumulativeAngle,
                angle,
                percentage: (item.value / total) * 100
            };
        });
    }, [data, total]);

    const getCoordinatesForPercent = (percent) => {
        const x = Math.cos(2 * Math.PI * percent);
        const y = Math.sin(2 * Math.PI * percent);
        return [x, y];
    };

    if (total === 0) return null;

    return (
        <div className="flex flex-row items-center gap-8 bg-slate-900/50 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-xl">
            <div className="relative" style={{ width: size, height: size }}>
                <svg viewBox="-100 -100 200 200" className="transform -rotate-90 w-full h-full">
                    {items.map((item, index) => {
                        const startRad = (item.startAngle * Math.PI) / 180;
                        const endRad = (item.endAngle * Math.PI) / 180;

                        // Calculate path for arc
                        const x1 = Math.cos(startRad) * outerRadius;
                        const y1 = Math.sin(startRad) * outerRadius;
                        const x2 = Math.cos(endRad) * outerRadius;
                        const y2 = Math.sin(endRad) * outerRadius;

                        // Inner arc
                        const x3 = Math.cos(endRad) * innerRadius;
                        const y3 = Math.sin(endRad) * innerRadius;
                        const x4 = Math.cos(startRad) * innerRadius;
                        const y4 = Math.sin(startRad) * innerRadius;

                        const largeArcFlag = item.angle > 180 ? 1 : 0;

                        const pathData = [
                            `M ${x1} ${y1}`,
                            `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                            `L ${x3} ${y3}`,
                            `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}`,
                            `Z`
                        ].join(' ');

                        return (
                            <motion.path
                                key={item.name}
                                d={pathData}
                                fill={item.color}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{
                                    opacity: hoveredIndex === null || hoveredIndex === index ? 1 : 0.3,
                                    scale: hoveredIndex === index ? 1.05 : 1
                                }}
                                transition={{ duration: 0.3 }}
                                onMouseEnter={() => setHoveredIndex(index)}
                                onMouseLeave={() => setHoveredIndex(null)}
                                className="cursor-pointer stroke-slate-900 hover:stroke-white/20"
                                strokeWidth="1"
                            />
                        );
                    })}
                </svg>

                {/* Center Text (Total) */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                        <div className="text-2xl font-bold text-white">{total}</div>
                        <div className="text-xs text-slate-400">Videos</div>
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                <h3 className="text-sm font-semibold text-slate-300 mb-1 uppercase tracking-wider">Distribution</h3>
                {items.map((item, index) => (
                    <motion.div
                        key={item.name}
                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${hoveredIndex === index ? 'bg-white/10' : 'hover:bg-white/5'}`}
                        onMouseEnter={() => setHoveredIndex(index)}
                        onMouseLeave={() => setHoveredIndex(null)}
                    >
                        <div
                            className="w-3 h-3 rounded-full shadow-sm"
                            style={{ backgroundColor: item.color }}
                        />
                        <div className="flex-1 min-w-[120px]">
                            <div className="text-sm font-medium text-white truncate max-w-[150px]" title={item.name}>
                                {item.name}
                            </div>
                            <div className="text-xs text-slate-400">
                                {item.value} videos ({item.percentage.toFixed(1)}%)
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default PieGraph;
