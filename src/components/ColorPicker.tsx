"use client";
import React, { useState, useRef, useEffect } from 'react';
import { Icons } from './Icons';

const COLORS = [
  { name: 'Default', value: 'var(--surface-main)' },
  { name: 'Red', value: '#5c2b29' },
  { name: 'Orange', value: '#614a19' },
  { name: 'Yellow', value: '#635d19' },
  { name: 'Green', value: '#345920' },
  { name: 'Teal', value: '#16504b' },
  { name: 'Blue', value: '#2d555e' },
  { name: 'Dark blue', value: '#1e3a5f' },
  { name: 'Purple', value: '#42275e' },
  { name: 'Pink', value: '#5b2245' },
  { name: 'Brown', value: '#442f19' },
  { name: 'Gray', value: '#3c3f43' },
];

export function ColorPicker({ currentColor, onColorSelect }: { currentColor?: string, onColorSelect: (color: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={containerRef}>
      <button 
        type="button"
        className="icon-btn w-8 h-8 text-[var(--text-secondary)] hover:text-[var(--text-primary)]" 
        aria-label="Background options"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
      >
        <Icons.Palette className="w-5 h-5" />
      </button>

      {isOpen && (
        <div 
          className="absolute top-10 left-0 z-[100] flex flex-wrap gap-2 w-[140px] p-2 bg-[var(--surface-overlay)] border border-[var(--border)] rounded-lg shadow-xl animate-in fade-in zoom-in-95 duration-100 cursor-default"
          onClick={(e) => e.stopPropagation()}
        >
          {COLORS.map(c => (
            <button
              key={c.name}
              title={c.name}
              type="button"
              className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${currentColor === c.value ? 'border-[var(--accent)]' : 'border-transparent'}`}
              style={{ 
                backgroundColor: c.value === 'var(--surface-main)' ? 'transparent' : c.value, 
                ...(c.value === 'var(--surface-main)' ? { border: '2px solid var(--border)' } : {}) 
              }}
              onClick={(e) => {
                e.stopPropagation();
                onColorSelect(c.value);
                setIsOpen(false);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
