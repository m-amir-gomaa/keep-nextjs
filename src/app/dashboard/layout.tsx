"use client";
import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [labels, setLabels] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/labels')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setLabels(data);
      })
      .catch(console.error);
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-[var(--bg-main)]">
      <Header toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar isOpen={isSidebarOpen} labels={labels} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
