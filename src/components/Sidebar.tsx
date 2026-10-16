"use client";
import type { Label } from "@/types";
import { Icons } from "./Icons";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Sidebar({
  isOpen,
  labels,
  mobile = false,
  onNavigate,
}: {
  isOpen: boolean;
  labels: Label[];
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const items = [
    { name: "Notes", path: "/dashboard", icon: Icons.Notes },
    { name: "Graph", path: "/dashboard/graph", icon: Icons.Graph },
    ...labels.map((label) => ({
      name: label.name,
      path: "/dashboard/label/" + encodeURIComponent(label.id),
      icon: Icons.Label,
    })),
    { name: "Edit labels", path: "/dashboard/edit-labels", icon: Icons.Edit },
    { name: "Archive", path: "/dashboard/archive", icon: Icons.Archive },
    { name: "Trash", path: "/dashboard/trash", icon: Icons.Trash },
    { name: "Account", path: "/dashboard/account", icon: Icons.Settings },
  ];
  return (
    <aside
      id="workspace-navigation"
      aria-label="Workspace navigation"
      inert={mobile && !isOpen}
      className={
        "shrink-0 overflow-y-auto border-r border-[var(--border)] bg-[var(--bg-main)] py-3 " +
        (mobile
          ? isOpen
            ? "absolute inset-y-0 left-0 z-30 w-72 max-w-[calc(100%-3rem)]"
            : "hidden"
          : isOpen
            ? "w-64"
            : "w-[68px]")
      }
    >
      <nav>
        {items.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            aria-current={pathname === item.path ? "page" : undefined}
            title={item.name}
            onClick={onNavigate}
            className={
              "mx-2 mb-1 flex min-h-12 items-center gap-3 overflow-hidden rounded-xl px-3 " +
              (pathname === item.path
                ? "bg-[rgba(249,171,0,0.15)] text-[var(--accent)]"
                : "hover:bg-[var(--hover-main)]")
            }
          >
            <item.icon className="h-6 w-6 shrink-0" />
            <span className={isOpen ? "truncate text-sm" : "sr-only"}>
              {item.name}
            </span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
