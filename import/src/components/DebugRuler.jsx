import React, { useEffect, useRef, useState } from 'react';
import { useLayoutStore } from '../store/layoutStore';

const DebugRuler = ({ targetElementId = 'main-player-ruler-target' }) => {
  const { showRuler, viewMode } = useLayoutStore();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0, top: 0, left: 0 });
  const updateIntervalRef = useRef(null);
  const resizeObserverRef = useRef(null);

  useEffect(() => {
    console.log('DebugRuler useEffect - showRuler:', showRuler);
    
    if (!showRuler) {
      setDimensions({ width: 0, height: 0, top: 0, left: 0 });
      return;
    }

    const updateDimensions = () => {
      // Find the main player element
      const playerElement = document.querySelector('.layout-shell__player');
      console.log('DebugRuler updateDimensions - playerElement found:', !!playerElement);
      
      if (playerElement) {
        const rect = playerElement.getBoundingClientRect();
        console.log('DebugRuler - rect:', { width: rect.width, height: rect.height, top: rect.top, left: rect.left });
        setDimensions({
          width: rect.width,
          height: rect.height,
          top: rect.top,
          left: rect.left
        });
      } else {
        console.warn('DebugRuler: Could not find .layout-shell__player element');
        // Try alternative selector
        const altElement = document.querySelector('[data-debug-label="Main Player"]');
        console.log('DebugRuler: Trying alt selector, found:', !!altElement);
      }
    };

    // Delay initial update to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      updateDimensions();

      // Find player element for ResizeObserver
      const playerElement = document.querySelector('.layout-shell__player');
      
      // Update on resize
      resizeObserverRef.current = new ResizeObserver(updateDimensions);
      if (playerElement) {
        resizeObserverRef.current.observe(playerElement);
      }

      // Also update periodically in case of layout changes
      updateIntervalRef.current = setInterval(updateDimensions, 100);

      // Also listen to window resize and scroll
      window.addEventListener('resize', updateDimensions);
      window.addEventListener('scroll', updateDimensions, true);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
      window.removeEventListener('resize', updateDimensions);
      window.removeEventListener('scroll', updateDimensions, true);
    };
  }, [showRuler, viewMode]);

  console.log('DebugRuler render - showRuler:', showRuler, 'dimensions:', dimensions);
  
  // Always render debug status when showRuler is true, even if dimensions are 0
  if (!showRuler) {
    return null;
  }

  const { width, height, top, left } = dimensions;

  // Always render something - show debug info if dimensions are invalid
  if (width === 0 || height === 0) {
    console.log('DebugRuler: Rendering status box - dimensions are 0');
    return (
      <div
        style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          backgroundColor: '#ef4444',
          color: 'white',
          padding: '20px',
          borderRadius: '4px',
          zIndex: 999999,
          fontFamily: 'monospace',
          fontSize: '14px',
          fontWeight: 'bold',
          border: '3px solid #dc2626',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          minWidth: '250px'
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Ruler Status</div>
        <div>showRuler: {showRuler ? 'true' : 'false'}</div>
        <div>viewMode: {viewMode}</div>
        <div>Dimensions: W:{width} H:{height} T:{top} L:{left}</div>
        <div style={{ marginTop: '5px', fontSize: '10px', opacity: 0.8 }}>
          Looking for: .layout-shell__player
        </div>
      </div>
    );
  }

  // Ruler settings
  const tickInterval = 50; // Show tick every 50px
  const majorTickInterval = 200; // Major tick every 200px
  const tickHeight = 12;
  const majorTickHeight = 20;
  const rulerWidth = 30;

  // Generate horizontal ruler ticks
  const horizontalTicks = [];
  for (let i = 0; i <= width; i += tickInterval) {
    const isMajor = i % majorTickInterval === 0;
    horizontalTicks.push(
      <div
        key={`h-${i}`}
        style={{
          position: 'absolute',
          left: `${i}px`,
          top: 0,
          width: '1px',
          height: isMajor ? majorTickHeight : tickHeight,
          backgroundColor: '#ef4444',
          zIndex: 100000
        }}
      />
    );
    if (isMajor) {
      horizontalTicks.push(
        <div
          key={`h-label-${i}`}
          style={{
            position: 'absolute',
            left: `${i + 2}px`,
            top: 2,
            fontSize: '10px',
            fontFamily: 'monospace',
            color: '#dc2626',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            padding: '1px 3px',
            borderRadius: '2px',
            zIndex: 100001,
            pointerEvents: 'none',
            fontWeight: 'bold'
          }}
        >
          {i}
        </div>
      );
    }
  }

  // Generate vertical ruler ticks
  const verticalTicks = [];
  for (let i = 0; i <= height; i += tickInterval) {
    const isMajor = i % majorTickInterval === 0;
    verticalTicks.push(
      <div
        key={`v-${i}`}
        style={{
          position: 'absolute',
          top: `${i}px`,
          left: 0,
          height: '1px',
          width: isMajor ? majorTickHeight : tickHeight,
          backgroundColor: '#ef4444',
          zIndex: 100000
        }}
      />
    );
    if (isMajor) {
      verticalTicks.push(
        <div
          key={`v-label-${i}`}
          style={{
            position: 'absolute',
            top: `${i + 2}px`,
            left: 2,
            fontSize: '10px',
            fontFamily: 'monospace',
            color: '#dc2626',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            padding: '1px 3px',
            borderRadius: '2px',
            zIndex: 100001,
            pointerEvents: 'none',
            fontWeight: 'bold',
            transform: 'rotate(-90deg)',
            transformOrigin: 'left center',
            whiteSpace: 'nowrap'
          }}
        >
          {i}
        </div>
      );
    }
  }

  return (
    <>
      {/* Horizontal Ruler - Top */}
      <div
        style={{
          position: 'fixed',
          top: `${top - rulerWidth}px`,
          left: `${left}px`,
          width: `${width}px`,
          height: `${rulerWidth}px`,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          border: '2px solid #ef4444',
          borderBottom: 'none',
          zIndex: 99999,
          boxSizing: 'border-box',
          pointerEvents: 'none'
        }}
      >
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          {horizontalTicks}
          {/* Dimension label */}
          <div
            style={{
              position: 'absolute',
              right: 4,
              top: 4,
              fontSize: '11px',
              fontFamily: 'monospace',
              color: '#991b1b',
              fontWeight: 'bold',
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              padding: '2px 6px',
              borderRadius: '3px'
            }}
          >
            W: {Math.round(width)}px
          </div>
        </div>
      </div>

      {/* Vertical Ruler - Left */}
      <div
        style={{
          position: 'fixed',
          top: `${top}px`,
          left: `${left - rulerWidth}px`,
          width: `${rulerWidth}px`,
          height: `${height}px`,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          border: '2px solid #ef4444',
          borderRight: 'none',
          zIndex: 99999,
          boxSizing: 'border-box',
          pointerEvents: 'none'
        }}
      >
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          {verticalTicks}
          {/* Dimension label */}
          <div
            style={{
              position: 'absolute',
              bottom: 4,
              left: 4,
              fontSize: '11px',
              fontFamily: 'monospace',
              color: '#991b1b',
              fontWeight: 'bold',
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              padding: '2px 6px',
              borderRadius: '3px',
              transform: 'rotate(-90deg)',
              transformOrigin: 'left center',
              whiteSpace: 'nowrap'
            }}
          >
            H: {Math.round(height)}px
          </div>
        </div>
      </div>

      {/* Corner indicator */}
      <div
        style={{
          position: 'fixed',
          top: `${top - rulerWidth}px`,
          left: `${left - rulerWidth}px`,
          width: `${rulerWidth}px`,
          height: `${rulerWidth}px`,
          backgroundColor: 'rgba(239, 68, 68, 0.3)',
          border: '2px solid #ef4444',
          zIndex: 100000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          fontFamily: 'monospace',
          color: '#991b1b',
          fontWeight: 'bold',
          pointerEvents: 'none'
        }}
      >
        {viewMode.toUpperCase()}
      </div>
    </>
  );
};

export default DebugRuler;

