import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useLayoutStore } from '../store/layoutStore';

const CardMenu = ({ options, onOptionClick, submenuOptions = {} }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState(null);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);
  const containerRef = useRef(null);
  const { inspectMode } = useLayoutStore();

  // Helper to get inspect label
  const getInspectTitle = (label) => inspectMode ? label : undefined;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      // Use a small delay to avoid immediate closing
      setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleOptionClick = (option) => {
    // Check if option has submenu
    if (option.submenu && submenuOptions[option.submenu]) {
      setActiveSubmenu(option.submenu);
      return; // Don't close menu, show submenu instead
    }

    if (onOptionClick) {
      onOptionClick(option);
    }
    setIsOpen(false);
    setActiveSubmenu(null);
  };

  const handleSubmenuOptionClick = (submenuKey, submenuOption) => {
    if (onOptionClick) {
      onOptionClick({ ...submenuOption, parentAction: submenuKey });
    }
    setIsOpen(false);
    setActiveSubmenu(null);
  };

  return (
    <div ref={containerRef} className="relative" data-card-menu="true">
      {/* 3-dot menu button */}
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors text-slate-400 hover:text-white"
        title={getInspectTitle('More options') || 'More options'}
      >
        <svg
          className="w-5 h-5"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {/* Dropdown menu (Portal) */}
      {isOpen && (
        <PortalDropdown
          isOpen={isOpen}
          buttonRef={buttonRef}
          menuRef={menuRef}
          onClose={() => setIsOpen(false)}
          options={options}
          handleOptionClick={handleOptionClick}
          submenuOptions={submenuOptions}
          activeSubmenu={activeSubmenu}
          setActiveSubmenu={setActiveSubmenu}
          handleSubmenuOptionClick={handleSubmenuOptionClick}
        />
      )}
    </div>
  );
};

// Portal Component for the Menu
const PortalDropdown = ({
  buttonRef,
  menuRef,
  onClose,
  options,
  handleOptionClick,
  submenuOptions,
  activeSubmenu,
  setActiveSubmenu,
  handleSubmenuOptionClick
}) => {
  // Init to null so we don't render until calculated
  const [position, setPosition] = useState(null);
  const portalRef = useRef(null);

  // Calculate position on mount, resize, and scroll
  useEffect(() => {
    const updatePosition = () => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();

        // Use Fixed positioning (viewport relative)
        // This works best with internal scroll containers as we just track the button's visual position
        let top = rect.bottom + 5;
        let left = rect.right - 192; // 192px is w-48

        // Boundary check
        if (left < 0) left = rect.left;

        setPosition({ top, left });
      }
    };

    updatePosition();

    // Listen to resize and SCROLL (capture phase to catch internal div scrolls)
    window.addEventListener('resize', updatePosition);
    document.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      document.removeEventListener('scroll', updatePosition, true);
    };
  }, [buttonRef]);

  // Click outside portal
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current && !menuRef.current.contains(event.target) &&
        buttonRef.current && !buttonRef.current.contains(event.target)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuRef, buttonRef, onClose]);

  // Don't render until position is calculated to avoid top-left flash
  if (!position) return null;

  // Use standard ReactDOM portal
  return ReactDOM.createPortal(
    <div
      ref={menuRef}
      className="fixed z-30 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-visible w-48"
      style={{
        top: position.top,
        left: position.left,
        position: 'fixed' // Viewport relative
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {options.map((option, index) => (
        <button
          key={index}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!option.disabled) {
              handleOptionClick(option);
            }
          }}
          disabled={option.disabled}
          className={`w-full text-left px-4 py-2.5 text-sm transition-colors relative ${option.disabled
            ? 'opacity-50 cursor-not-allowed text-slate-500'
            : option.danger
              ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
              : 'text-white hover:bg-slate-700'
            } ${index === 0 ? '' : 'border-t border-slate-700'}`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {option.icon && (
                <span className="flex-shrink-0">{option.icon}</span>
              )}
              <span>{option.label}</span>
            </div>
            {option.submenu && (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </div>
        </button>
      ))}

      {/* Submenu Overlay */}
      {activeSubmenu && submenuOptions[activeSubmenu] && (
        <div
          className="absolute inset-0 bg-slate-800 z-10 flex flex-col animate-in slide-in-from-right duration-200"
        >
          <button
            onClick={() => setActiveSubmenu(null)}
            className="w-full text-left px-4 py-2.5 text-sm text-slate-400 hover:bg-slate-700 border-b border-slate-700 flex-shrink-0"
          >
            <div className="flex items-center gap-3">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back</span>
            </div>
          </button>
          <div className="flex-1 overflow-y-auto">
            {submenuOptions[activeSubmenu].map((submenuOption, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!submenuOption.disabled) {
                    handleSubmenuOptionClick(activeSubmenu, submenuOption);
                  }
                }}
                disabled={submenuOption.disabled}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${submenuOption.disabled
                  ? 'opacity-50 cursor-not-allowed text-slate-500'
                  : submenuOption.danger
                    ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
                    : 'text-white hover:bg-slate-700'
                  } ${index === 0 ? '' : 'border-t border-slate-700'}`}
              >
                <div className="flex items-center gap-3">
                  {submenuOption.icon && (
                    <span className="flex-shrink-0">{submenuOption.icon}</span>
                  )}
                  <span>{submenuOption.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};

export default CardMenu;

