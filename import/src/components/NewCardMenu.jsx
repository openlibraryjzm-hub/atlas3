import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useLayoutStore } from '../store/layoutStore';

const NewCardMenu = ({ options, onOptionClick, submenuOptions = {} }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeSubmenu, setActiveSubmenu] = useState(null);
    const [menuPosition, setMenuPosition] = useState(null);

    const menuRef = useRef(null);
    const buttonRef = useRef(null);
    const { inspectMode } = useLayoutStore();

    const getInspectTitle = (label) => inspectMode ? label : undefined;

    // Toggle Menu
    const handleToggle = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (isOpen) {
            setIsOpen(false);
            setActiveSubmenu(null);
            setMenuPosition(null);
        } else {
            // Calculate position immediately
            calculatePosition();
            setIsOpen(true);
        }
    };

    const calculatePosition = () => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            // Position bottom-right of button
            // Fixed positioning is viewport relative
            let top = rect.bottom + 5;
            let left = rect.right - 192; // 192px width approx

            // Safety check for left edge
            if (left < 10) left = rect.left;

            setMenuPosition({ top, left });
        }
    };

    // Scroll/Resize listeners to keep it attached
    useEffect(() => {
        if (!isOpen) return;

        const handleUpdate = () => {
            calculatePosition();
        };

        window.addEventListener('resize', handleUpdate);
        document.addEventListener('scroll', handleUpdate, true); // Capture for all elements

        return () => {
            window.removeEventListener('resize', handleUpdate);
            document.removeEventListener('scroll', handleUpdate, true);
        };
    }, [isOpen]);

    // Click Outside Listener
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e) => {
            // If clicking inside menu or button, ignore
            if (menuRef.current && menuRef.current.contains(e.target)) return;
            if (buttonRef.current && buttonRef.current.contains(e.target)) return;

            setIsOpen(false);
            setActiveSubmenu(null);
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handleItemClick = (e, option) => {
        e.preventDefault();
        e.stopPropagation();

        if (option.disabled) return;

        // Handle Submenu
        if (option.submenu && submenuOptions[option.submenu]) {
            setActiveSubmenu(option.submenu);
            return;
        }

        // Regular Action
        console.log('[NewCardMenu] Option clicked:', option.label, option.action);
        if (onOptionClick) {
            onOptionClick(option);
        }
        setIsOpen(false);
        setActiveSubmenu(null);
    };

    const handleSubmenuItemClick = (e, submenuKey, option) => {
        e.preventDefault();
        e.stopPropagation();

        if (option.disabled) return;

        console.log('[NewCardMenu] Submenu Option clicked:', option.label, option.action);
        if (onOptionClick) {
            onOptionClick({ ...option, parentAction: submenuKey });
        }
        setIsOpen(false);
        setActiveSubmenu(null);
    };

    return (
        <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button
                ref={buttonRef}
                onClick={handleToggle}
                className="p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors text-slate-400 hover:text-white"
                title={getInspectTitle('More options') || 'More options'}
            >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
            </button>

            {isOpen && menuPosition && ReactDOM.createPortal(
                <div
                    ref={menuRef}
                    className="fixed z-50 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-visible text-left"
                    style={{
                        top: menuPosition.top,
                        left: menuPosition.left,
                    }}
                    onClick={(e) => e.stopPropagation()} // Stop propagation from portal to React tree
                >
                    {!activeSubmenu ? (
                        // Main Menu Loop
                        <div className="py-1">
                            {options.map((option, idx) => (
                                <button
                                    key={idx}
                                    onClick={(e) => handleItemClick(e, option)}
                                    disabled={option.disabled}
                                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between gap-3 ${option.disabled
                                            ? 'opacity-50 cursor-not-allowed text-slate-500'
                                            : option.danger
                                                ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
                                                : 'text-white hover:bg-slate-700'
                                        } ${idx > 0 ? 'border-t border-slate-700' : ''}`}
                                >
                                    <div className="flex items-center gap-3">
                                        {option.icon && <span className="flex-shrink-0">{option.icon}</span>}
                                        <span>{option.label}</span>
                                    </div>
                                    {option.submenu && (
                                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    )}
                                </button>
                            ))}
                        </div>
                    ) : (
                        // Submenu Loop
                        <div className="py-1 animate-in slide-in-from-right duration-200">
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setActiveSubmenu(null);
                                }}
                                className="w-full text-left px-4 py-2.5 text-sm text-slate-400 hover:bg-slate-700 border-b border-slate-700 flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                <span>Back</span>
                            </button>
                            <div className="max-h-64 overflow-y-auto">
                                {submenuOptions[activeSubmenu]?.map((subOption, idx) => (
                                    <button
                                        key={idx}
                                        onClick={(e) => handleSubmenuItemClick(e, activeSubmenu, subOption)}
                                        disabled={subOption.disabled}
                                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-3 ${subOption.disabled
                                                ? 'opacity-50 cursor-not-allowed text-slate-500'
                                                : subOption.danger
                                                    ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
                                                    : 'text-white hover:bg-slate-700'
                                            } ${idx > 0 ? 'border-t border-slate-700' : ''}`}
                                    >
                                        {subOption.icon && <span className="flex-shrink-0">{subOption.icon}</span>}
                                        <span>{subOption.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>,
                document.body
            )}
        </div>
    );
};

export default NewCardMenu;
