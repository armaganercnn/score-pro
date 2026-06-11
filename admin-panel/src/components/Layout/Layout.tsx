import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout() {
  return (
    <div className="flex h-screen bg-[var(--color-background)] overflow-hidden relative">
      {/* Background ambient light effects */}
      <div className="absolute top-[-20%] left-[-20%] w-[70%] h-[70%] bg-[#30D158]/4 blur-[180px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[70%] h-[70%] bg-[#0A84FF]/4 blur-[180px] rounded-full pointer-events-none"></div>

      <Sidebar />
      <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
