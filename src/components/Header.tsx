"use client";
import React, { useState } from 'react';
import { Icons } from './Icons';

export function Header({ toggleSidebar }: { toggleSidebar: () => void }) {
  const [searchValue, setSearchValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  return (
    <header className="flex items-center justify-between px-3 py-2 border-b border-[var(--border)] h-[64px]">
      <div className="flex items-center gap-2 w-60 shrink-0">
        <button 
          onClick={toggleSidebar} 
          className="icon-btn"
          aria-label="Main menu"
        >
          <Icons.Menu />
        </button>
        <div className="flex items-center gap-1 cursor-pointer">
          {/* Logo can go here */}
          <span className="text-xl text-[var(--text-primary)] pl-1">Keep Next</span>
        </div>
      </div>

      <div className="flex-1 max-w-[720px] px-2">
        <div className={`flex items-center h-12 px-3 rounded-xl transition-colors ${
          isFocused ? 'bg-[var(--surface-overlay)] shadow-md' : 'bg-[var(--hover-main)]'
        }`}>
          <button className="icon-btn" aria-label="Search">
            <Icons.Search />
          </button>
          <input
            type="text"
            className="flex-1 h-full px-3 input-ghost font-medium"
            placeholder="Search"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
          {searchValue && (
            <button className="icon-btn" onClick={() => setSearchValue('')}>
              <Icons.Clear />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 pr-2 shrink-0">
        <button className="icon-btn" aria-label="Refresh"><Icons.Refresh /></button>
        <button className="icon-btn" aria-label="Settings"><Icons.Settings /></button>
      </div>
    </header>
  );
}
