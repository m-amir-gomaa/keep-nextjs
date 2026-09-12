"use client";
import React from 'react';
import { Icons } from './Icons';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Sidebar({ isOpen, labels }: { isOpen: boolean, labels: any[] }) {
  const pathname = usePathname();

  const navItems = [
    { name: 'Notes', path: '/dashboard', icon: <Icons.Notes /> },
    { name: 'Reminders', path: '/dashboard/reminders', icon: <Icons.Reminders /> },
  ];

  const bottomItems = [
    { name: 'Edit labels', path: '/dashboard/edit-labels', icon: <Icons.Edit /> },
    { name: 'Archive', path: '/dashboard/archive', icon: <Icons.Archive /> },
    { name: 'Trash', path: '/dashboard/trash', icon: <Icons.Trash /> },
  ];

  const NavItem = ({ name, path, icon }: { name: string, path: string, icon: React.ReactNode }) => {
    const isActive = pathname === path || pathname === path + '/';
    return (
      <Link href={path} className={`flex items-center h-12 rounded-r-full group overflow-hidden transition-colors ${isActive ? 'bg-[rgba(249,171,0,0.15)] text-[var(--accent)]' : 'text-[var(--text-primary)] hover:bg-[var(--hover-main)]'}`}>
        <div className="w-[68px] shrink-0 flex items-center justify-center h-full">
          {icon}
        </div>
        <span className={`font-medium whitespace-nowrap transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
          {name}
        </span>
      </Link>
    );
  };

  return (
    <aside 
      className={`h-[calc(100vh-64px)] overflow-y-auto overflow-x-hidden transition-all duration-200 flex flex-col pt-2 pb-4 ${isOpen ? 'w-72' : 'w-[68px]'}`}
      style={{ transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' }}
    >
      <div className="flex flex-col gap-1 pr-3">
        {navItems.map((item) => (
          <NavItem key={item.name} {...item} />
        ))}

        {labels?.length > 0 && (
          <div className="py-2">
            <div className={`px-[26px] py-2 text-xs font-semibold text-[var(--text-muted)] tracking-wider uppercase ${isOpen ? 'block' : 'hidden'}`}>
              Labels
            </div>
            {labels.map((label) => (
              <NavItem key={label.id} name={label.name} path={`/dashboard/label/${label.name}`} icon={<Icons.Label />} />
            ))}
          </div>
        )}

        {bottomItems.map((item) => (
          <NavItem key={item.name} {...item} />
        ))}
      </div>
    </aside>
  );
}
